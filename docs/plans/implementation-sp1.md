# SP1: Core Engine + AI DM - Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan.

**Goal:** Build the foundational real-time multiplayer RPG engine with AI DM integration.

**Architecture:** NestJS backend with Socket.io for real-time gameplay, React frontend, PostgreSQL for persistence, Redis for game state and context caching.

**Tech Stack:** NestJS, React 18, TypeScript, Socket.io, TypeORM, PostgreSQL, Redis, Docker

---

## File Structure

```
rolsito/
├── backend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── config/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── campaigns/
│   │   ├── campaign-members/
│   │   ├── characters/
│   │   ├── game-sessions/
│   │   ├── messages/
│   │   ├── game/
│   │   ├── dm/
│   │   ├── memory/
│   │   ├── llm/
│   │   └── common/
│   ├── test/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   └── package.json
├── docker-compose.yml
└── .env.example
```

---

## Chunk 1: Project Setup

### Task 1: Initialize NestJS Backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`

**Steps:**

- [ ] **Step 1: Create backend directory and package.json**

```bash
mkdir -p backend && cd backend
cat > package.json << 'EOF'
{
  "name": "rolsito-backend",
  "version": "0.1.0",
  "description": "Rolsito RPG Platform Backend",
  "author": "",
  "private": true,
  "license": "MIT",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/platform-socket.io": "^10.3.0",
    "@nestjs/websockets": "^10.3.0",
    "@nestjs/typeorm": "^10.0.1",
    "@nestjs/config": "^3.1.1",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "typeorm": "^0.3.17",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "bcrypt": "^5.1.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "reflect-metadata": "^0.2.1",
    "rxjs": "^7.8.1",
    "openai": "^4.24.7"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.3.0",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.6",
    "@types/supertest": "^6.0.2",
    "@types/bcrypt": "^5.0.2",
    "@types/passport-jwt": "^4.0.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.1.2",
    "jest": "^29.7.0",
    "prettier": "^3.1.1",
    "source-map-support": "^0.5.21",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-loader": "^9.5.1",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.3.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": [
      "**/*.(t|j)s"
    ],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
EOF
```

- [ ] **Step 2: Create tsconfig.json**

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
EOF
```

- [ ] **Step 3: Create nest-cli.json**

```bash
cat > nest-cli.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
EOF
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: node_modules created, no errors

- [ ] **Step 5: Create source directories**

Run: `mkdir -p src/config src/auth src/users src/campaigns src/campaign-members src/characters src/game-sessions src/messages src/game src/dm src/memory src/llm src/common test`

---

### Task 2: Initialize React Frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`

**Steps:**

- [ ] **Step 1: Create frontend directory and package.json**

```bash
mkdir -p frontend && cd frontend
cat > package.json << 'EOF'
{
  "name": "rolsito-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "@tanstack/react-query": "^5.17.9",
    "socket.io-client": "^4.7.4",
    "axios": "^1.6.5",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.33",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
EOF
```

- [ ] **Step 2: Create tsconfig.json**

```bash
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF
```

- [ ] **Step 3: Create tsconfig.node.json**

```bash
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF
```

- [ ] **Step 4: Create vite.config.ts**

