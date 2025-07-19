# Bingo Web App - Frontend

This is the frontend application for the Bingo Web App, built with [Next.js](https://nextjs.org) App Router and designed with a mobile-first approach.

## Features

- Mobile-first responsive design with TailwindCSS
- WebSocket client for real-time game updates
- QR code scanning for easy game joining
- Interactive bingo card with tap-to-punch functionality
- Offline support with automatic reconnection

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── app/                # App Router pages and layouts
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Home page component
│   │   ├── join/           # Game joining page
│   │   └── admin/          # Admin pages (login, dashboard)
│   ├── components/         # Reusable React components
│   │   ├── game/           # Game-specific components
│   │   └── ui/             # UI components (buttons, etc.)
│   ├── lib/                # Utility functions and shared code
│   │   ├── services/       # Service modules (WebSocket, auth)
│   │   └── utils/          # Utility functions
│   └── types/              # TypeScript type definitions
├── next.config.ts          # Next.js configuration
└── tailwind.config.js      # TailwindCSS configuration
```

## Components Status

### Implemented Components

#### WebSocket Client Service

A fully implemented WebSocket client service that includes:
- Socket.io client wrapper
- Reconnection logic
- Message handling and event system
- Connection status tracking

#### QR Code Scanner

A QR code scanner component that:
- Requests camera access
- Provides UI for scanning QR codes
- Includes manual code entry fallback
- Note: Requires integration with a QR code detection library (like jsQR or ZXing)

#### UI Components

- Connection status indicator
- Protected route component for admin pages
- Button component with various styles

### Admin Authentication

**Implemented:**
- Login page component
- Protected route component
- Authentication service structure
- Authentication logic integration
- Session management
- Admin dashboard functionality

### Game Join Components

**Implemented:**
- QR code scanner component
- Form submission functionality with Zod validation
- WebSocket service connection
- Game joining flow

### Admin Game Management

**Implemented:**
- Game creation form with configuration options
- Game control interface with start/pause/resume/end functionality
- Game timer display
- Player monitoring dashboard
- Number drawing interface (manual and automatic)

### Responsive Layouts

**Completed:**
- Mobile-first design foundation
- Adaptive layouts for different screen sizes
- Touch-friendly controls
- TailwindCSS 4 configuration

### Offline Support

**Completed:**
- Offline state indicators
- Local state persistence
- Automatic reconnection with WebSocket client

### State Management

**Implemented:**
- Zustand store implementation for game state
- Player state synchronization
- WebSocket event integration

## Getting Started

### Prerequisites

- Node.js 18+ / npm 9+

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run in development mode
npm run dev
```

### Building

```bash
# Build the application
npm run build

# Export static files (for production)
npm run export
```

### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch
```

## Deployment

The frontend is designed to be deployed using AWS Amplify:

1. Build the application:
```bash
npm run build
```

2. Deploy using AWS Amplify:
```bash
amplify publish
```

## License

MIT