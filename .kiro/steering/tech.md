# Technology Stack

## Core Technologies
- **Frontend**: Next.js 15.4 (App Router) with React 19.1
- **Backend**: NestJS 11 running on AWS Lambda
- **Styling**: TailwindCSS 4
- **Language**: TypeScript 5
- **Deployment**: AWS Amplify
- **Database**: DynamoDB (with TTL for game state)
- **Real-time Communication**: WebSockets (NestJS WebSocket Gateway)

## Project Setup
- Monorepo structure using npm workspaces
- ESLint and Prettier for code quality
- Husky for git hooks

## Build System
- Next.js build system for frontend
- NestJS CLI for backend
- AWS CDK for infrastructure (optional)

## Common Commands

### Development
```bash
# Start both frontend and backend in development mode
npm run dev

# Start only frontend
npm run dev -w frontend

# Start only backend
npm run dev -w backend
```

### Building
```bash
# Build frontend
npm run build -w frontend

# Build backend
npm run build -w backend
```

### Testing
```bash
# Run frontend tests
npm run test -w frontend

# Run backend tests
npm run test -w backend

# Run backend e2e tests
npm run test:e2e -w backend
```

### Linting and Formatting
```bash
# Lint frontend
npm run lint -w frontend

# Lint backend
npm run lint -w backend

# Format backend code
npm run format -w backend
```

## AWS Deployment
- **Amplify CLI**: Used for managing AWS resources
- **amplify.yml**: Configures the monorepo build process
- **DynamoDB**: Used for data persistence with TTL feature
- **Lambda**: Hosts the NestJS backend application