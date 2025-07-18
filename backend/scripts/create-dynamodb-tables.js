/**
 * Script to create DynamoDB tables for local development
 * 
 * Usage:
 * node scripts/create-dynamodb-tables.js [environment]
 * 
 * Environment: local (default), dev, staging, prod
 * 
 * Prerequisites:
 * - Local DynamoDB running (e.g., via Docker) for local environment
 * - AWS CLI configured with appropriate credentials for non-local environments
 */

const { DynamoDBClient, CreateTableCommand, UpdateTimeToLiveCommand } = require('@aws-sdk/client-dynamodb');

// Get environment from command line args
const environment = process.argv[2] || 'local';
const validEnvironments = ['local', 'dev', 'staging', 'prod'];

if (!validEnvironments.includes(environment)) {
  console.error(`Invalid environment: ${environment}. Must be one of: ${validEnvironments.join(', ')}`);
  process.exit(1);
}

// Configuration
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// For local development, use local DynamoDB
if (environment === 'local') {
  config.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
  config.credentials = {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  };
}

const client = new DynamoDBClient(config);

// Table prefix based on environment
const tablePrefix = environment === 'local' ? '' : `bingo-${environment}-`;

// Table definitions
const tables = [
  {
    TableName: `${tablePrefix}games`,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'code', AttributeType: 'S' },
      { AttributeName: 'status', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'CodeIndex',
        KeySchema: [
          { AttributeName: 'code', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'status', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    StreamSpecification: {
      StreamEnabled: false,
    },
    // TTL will be enabled after table creation
  },
  {
    TableName: `${tablePrefix}players`,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'gameId', AttributeType: 'S' },
      { AttributeName: 'connectionId', AttributeType: 'S' },
      { AttributeName: 'hasBingo', AttributeType: 'S' }, // Added for BingoIndex
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GameIdIndex',
        KeySchema: [
          { AttributeName: 'gameId', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: 'ConnectionIdIndex',
        KeySchema: [
          { AttributeName: 'connectionId', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: 'BingoIndex',
        KeySchema: [
          { AttributeName: 'gameId', KeyType: 'HASH' },
          { AttributeName: 'hasBingo', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    StreamSpecification: {
      StreamEnabled: false,
    },
    // TTL will be enabled after table creation
  },
];

// Create tables and enable TTL
async function createTables() {
  for (const tableDefinition of tables) {
    try {
      console.log(`Creating table: ${tableDefinition.TableName}`);
      const command = new CreateTableCommand(tableDefinition);
      const response = await client.send(command);
      console.log(`Table created: ${tableDefinition.TableName}`);
      console.log(JSON.stringify(response, null, 2));
      
      // Enable TTL for games table
      if (tableDefinition.TableName.includes('games')) {
        console.log(`Enabling TTL for table: ${tableDefinition.TableName}`);
        const ttlCommand = new UpdateTimeToLiveCommand({
          TableName: tableDefinition.TableName,
          TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true,
          },
        });
        
        try {
          const ttlResponse = await client.send(ttlCommand);
          console.log(`TTL enabled for table: ${tableDefinition.TableName}`);
          console.log(JSON.stringify(ttlResponse, null, 2));
        } catch (ttlError) {
          if (ttlError.name === 'ValidationException' && ttlError.message.includes('TimeToLive is already enabled')) {
            console.log(`TTL already enabled for table: ${tableDefinition.TableName}`);
          } else {
            console.error(`Error enabling TTL for table ${tableDefinition.TableName}:`, ttlError);
          }
        }
      }
      
      // Enable TTL for players table (to clean up inactive players)
      if (tableDefinition.TableName.includes('players')) {
        console.log(`Enabling TTL for table: ${tableDefinition.TableName}`);
        const ttlCommand = new UpdateTimeToLiveCommand({
          TableName: tableDefinition.TableName,
          TimeToLiveSpecification: {
            AttributeName: 'ttl',
            Enabled: true,
          },
        });
        
        try {
          const ttlResponse = await client.send(ttlCommand);
          console.log(`TTL enabled for table: ${tableDefinition.TableName}`);
          console.log(JSON.stringify(ttlResponse, null, 2));
        } catch (ttlError) {
          if (ttlError.name === 'ValidationException' && ttlError.message.includes('TimeToLive is already enabled')) {
            console.log(`TTL already enabled for table: ${tableDefinition.TableName}`);
          } else {
            console.error(`Error enabling TTL for table ${tableDefinition.TableName}:`, ttlError);
          }
        }
      }
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`Table already exists: ${tableDefinition.TableName}`);
        
        // Try to enable TTL even if table already exists
        if (tableDefinition.TableName.includes('games') || tableDefinition.TableName.includes('players')) {
          console.log(`Enabling TTL for existing table: ${tableDefinition.TableName}`);
          const ttlCommand = new UpdateTimeToLiveCommand({
            TableName: tableDefinition.TableName,
            TimeToLiveSpecification: {
              AttributeName: 'ttl',
              Enabled: true,
            },
          });
          
          try {
            const ttlResponse = await client.send(ttlCommand);
            console.log(`TTL enabled for table: ${tableDefinition.TableName}`);
            console.log(JSON.stringify(ttlResponse, null, 2));
          } catch (ttlError) {
            if (ttlError.name === 'ValidationException' && ttlError.message.includes('TimeToLive is already enabled')) {
              console.log(`TTL already enabled for table: ${tableDefinition.TableName}`);
            } else {
              console.error(`Error enabling TTL for table ${tableDefinition.TableName}:`, ttlError);
            }
          }
        }
      } else {
        console.error(`Error creating table ${tableDefinition.TableName}:`, error);
      }
    }
  }
}

createTables()
  .then(() => console.log('All tables created or already exist with TTL configured'))
  .catch(error => console.error('Error creating tables:', error));