```bash
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
EOF
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: node_modules created, no errors

- [ ] **Step 6: Create source directories**

Run: `mkdir -p src/pages src/components src/hooks src/stores src/types src/lib src/services`

---

### Task 3: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Steps:**

- [ ] **Step 1: Create docker-compose.yml**

```bash
cat > ../docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: rolsito-postgres
    environment:
      POSTGRES_USER: ${DB_USER:-rolsito}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-rolsito123}
      POSTGRES_DB: ${DB_NAME:-rolsito}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-rolsito} -d ${DB_NAME:-rolsito}"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: rolsito-redis
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF
```

- [ ] **Step 2: Create .env.example**

```bash
cat > ../.env.example << 'EOF'
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=rolsito
DB_PASSWORD=rolsito123
DB_NAME=rolsito

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=7d

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Server
PORT=4000
NODE_ENV=development
EOF
```

- [ ] **Step 3: Start Docker services**

Run: `docker-compose up -d`
Expected: postgres and redis containers running

---

## Chunk 2: Backend Foundation

### Task 4: Database Entities & Migrations

**Files:**
- Create: `backend/src/config/database.config.ts`
- Create: `backend/src/common/entities/base.entity.ts`
- Create: `backend/src/users/entities/user.entity.ts`
- Create: `backend/src/campaigns/entities/campaign.entity.ts`
- Create: `backend/src/campaign-members/entities/campaign-member.entity.ts`
- Create: `backend/src/characters/entities/character.entity.ts`
- Create: `backend/src/game-sessions/entities/game-session.entity.ts`
- Create: `backend/src/messages/entities/message.entity.ts`

**Steps:**

- [ ] **Step 1: Create base entity**
- [ ] **Step 2: Create all domain entities**
- [ ] **Step 3: Create database configuration**
- [ ] **Step 4: Write entity tests**
- [ ] **Step 5: Verify entity relationships**

---

### Task 5: Auth Module

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/jwt-auth.guard.ts`
- Create: `backend/src/auth/dto/register.dto.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Test: `backend/src/auth/auth.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing auth service tests**
- [ ] **Step 2: Implement auth service with JWT**
- [ ] **Step 3: Implement auth controller**
- [ ] **Step 4: Implement JWT strategy and guard**
- [ ] **Step 5: Run tests and verify**

---

### Task 6: User Module

**Files:**
- Create: `backend/src/users/users.module.ts`
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.controller.ts`
- Test: `backend/src/users/users.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing user service tests**
- [ ] **Step 2: Implement user service**
- [ ] **Step 3: Implement user controller**
- [ ] **Step 4: Run tests and verify**

---

### Task 7: Campaign Module

**Files:**
- Create: `backend/src/campaigns/campaigns.module.ts`
- Create: `backend/src/campaigns/campaigns.service.ts`
- Create: `backend/src/campaigns/campaigns.controller.ts`
- Create: `backend/src/campaigns/dto/create-campaign.dto.ts`
- Test: `backend/src/campaigns/campaigns.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing campaign service tests**
- [ ] **Step 2: Implement campaign service**
- [ ] **Step 3: Implement campaign controller**
- [ ] **Step 4: Run tests and verify**

---

## Chunk 3: Real-time Game Engine

### Task 8: Redis Service

**Files:**
- Create: `backend/src/common/services/redis.service.ts`
- Test: `backend/src/common/services/redis.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing Redis service tests**
- [ ] **Step 2: Implement Redis service with ioredis**
- [ ] **Step 3: Run tests and verify**

---

### Task 9: Game Gateway (WebSocket)

**Files:**
- Create: `backend/src/game/game.gateway.ts`
- Create: `backend/src/game/game.module.ts`
- Create: `backend/src/game/game.service.ts`
- Create: `backend/src/game/dto/join-campaign.dto.ts`
- Create: `backend/src/game/dto/submit-action.dto.ts`
- Test: `backend/src/game/game.gateway.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing gateway tests**
- [ ] **Step 2: Implement game gateway with Socket.io**
- [ ] **Step 3: Implement game service for room management**
- [ ] **Step 4: Run tests and verify**

---

### Task 10: Turn Service

**Files:**
- Create: `backend/src/game/turn.service.ts`
- Test: `backend/src/game/turn.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing turn service tests**
- [ ] **Step 2: Implement round-robin turn logic**
- [ ] **Step 3: Run tests and verify**

---

### Task 11: Game Session & Message Modules

**Files:**
- Create: `backend/src/game-sessions/game-sessions.module.ts`
- Create: `backend/src/game-sessions/game-sessions.service.ts`
- Create: `backend/src/messages/messages.module.ts`
- Create: `backend/src/messages/messages.service.ts`
- Test: `backend/src/game-sessions/game-sessions.service.spec.ts`
- Test: `backend/src/messages/messages.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing session service tests**
- [ ] **Step 2: Implement session service**
- [ ] **Step 3: Write failing message service tests**
- [ ] **Step 4: Implement message service**
- [ ] **Step 5: Run tests and verify**

---

### Task 12: Character Module

**Files:**
- Create: `backend/src/characters/characters.module.ts`
- Create: `backend/src/characters/characters.service.ts`
- Create: `backend/src/characters/characters.controller.ts`
- Create: `backend/src/characters/dto/create-character.dto.ts`
- Test: `backend/src/characters/characters.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing character service tests**
- [ ] **Step 2: Implement character service**
- [ ] **Step 3: Implement character controller**
- [ ] **Step 4: Run tests and verify**

