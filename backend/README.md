# Bingo Web App - Backend

This is the backend service for the Bingo Web App, built with [NestJS](https://nestjs.com/) and designed to run on AWS Lambda.

## Features

- RESTful API for game management
- WebSocket Gateway for real-time communication
- DynamoDB integration for data persistence
- Serverless deployment via AWS Lambda

## Project Structure

```
backend/
├── src/
│   ├── main.ts             # Application entry point
│   ├── app.module.ts       # Root module
│   ├── app.controller.ts   # Root controller
│   ├── app.service.ts      # Root service
│   ├── game/               # Game module
│   │   ├── game.module.ts
│   │   ├── game.gateway.ts # WebSocket gateway (implemented)
│   │   ├── dto/            # Data Transfer Objects (implemented)
│   │   ├── entities/       # Game and Player entities (implemented)
│   │   ├── repositories/   # Game and Player repositories (implemented)
│   │   └── player.service.ts # Player service (in progress)
│   └── common/             # Shared utilities and helpers
│       └── dynamodb/       # DynamoDB client service (implemented)
└── test/                   # End-to-end tests
```

## Getting Started

### Prerequisites

- Node.js 18+ / npm 9+
- AWS CLI configured (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Install WebSocket dependencies
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install @nestjs/platform-express
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Development

```bash
# Run in development mode
npm run start:dev

# Run in debug mode
npm run start:debug
```

### Building

```bash
# Build the application
npm run build
```

### Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov
```

## Implemented Components

### DynamoDB Integration

The backend includes a fully implemented DynamoDB integration:

- DynamoDB client service in `common/dynamodb`
- Game repository with complete CRUD operations
- TTL configuration for game expiration
- Player repository with complete CRUD operations

### Data Models and DTOs

- Game entity and related interfaces (complete)
- Player entity and related interfaces (complete)
- Data validation with class-validator

### Game Service

The game service is fully implemented with comprehensive functionality:

- Game creation and management (create, start, pause, resume, end)
- Number drawing logic (manual and automatic)
- Bingo validation with pattern checking
- Game statistics and monitoring
- Game code generation and lookup

Key features include:
- Support for both manual and timed number drawing
- Comprehensive bingo pattern validation (rows, columns, diagonals)
- Game state management with proper status transitions
- Automatic game expiration (12-hour TTL)
- Real-time statistics tracking

### Player Service

The player service implementation includes:
- Player registration (basic implementation)
- Card state management
- Connection state tracking
- Bingo card generation (placeholder - needs implementation)

### WebSocket Gateway

The WebSocket Gateway has been enhanced for real-time communication:

- Basic connection handling (connect/disconnect events)
- Ping/pong functionality for connection testing
- Game room joining functionality
- Event broadcasting to specific game rooms
- Connection state tracking (in progress)
- Message broadcasting to rooms (in progress)

The gateway is configured with CORS enabled for development. In production, the origin should be restricted to your frontend domain.

### Available WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ping` | Client → Server | Simple ping to test connection |
| `pong` | Server → Client | Server response to ping |
| `joinGame` | Client → Server | Request to join a specific game room |
| `playerJoined` | Server → Client | Broadcast when a new player joins a game |
| `gameJoined` | Server → Client | Confirmation that a player has joined a game |

### Current Development Status

**Completed:**
- ✅ Game service with full game lifecycle management
- ✅ Game repository with DynamoDB integration
- ✅ Player repository with DynamoDB integration
- ✅ Comprehensive bingo validation logic
- ✅ Number drawing algorithms (manual and automatic)
- ✅ Game statistics and monitoring

**In Progress:**
- 🔄 Player service bingo card generation algorithm
- 🔄 WebSocket gateway real-time event broadcasting
- 🔄 REST API controllers for game management
- 🔄 Admin authentication and authorization

**Next Steps:**
- Player bingo card generation implementation
- WebSocket event handlers for real-time updates
- REST API endpoints for frontend integration
- Enhanced error handling and logging

## Deployment

The backend is designed to be deployed as an AWS Lambda function:

1. Build the application:
```bash
npm run build
```

2. Deploy using AWS Amplify:
```bash
amplify push
```

## License

MIT