# Subproject 1: Core Engine + AI DM

## Overview

Build the foundational real-time multiplayer game engine with an AI-powered Dungeon Master. This subproject delivers a complete playable MVP where users can register, create campaigns, invite players, and play turn-based RPG sessions guided by an AI DM.

## Goal

A working real-time RPG platform where multiple players can join a campaign, take turns performing actions in a chat interface, and receive contextual responses from an AI DM that remembers previous sessions.

## Architecture

### Backend: NestJS (Node.js + TypeScript)

**Modules:**

- **`AuthModule`** - JWT-based authentication. Registration, login, token refresh, password hashing with bcrypt.
- **`UserModule`** - User profiles, basic CRUD.
- **`CampaignModule`** - Campaign creation, configuration, and management. Each campaign stores its own `systemPrompt` (DM personality), `maxPlayers`, `status` (draft/active/completed), and metadata.
- **`CampaignMemberModule`** - Membership management. Roles: `owner`, `player`, `dm` (AI is always the DM, but human can co-DM later).
- **`CharacterModule`** - Basic character creation within a campaign. Name, race, class, and a simple stats block (JSONB).
- **`GameSessionModule`** - Session lifecycle. A session is a single play instance within a campaign. Tracks start/end time and generates a summary for memory.
- **`MessageModule`** - Persists all in-game messages (player actions, DM responses, system events).
- **`GameGateway`** - Socket.io gateway handling real-time events: `join_campaign`, `leave_campaign`, `submit_action`, `turn_change`, `dm_response`, `player_typing`.
- **`TurnService`** - Turn queue management. Simple round-robin by default. Validates that actions come from the current player.
- **`DMService`** - The brain. Builds prompts from campaign system prompt + session summaries + recent context + current action, calls LLM API, parses response, saves to DB, broadcasts to room.
- **`MemoryService`** - Manages campaign memory. After each session, generates a summary via LLM and stores it. Maintains recent context in Redis.
- **`LLMService`** - Abstraction over LLM providers (OpenAI, Anthropic). Handles retries, rate limiting, token counting.

**Database Schema (PostgreSQL):**

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL, -- The DM's personality and rules
  dm_model VARCHAR(50) DEFAULT 'gpt-4o', -- Which LLM to use
  max_players INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign Members
CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'player', -- owner, player
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

-- Characters
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  race VARCHAR(50),
  class VARCHAR(50),
  level INT DEFAULT 1,
  stats JSONB DEFAULT '{}', -- {str, dex, con, int, wis, cha}
  backstory TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100),
  summary_text TEXT, -- AI-generated summary for memory
  status VARCHAR(20) DEFAULT 'active', -- active, completed
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL, -- player, dm, system
  sender_id UUID REFERENCES users(id), -- NULL for DM/system
  character_id UUID REFERENCES characters(id), -- Which character spoke
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- {turn_number, dice_roll, action_type}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Redis Keys:**

- `campaign:{id}:active_players` → Set of socket IDs
- `campaign:{id}:turn_queue` → List of user IDs in turn order
- `campaign:{id}:current_turn` → String: current user ID
- `campaign:{id}:session:{id}:recent_context` → List of last 30 message objects (TTL 48h)
- `campaign:{id}:typing` → Set of usernames currently typing

**WebSocket Events:**

Client → Server:
- `campaign:join` `{ campaignId }`
- `campaign:leave` `{ campaignId }`
- `action:submit` `{ campaignId, content, characterId }`
- `typing:start` `{ campaignId }`
- `typing:stop` `{ campaignId }`

Server → Client:
- `campaign:joined` `{ campaignId, players, currentTurn }`
- `campaign:left` `{ campaignId }`
- `player:joined` `{ user, character }`
- `player:left` `{ userId }`
- `turn:changed` `{ userId, username, characterName }`
- `action:received` `{ message }`
- `dm:typing` `{}`
- `dm:response` `{ message }`
- `typing:update` `{ usernames }`
- `error` `{ code, message }`

### Frontend: React + TypeScript

**Tech:** React 18, React Router, Socket.io-client, TanStack Query, Tailwind CSS, shadcn/ui

**Pages:**

