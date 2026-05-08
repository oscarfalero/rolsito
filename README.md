# Rolsito

AI-Powered Multiplayer RPG Platform. A web-based role-playing game where an AI Dungeon Master guides players through fantastic medieval adventures.

## Vision

Create a platform where players can subscribe, create campaigns, and participate in AI-driven D&D-style adventures. Each campaign has its own independent AI DM instance with persistent memory across sessions.

## Current Status: Subproject 1 - Core Engine + AI DM ✅

### Implemented Features
- ✅ JWT Authentication (register/login)
- ✅ Campaign creation and management
- ✅ Character creation with race/class selection
- ✅ Real-time multiplayer gameplay via WebSockets
- ✅ Turn-based action system
- ✅ AI DM integration with OpenAI GPT-4o
- ✅ Session memory and context persistence
- ✅ Chat interface with dice rolling shortcuts
- ✅ Player lobby and campaign details

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Socket.io-client
- **Backend:** NestJS (Node.js + TypeScript)
- **Databases:** SQLite (dev) / PostgreSQL (prod) + Redis mock (dev) / Redis (prod)
- **Real-time:** Socket.io (WebSockets)
- **AI:** OpenAI GPT-4o / GPT-4o-mini

## Prerequisites

- Node.js 20+
- OpenAI API key

> **Note:** PostgreSQL and Redis are optional for development. The project runs with SQLite and in-memory Redis mock by default.

## Quick Start

### 1. Clone and setup

```bash
git clone https://github.com/oscarfalero/rolsito.git
cd rolsito
git checkout sp1-core-engine
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

The default `.env` already works without Docker:
- `USE_SQLITE=true` - Uses SQLite file database
- `USE_REDIS_MOCK=true` - Uses in-memory Redis

### 3. Start Backend

```bash
cd backend
npm install
npm run start:dev
```

Backend will run on http://localhost:4000

### 4. Start Frontend (in another terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on http://localhost:3000

### 5. Open the app

Go to http://localhost:3000 and create an account to start playing!

---

## Alternative: Using PostgreSQL + Redis (Docker)

If you prefer using PostgreSQL and Redis with Docker:

```bash
# Start containers
docker-compose up -d

# Update backend/.env
USE_SQLITE=false
USE_REDIS_MOCK=false
```

## Project Structure

```
rolsito/
├── backend/              # NestJS API
│   ├── src/
│   │   ├── auth/        # JWT authentication
│   │   ├── users/       # User management
│   │   ├── campaigns/   # Campaign CRUD
│   │   ├── characters/  # Character management
│   │   ├── game/        # WebSocket gateway & turn system
│   │   ├── dm/          # AI DM service
│   │   ├── llm/         # OpenAI integration
│   │   ├── memory/      # Session memory/context
│   │   └── common/      # Shared utilities (Redis)
│   ├── .env             # Environment variables
│   └── rolsito.dev.db   # SQLite database (auto-created)
├── frontend/            # React SPA
│   ├── src/
│   │   ├── pages/       # Route pages
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom hooks (useSocket)
│   │   ├── stores/      # Zustand stores
│   │   ├── services/    # API clients
│   │   └── types/       # TypeScript types
│   └── index.html
├── docker-compose.yml   # PostgreSQL + Redis (optional)
└── .env.example
```

## Subprojects

1. **Core Engine + AI DM** ✅ - Real-time multiplayer game engine with AI DM
2. **Characters & Scenarios** - Advanced character sheets, scenes, NPCs
3. **Image Generation** - AI-generated portraits and scenes
4. **Auth & Monetization** - OAuth, subscriptions, payments

## Game Flow

1. Register/Login
2. Create a Campaign (choose DM personality)
3. Join a Campaign
4. Create a Character
5. Enter Game Room
6. Wait for your turn
7. Describe your action
8. AI DM responds with narrative
9. Turn passes to next player

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `USE_SQLITE` | Use SQLite instead of PostgreSQL | `true` |
| `SQLITE_DB_PATH` | SQLite database file path | `./rolsito.dev.db` |
| `USE_REDIS_MOCK` | Use in-memory Redis mock | `true` |
| `DB_HOST` | PostgreSQL host (if USE_SQLITE=false) | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `rolsito` |
| `DB_PASSWORD` | PostgreSQL password | `rolsito123` |
| `DB_NAME` | PostgreSQL database | `rolsito` |
| `REDIS_HOST` | Redis host (if USE_REDIS_MOCK=false) | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `PORT` | Backend port | `4000` |

## Development

```bash
# Backend tests
cd backend && npm test

# Frontend build
cd frontend && npm run build
```

## License

MIT
