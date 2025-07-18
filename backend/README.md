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
│   ├── game/               # Game module (to be implemented)
│   │   ├── game.module.ts
│   │   ├── game.controller.ts
│   │   ├── game.service.ts
│   │   ├── game.gateway.ts # WebSocket gateway
│   │   └── dto/            # Data Transfer Objects
│   ├── player/             # Player module (to be implemented)
│   │   ├── player.module.ts
│   │   ├── player.controller.ts
│   │   ├── player.service.ts
│   │   └── dto/            # Data Transfer Objects
│   └── common/             # Shared utilities and helpers
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
npm install aws-sdk
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

## WebSocket Gateway Setup

The WebSocket Gateway is a key component for real-time communication between the server and clients. To set up the WebSocket Gateway:

1. Create a game module:
```bash
nest g module game
```

2. Create a WebSocket gateway:
```bash
nest g gateway game/game
```

3. Implement the gateway with connection handling, message broadcasting, and game state synchronization.

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