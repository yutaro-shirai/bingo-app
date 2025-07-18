# Project Structure

## Repository Organization
This is a monorepo with three main directories:

```
/ (Git root)
├── frontend/               # Next.js web application
├── backend/                # NestJS API and WebSocket server
└── infra/                  # AWS CDK infrastructure code (optional)
```

## Frontend Structure
The frontend follows Next.js App Router conventions:

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── app/                # App Router pages and layouts
│   │   ├── layout.tsx      # Root layout with providers
│   │   └── page.tsx        # Home page component
│   ├── components/         # Reusable React components
│   ├── lib/                # Utility functions and shared code
│   └── types/              # TypeScript type definitions
├── next.config.ts          # Next.js configuration
└── tailwind.config.js      # TailwindCSS configuration
```

## Backend Structure
The backend follows NestJS module-based architecture:

```
backend/
├── src/
│   ├── main.ts             # Application entry point
│   ├── app.module.ts       # Root module
│   ├── app.controller.ts   # Root controller
│   ├── app.service.ts      # Root service
│   ├── game/               # Game module
│   │   ├── game.module.ts
│   │   ├── game.controller.ts
│   │   ├── game.service.ts
│   │   ├── game.gateway.ts # WebSocket gateway
│   │   └── dto/            # Data Transfer Objects
│   └── common/             # Shared utilities and helpers
└── test/                   # End-to-end tests
```

## Infrastructure Structure (Optional)
If using AWS CDK for infrastructure:

```
infra/
├── lib/                    # CDK stack definitions
├── bin/                    # CDK app entry point
└── cdk.json                # CDK configuration
```

## Code Organization Principles

1. **Feature-based organization**: Group related files by feature rather than by type
2. **Clean separation of concerns**: 
   - Frontend: UI components, data fetching, state management
   - Backend: Controllers, services, gateways, repositories
3. **Shared types**: Common types should be defined in shared locations
4. **Module boundaries**: Each module should have clear responsibilities and interfaces