---

## Chunk 4: AI DM Integration

### Task 13: LLM Service

**Files:**
- Create: `backend/src/llm/llm.module.ts`
- Create: `backend/src/llm/llm.service.ts`
- Test: `backend/src/llm/llm.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing LLM service tests**
- [ ] **Step 2: Implement OpenAI integration**
- [ ] **Step 3: Add retry and rate limiting**
- [ ] **Step 4: Run tests and verify**

---

### Task 14: Memory Service

**Files:**
- Create: `backend/src/memory/memory.module.ts`
- Create: `backend/src/memory/memory.service.ts`
- Test: `backend/src/memory/memory.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing memory service tests**
- [ ] **Step 2: Implement session summary generation**
- [ ] **Step 3: Implement context retrieval**
- [ ] **Step 4: Run tests and verify**

---

### Task 15: DM Service

**Files:**
- Create: `backend/src/dm/dm.module.ts`
- Create: `backend/src/dm/dm.service.ts`
- Test: `backend/src/dm/dm.service.spec.ts`

**Steps:**

- [ ] **Step 1: Write failing DM service tests**
- [ ] **Step 2: Implement prompt construction**
- [ ] **Step 3: Integrate LLM and memory services**
- [ ] **Step 4: Run tests and verify**

---

## Chunk 5: Frontend

### Task 16: Frontend Auth Pages

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Register.tsx`
- Create: `frontend/src/services/auth.service.ts`
- Create: `frontend/src/stores/auth.store.ts`

**Steps:**

- [ ] **Step 1: Create auth store with Zustand**
- [ ] **Step 2: Create auth service with axios**
- [ ] **Step 3: Build login page**
- [ ] **Step 4: Build register page**
- [ ] **Step 5: Test manually**

---

### Task 17: Dashboard & Campaign Management

**Files:**
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/CampaignNew.tsx`
- Create: `frontend/src/pages/CampaignDetail.tsx`
- Create: `frontend/src/services/campaign.service.ts`

**Steps:**

- [ ] **Step 1: Create campaign service**
- [ ] **Step 2: Build dashboard page**
- [ ] **Step 3: Build campaign creation form**
- [ ] **Step 4: Build campaign detail/lobby**
- [ ] **Step 5: Test manually**

---

### Task 18: Game Interface

**Files:**
- Create: `frontend/src/pages/GamePlay.tsx`
- Create: `frontend/src/components/ChatTimeline.tsx`
- Create: `frontend/src/components/PlayerList.tsx`
- Create: `frontend/src/components/ActionInput.tsx`
- Create: `frontend/src/hooks/useSocket.ts`
- Create: `frontend/src/services/socket.service.ts`

**Steps:**

- [ ] **Step 1: Create socket hook and service**
- [ ] **Step 2: Build chat timeline component**
- [ ] **Step 3: Build player list sidebar**
- [ ] **Step 4: Build action input with dice shortcuts**
- [ ] **Step 5: Build main game play page**
- [ ] **Step 6: Test with multiple browser tabs**

---

## Chunk 6: Integration & Polish

### Task 19: End-to-End Integration

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `frontend/src/App.tsx`

**Steps:**

- [ ] **Step 1: Wire up all backend modules**
- [ ] **Step 2: Set up React Router with all routes**
- [ ] **Step 3: Test full user flow**
- [ ] **Step 4: Fix integration bugs**

---

### Task 20: Testing & Documentation

**Files:**
- Create: `backend/test/app.e2e-spec.ts`
- Modify: `README.md`

**Steps:**

- [ ] **Step 1: Write e2e tests for auth**
- [ ] **Step 2: Write e2e tests for campaigns**
- [ ] **Step 3: Run full test suite**
- [ ] **Step 4: Update README with setup instructions**
- [ ] **Step 5: Commit all changes**

---

## Verification Commands

```bash
# Backend tests
cd backend && npm test

# Backend e2e tests
cd backend && npm run test:e2e

# Frontend build
cd frontend && npm run build

# Docker status
docker-compose ps
```
