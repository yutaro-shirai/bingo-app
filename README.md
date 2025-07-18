
# 📱 Bingo Web App

A **mobile‑first** Web Bingo game for up to **100 concurrent players**, managed in real time by 1–2 administrators.  
Monorepo powered by **Next.js (frontend)** & **NestJS on AWS Lambda (backend)**, deployed via **AWS Amplify**.

---

## ✨ Core Features

| Area | Highlights |
|------|------------|
| **Player** | QR‑code join, name‑only entry, 5×5 card with **tap‑to‑punch** holes, real‑time number highlights (<1 s), automatic reconnect |
| **Admin** | Create / pause / end rooms (≤ 12 h), manual or timed number draw, live reach/bingo tracker, participant list & online status |
| **Tech** | Next.js 14 App Router, TailwindCSS, PWA ready, NestJS WebSocket Gateway, Amplify Hosting + Lambda, DynamoDB TTL for game state |

---

## 🗂 Repository Layout

```
/ (Git root)
├── README.md
├── amplify.yml             # Amplify monorepo build
├── package.json            # root lint / tools (npm workspaces)
│
├── frontend/               # 📱 Next.js + Tailwind
│   └── …                   # see frontend/README.md
│
├── backend/                # 🔌 NestJS (Lambda-ready)
│   └── …                   # see backend/README.md
│
└── infra/                  # 🏗️ AWS CDK (optional)
    └── …
```

All three work as **npm workspaces**. Amplify builds each path in parallel.

---

## 🚧 Current Implementation Status

### Backend (NestJS) - In Progress ✅
- **Game Service**: Fully implemented with complete game lifecycle management
- **Game Repository**: Complete DynamoDB integration with TTL support
- **Player Repository**: Complete CRUD operations implemented
- **Bingo Validation**: Comprehensive pattern checking (rows, columns, diagonals)
- **Number Drawing**: Both manual and automatic drawing algorithms
- **WebSocket Gateway**: Basic real-time communication (expanding)

### Frontend (Next.js) - In Progress 🔄
- **WebSocket Client**: Fully implemented with reconnection logic
- **UI Components**: Basic components and responsive layouts
- **Admin Authentication**: Login page and protected routes (in progress)
- **Game Components**: Bingo card and game status components (planned)

### Shared Types - Complete ✅
- Game and player data models
- WebSocket message interfaces
- Zod validation schemas

---

## 🚀 Local Setup

### 0. Prerequisites

* Node.js 18+ / npm 9+ (or pnpm 8+)
* Git
* **AWS CLI** & **Amplify CLI**  
  `npm i -g @aws-amplify/cli`
* Docker (for DynamoDB Local or Lambda emulation)

### 1. Clone & Scaffold Repos

```bash
git clone https://github.com/<your-org>/bingo-app.git
cd bingo-app

# create skeleton directories
mkdir frontend backend infra
```

#### 1‑a. Frontend (Next.js)

```bash
npx create-next-app@latest frontend   --ts --tailwind --eslint --app --import-alias "@/*" --use-npm
```

#### 1‑b. Backend (NestJS)

```bash
npx @nestjs/cli new backend --package-manager npm --skip-git
cd backend
npm i @nestjs/platform-socket.io aws-lambda
cd ..
```

#### 1‑c. Infrastructure (CDK, optional)

```bash
cd infra
npx aws-cdk init app --language typescript
cd ..
```

### 2. Install Root Tooling & Amplify Init

```bash
npm ci                  # installs root ESLint/Prettier/husky
amplify init            # or: amplify pull --envName dev
```

### 3. Run Everything Locally

```bash
# Frontend
cd frontend && npm run dev

# Backend (Lambda-like Nest start)
cd ../backend && npm run start:dev

# Or from root (requires concurrently):
npm run dev            # starts both
```

### 4. Lint & Format

```bash
npm run lint
npm run format
```

---

## 🛠 CI/CD with AWS Amplify

1. Push code – Amplify Console detects the branch.  
2. `amplify push` – updates backend resources (DynamoDB, Lambda).  
3. `amplify publish` – builds & deploys frontend to S3/CloudFront.

`amplify.yml` handles the monorepo build sequence:

```yaml
frontend:
  phases:
    preBuild:
      commands: ['npm ci --legacy-peer-deps', 'npm run -w frontend build']
    build:
      commands: ['npm run -w frontend export']
backend:
  phases:
    preBuild:
      commands: ['npm ci --legacy-peer-deps', 'npm run -w backend build']
```

---

## 🤝 Contributing

1. Fork the repo & create a feature branch.
2. `npm run lint` – CI will fail on lint errors.
3. Submit a Pull Request.

---

## 📄 License

MIT License – see [`LICENSE`](LICENSE).

---

> *Generated 2025-07-18*
