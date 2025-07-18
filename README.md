
# 📱 Bingo Web App

A mobile‑first, installation‑free **Web Bingo** game for up to **100 concurrent players**, managed in real‑time by 1–2 administrators.  
Built with **Next.js + Fastify (Lambda)** and deployed via **AWS Amplify**.

---

## 🏁 Features

| Area | Key Features |
|------|--------------|
| **Player** | • QR‑code join, name input only  <br>• 5×5 bingo card with **tap‑to‑punch** holes  <br>• Real‑time number highlights (<1 s)  <br>• Automatic session restore after reconnect |
| **Admin** | • Room create / pause / end (max 12 h)  <br>• Manual / auto number draw  <br>• Live reach / bingo tracker  <br>• Participant list w/ online status |
| **Non‑functional** | • 100 clients @ 1 s latency  <br>• PWA‑ready mobile UI  <br>• No complex auth (players)  <br>• Easy monorepo CI/CD (Amplify) |

---

## 🗂 Repository Layout (Monorepo)

```
/ (Git root)
├── README.md
├── package.json          # lint / prettier / tools
├── amplify.yml           # Amplify build (monorepo)
│
├── frontend/             # 📱 Next.js + Tailwind (PWA)
│   └── …                 # see frontend/README.md
│
├── backend/              # 🔌 Fastify (Lambda mode)
│   └── …                 # see backend/README.md
│
└── infra/                # 🏗️ CDK / Terraform (optional)
    └── …
```

Both **frontend** and **backend** are separate **npm workspaces**.  
`amplify.yml` builds & deploys each workspace in parallel.

---

## 🚀 Quick Start (Local Dev)

### 0. Prerequisites

* Node.js 18+, npm 9+ (or pnpm 8+)
* Git
* **AWS CLI** & **Amplify CLI**  
  `npm i -g @aws-amplify/cli`
* Docker (for local backend / DynamoDB Local)

### 1. Clone & Install

```bash
git clone https://github.com/<your‑org>/bingo-app.git
cd bingo-app
npm ci               # root tools
```

### 2. Amplify Init / Pull

```bash
aws configure        # set your credentials
amplify init         # or: amplify pull --envName dev
```

### 3. Frontend

```bash
cd frontend
npm ci
cp .env.example .env.local   # set API_URL etc.
npm run dev                  # http://localhost:3000
```

### 4. Backend

```bash
cd ../backend
npm ci
npm run dev                  # http://localhost:4000
# Optional: amplify mock function
```

### 5. All‑in‑one Dev Script

```bash
# from repo root
npm run dev   # concurrently starts frontend & backend
```

### 6. Lint / Format

```bash
npm run lint
npm run format
```

---

## 🛠 Deployment (AWS Amplify)

```bash
# Push code, Amplify detects branch & builds
git push origin main
# Or manual:
amplify push             # update backend
amplify publish          # build & deploy frontend
```

Amplify Hosting (S3 + CloudFront) handles the static Next.js output;  
Lambda + API Gateway (or AppSync WebSocket) serves real‑time APIs.

---

## 🤝 Contributing

1. Fork the repo & create a feature branch.
2. Run `npm run lint` – CI will fail on lint errors.
3. Submit a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** – see [`LICENSE`](LICENSE) for details.

---

> *Generated 2025-07-18*  
