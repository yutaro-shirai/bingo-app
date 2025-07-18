import * as winston from 'winston';
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

interface CloudWatchTransportOptions
  extends winston.transport.TransportStreamOptions {
  logGroupName: string;
  logStreamName: string;
  awsRegion: string;
  messageFormatter?: (logEntry: any) => string;
  createLogGroup?: boolean;
  createLogStream?: boolean;
  submissionInterval?: number;
  submissionRetryCount?: number;
  batchSize?: number;
}

export class CloudWatchTransport extends winston.transport {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private messageFormatter: (logEntry: any) => string;
  private logQueue: any[] = [];
  private sequenceToken: string | undefined;
  private submissionInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private submissionRetryCount: number;
  private batchSize: number;

  constructor(options: CloudWatchTransportOptions) {
    super(options);

    this.logGroupName = options.logGroupName;
    this.logStreamName = options.logStreamName;
    this.messageFormatter =
      options.messageFormatter || ((logEntry) => JSON.stringify(logEntry));
    this.submissionInterval = options.submissionInterval || 2000; // Default to 2 seconds
    this.submissionRetryCount = options.submissionRetryCount || 3;
    this.batchSize = options.batchSize || 10000; // AWS limit is 10000 log events per batch

    this.client = new CloudWatchLogsClient({
      region: options.awsRegion,
    });

    // Start the timer to periodically flush logs
    this.startTimer();
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Format the log entry
    const logEntry = {
      timestamp: new Date().getTime(),
      message: this.messageFormatter(info),
    };

    // Add to queue
    this.logQueue.push(logEntry);

    // If queue is getting large, flush immediately
    if (this.logQueue.length >= this.batchSize) {
      this.flushLogs();
    }

    callback();
  }

  private startTimer() {
    if (this.timer === null) {
      this.timer = setInterval(() => {
        this.flushLogs();
      }, this.submissionInterval);

      // Ensure the timer doesn't prevent the process from exiting
      if (this.timer.unref) {
        this.timer.unref();
      }
    }
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async flushLogs() {
    if (this.logQueue.length === 0) {
      return;
    }

    // Take a batch of logs
    const batch = this.logQueue.splice(0, this.batchSize);

    try {
      // Format logs for CloudWatch
      const logEvents = batch.map((log) => ({
        timestamp: log.timestamp,
        message: log.message,
      }));

      // Sort by timestamp as required by CloudWatch
      logEvents.sort((a, b) => a.timestamp - b.timestamp);

      // Create the command
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents,
        sequenceToken: this.sequenceToken,
      });

      // Send logs to CloudWatch
      const response = await this.client.send(command);

      // Update sequence token for next batch
      this.sequenceToken = response.nextSequenceToken;
    } catch (error: any) {
      // Handle specific CloudWatch errors
      if (error.name === 'InvalidSequenceTokenException') {
        // Extract the correct sequence token from the error message
        const match = /sequenceToken is: (.+)/.exec(error.message);
        if (match && match[1]) {
          this.sequenceToken = match[1];
          // Retry with the correct token
          this.logQueue = [...batch, ...this.logQueue];
          this.flushLogs();
        }
      } else if (error.name === 'ResourceNotFoundException') {
        // Log group or stream doesn't exist
        console.error(
          `CloudWatch log group or stream not found: ${error.message}`,
        );
        // Put logs back in queue for retry after creation
        this.logQueue = [...batch, ...this.logQueue];
      } else {
        console.error('Error sending logs to CloudWatch:', error);
        // Put logs back in queue for retry
        this.logQueue = [...batch, ...this.logQueue];
      }
    }
  }

  // Make sure to flush logs before the transport is closed
  close() {
    this.stopTimer();
    this.flushLogs();
  }
}
