import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import * as express from 'express';
import { Server } from 'http';
import { Context, APIGatewayProxyEvent, APIGatewayProxyResult, APIGatewayProxyHandler } from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import { eventContext } from 'aws-serverless-express/middleware';
import { WsAdapter } from '@nestjs/platform-ws';
import { LoggerService } from './common/logger/logger.service';

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this is likely
// due to a compressed response (e.g. gzip) which has not been handled correctly
// by aws-serverless-express and/or API Gateway. Add the necessary MIME types to
// binaryMimeTypes below
const binaryMimeTypes: string[] = [
  'application/octet-stream',
  'application/x-protobuf',
  'font/eot',
  'font/opentype',
  'font/otf',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
];

let cachedServer: Server;
let app: INestApplication;

async function bootstrapServer(): Promise<Server> {
  if (!cachedServer) {
    const expressApp = express();
    expressApp.use(eventContext());
    
    app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      {
        logger: new LoggerService(),
      },
    );
    
    app.enableCors({
      origin: '*', // Configure according to your needs
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    });
    
    // Use WebSocket adapter
    app.useWebSocketAdapter(new WsAdapter(app));
    
    await app.init();
    
    cachedServer = createServer(expressApp, undefined, binaryMimeTypes);
  }
  
  return cachedServer;
}

// Lambda handler for HTTP requests
export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  // Keep the Lambda warm
  if (event.source === 'serverless-plugin-warmup') {
    console.log('WarmUp - Lambda is warm!');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Lambda is warm!' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
  
  // Handle WebSocket connections
  if (event.requestContext && event.requestContext.connectionId) {
    const server = await bootstrapServer();
    
    // Extract connection information
    const connectionId = event.requestContext.connectionId;
    const routeKey = event.requestContext.routeKey;
    
    // Log WebSocket event
    console.log(`WebSocket ${routeKey} - ConnectionId: ${connectionId}`);
    
    // Handle WebSocket events
    if (routeKey === '$connect') {
      // Handle connection
      return {
        statusCode: 200,
        body: 'Connected',
      };
    } else if (routeKey === '$disconnect') {
      // Handle disconnection
      return {
        statusCode: 200,
        body: 'Disconnected',
      };
    } else {
      // Handle messages
      try {
        // Process the message through the NestJS WebSocket gateway
        // This would typically be handled by the WebSocket gateway in NestJS
        return {
          statusCode: 200,
          body: 'Message received',
        };
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        return {
          statusCode: 500,
          body: 'Error processing message',
        };
      }
    }
  }
  
  // Handle HTTP requests
  const server = await bootstrapServer();
  return proxy(server, event, context, 'PROMISE').promise;
};