- **`/register`** - Email, username, password registration.
- **`/login`** - Email/password login, JWT stored in httpOnly cookie (or localStorage for MVP).
- **`/dashboard`** - Grid of campaigns. "My Campaigns" (as owner/player) and "Browse" (public campaigns). Button to create new campaign.
- **`/campaigns/new`** - Campaign creation form: name, description, system prompt (with templates), max players, DM model selection.
- **`/campaigns/:id`** - Campaign detail/lobby. Shows members, characters, "Start Session" button (owner only).
- **`/campaigns/:id/play`** - Main game interface.
  - **Left sidebar:** Campaign info, player list with their characters, current turn indicator.
  - **Center:** Chat timeline. Different message styles for player actions, DM responses, and system events.
  - **Bottom:** Action input (disabled when not your turn). Dice roll shortcuts (d4, d6, d8, d10, d12, d20).
  - **Right sidebar (collapsible):** Campaign memory/summary, recent events log.

### AI DM Prompt Engineering

**System Prompt Template:**

```
You are the Dungeon Master (DM) for a fantasy medieval RPG campaign called "{campaign_name}".
{system_prompt} [Custom personality/rules from campaign creator]

Campaign Context:
- World setting: {description}
- Current session summary: {session_summary}
- Previous session summaries: {past_summaries}

Active Players and Characters:
{character_list}

Rules:
1. Respond in character as the DM.
2. Describe scenes vividly.
3. Ask for dice rolls when appropriate (format: [ROLL: skill_name, ability]).
4. Track health, inventory, and status implicitly.
5. Keep responses concise but atmospheric (2-4 paragraphs max).
6. Maintain continuity with previous events.
```

**Context Window Strategy:**
1. System prompt (always included)
2. Session summary from previous sessions (top 3, condensed)
3. Recent messages from current session (last 20-30)
4. Current player action

**Memory Strategy:**
- After each session ends, call LLM with all messages to generate a 500-word summary.
- Store summary in `game_sessions.summary_text`.
- On new session, fetch summaries from last 5 completed sessions and include in prompt.
- This gives the DM "long-term memory" without consuming token context.

## Implementation Plan

### Phase 1: Project Setup (1-2 days)
1. Initialize NestJS backend with TypeScript
2. Set up PostgreSQL and Redis (Docker Compose)
3. Initialize React frontend with Vite
4. Configure ESLint, Prettier, TypeScript strict mode
5. Set up environment variables (.env templates)

### Phase 2: Backend Foundation (3-4 days)
1. Implement AuthModule with JWT
2. Create database entities and migrations
3. Implement UserModule and CampaignModule
4. Set up Redis connection and basic service
5. Write integration tests for auth and campaigns

### Phase 3: Real-time Game Engine (4-5 days)
1. Implement Socket.io gateway with room management
2. Build TurnService with round-robin logic
3. Implement GameSessionModule and MessageModule
4. Create CharacterModule with basic CRUD
5. Add campaign membership logic (join/invite)

### Phase 4: AI DM Integration (3-4 days)
1. Build LLMService with OpenAI integration
2. Implement DMService with prompt construction
3. Add MemoryService for session summaries
4. Integrate DM responses into game flow
5. Test with sample campaigns

### Phase 5: Frontend (4-5 days)
1. Build auth pages (login/register)
2. Create dashboard and campaign management UI
3. Implement game lobby and character creation
4. Build main game interface with chat
5. Connect to WebSocket events

### Phase 6: Testing & Polish (2-3 days)
1. End-to-end testing with multiple browser tabs
2. Bug fixes and edge case handling
3. Performance optimization (Redis context caching)
4. Documentation and deployment setup

## Deliverables

- [ ] Working authentication system
- [ ] Campaign creation and management
- [ ] Real-time multiplayer chat/gameplay
- [ ] Turn-based action system
- [ ] AI DM responding contextually to player actions
- [ ] Basic character creation
- [ ] Session persistence and memory across sessions
- [ ] Docker setup for local development

## Dependencies

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- OpenAI API key (or Anthropic)

## Out of Scope (for this subproject)

- Image generation
- Advanced character stats/combat system
- Payments/subscriptions
- OAuth/social login
- Advanced DM customization (beyond system prompt)
- Real-time dice roll physics
- Voice/chat audio
