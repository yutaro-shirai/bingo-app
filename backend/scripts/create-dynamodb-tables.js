/**
 * Script to create DynamoDB tables for local development
 * 
 * Usage:
 * node scripts/create-dynamodb-tables.js
 * 
 * Prerequisites:
 * - Local DynamoDB running (e.g., via Docker)
 * - AWS CLI configured with local endpoint
 */

const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

// Configuration
const config = {
  region: 'us-east-1',
  endpoint: 'http://localhost:8000', // Local DynamoDB endpoint
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
};

const client = new DynamoDBClient(config);

// Table definitions
const tables = [
  {
    TableName: 'games',
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
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true,
    },
  },
  {
    TableName: 'players',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'gameId', AttributeType: 'S' },
      { AttributeName: 'connectionId', AttributeType: 'S' },
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
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    StreamSpecification: {
      StreamEnabled: false,
    },
  },
];

// Create tables
async function createTables() {
  for (const tableDefinition of tables) {
    try {
      console.log(`Creating table: ${tableDefinition.TableName}`);
      const command = new CreateTableCommand(tableDefinition);
      const response = await client.send(command);
      console.log(`Table created: ${tableDefinition.TableName}`);
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`Table already exists: ${tableDefinition.TableName}`);
      } else {
        console.error(`Error creating table ${tableDefinition.TableName}:`, error);
      }
    }
  }
}

createTables()
  .then(() => console.log('All tables created or already exist'))
  .catch(error => console.error('Error creating tables:', error));