# Characters & Scenarios MVP - Design Specification

> **Date:** 2026-05-09
> **Scope:** Subproject 2 (MVP - Option B)
> **Branch:** sp2-characters-scenarios

---

## 1. Goal

Expand the foundational RPG engine with a detailed character creation wizard, basic inventory tracking, and simple scene management that the AI DM can use for immersive storytelling.

## 2. Scope (MVP)

### In Scope
- Character stats (6 D&D-style attributes), modifiers, HP, AC
- Step-by-step character creation wizard
- Full character sheet view with stats, HP, AC, inventory
- Basic inventory system (items per campaign, characters carry items)
- Simple scene management (name, description, type, current scene tracking)
- AI DM receives current scene + character summaries in prompts
- Scene transitions via DM responses (`[SCENE_CHANGE: scene_id]`)

### Out of Scope
- Skills / proficiencies
- Equipable items affecting stats
- Scene connections / map view
- NPCs
- Quests / world state tracking
- Character progression / leveling automation
- Item weight / value mechanics
- Combat automation

## 3. Architecture

### Backend (NestJS)

**New Modules:**
- `ItemsModule` - CRUD for campaign-scoped items
- `InventoryModule` - Character inventory management (quantity-based)
- `ScenesModule` - Scene CRUD + current scene tracking on Campaign

**Modified Modules:**
- `CharactersModule` - Expand entity with stats/modifiers/HP/AC, add inventory relation
- `CampaignsModule` - Add `currentSceneId` (nullable FK to `scenes`, SET NULL on delete), relation to scenes. Also owns `GET /campaigns/:id/state` endpoint.
- `DMModule` (`src/dm/dm.service.ts`) - Include current scene + character summaries in prompts, parse scene transitions. Must import `CampaignsModule`, `CharactersModule`, and `ScenesModule` to access their services.
- `GameModule` (`src/game/game.gateway.ts`) - Broadcast `scene_changed` events

**Cross-Module Communication:**
`GameModule` already imports `DMModule` (existing dependency). To avoid a circular dependency, `DMModule` does **not** import `GameModule`. Instead, `DMService` emits a NestJS `EventEmitter2` event (`scene.changed`) when a scene transition is parsed. `GameModule` registers an `OnEvent('scene.changed')` listener that receives the payload and calls `gameGateway.broadcastToRoom()` to broadcast to all connected players. This keeps module boundaries clean.

**Data Flow for Scene Transitions:**
1. DMService generates response containing `[SCENE_CHANGE: scene_id]`
2. DMService parses tag and delegates to `CampaignsService.setCurrentScene(campaignId, sceneId)` which validates the scene belongs to the campaign and updates `campaign.currentSceneId`
3. DMService emits `scene.changed` event with payload `{ campaignId, scene: { id, name, description, type } }`
4. GameModule's event listener receives the event and calls `gameGateway.broadcastToRoom(campaignId, 'scene_changed', payload.scene)`
5. The tag is stripped from the persisted message, WebSocket broadcast, and HTTP response

**Multiple tags:** If a DM response contains multiple `[SCENE_CHANGE: ...]` tags, only the **first valid one** is processed. All tags are stripped from the output.

### Frontend (React + Vite)

**New/Modified Pages:**
- `CharacterNew.tsx` - 3-step creation wizard
- `CharacterSheet.tsx` (new) - Full character view with stats/inventory
- `ScenesManager.tsx` (new) - DM scene list + set active
- `GamePlay.tsx` - Add scene panel, character sidebar
- `CampaignDetail.tsx` - Link to character sheet

### Database Schema Changes

**Modified:**
- `characters` - Expand JSON `stats` structure; add `currentHp`, `maxHp`, `ac` (all integers, default 0)
- `campaigns` - Add `currentSceneId` (nullable UUID, FK to `scenes.id`, ON DELETE SET NULL)

**New:**
- `items` - Campaign-scoped items
- `character_inventory` - Junction table with quantity. FK `characterId` → `characters` (ON DELETE CASCADE). FK `itemId` → `items` (ON DELETE CASCADE). **Intentional:** deleting an item removes it from all character inventories automatically.
- `scenes` - Campaign locations

## 4. Data Models

### Updated Character Entity
```typescript
class Character {
  id: string;
  userId: string;
  campaignId: string;
  name: string;
  race?: string;
  class?: string;
  level: number;
  stats: Record<string, number>;  // { str, dex, con, int, wis, cha }
  currentHp: number;
  maxHp: number;
  ac: number;
  backstory?: string;
  isActive: boolean;
  inventory: CharacterInventory[];
  user: User;
  campaign: Campaign;
  messages: Message[];
}
```

### Character Stats Structure (JSON in `characters.stats`)
```json
{
  "str": 15,
  "dex": 14,
  "con": 13,
  "int": 12,
  "wis": 10,
  "cha": 8
}
```

### Derived Values (computed, not stored)
- Modifier: `floor((stat - 10) / 2)`
- Max HP: `classBaseHp + (conModifier * level)`
- AC: `10 + dexModifier`

### Class Base HP (static config)
- Fighter: 10
- Wizard: 6
- Rogue: 8
- Cleric: 8
- Ranger: 10
- Paladin: 10
- Barbarian: 12
- Bard: 8

### Item Entity
```typescript
class Item {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';  // reserved for future use
  stats: Record<string, any>;  // reserved for future use (equipable effects)
  metadata: Record<string, any>;  // reserved for future use (weight, value)
}
```

> **Note:** `rarity`, `stats`, and `metadata` are stored for future-proofing but have no MVP logic.

### Character Inventory Entity
```typescript
class CharacterInventory {
  id: string;
  characterId: string;
  itemId: string;
  quantity: number;  // must be >= 0
  item: Item;
}
```

**Constraint:** Unique index on `(characterId, itemId)` to prevent duplicate rows.

### Scene Entity
```typescript
class Scene {
  id: string;
  campaignId: string;
  name: string;
  description?: string;
  type: 'indoor' | 'outdoor' | 'dungeon' | 'town' | 'wilderness';
}
```

## 5. API Endpoints

### Items (DM only)
- `GET /campaigns/:id/items`
- `POST /campaigns/:id/items`
- `PATCH /items/:id` → Update item name/description/type. Returns 403 if caller is not campaign owner.
- `DELETE /items/:id`

### Inventory
- `GET /characters/:id/inventory`
- `POST /characters/:id/inventory` (body: { itemId, quantity }) → **adds** the specified quantity to the existing amount (delta). Validates that `itemId` exists and belongs to the same campaign as the character. `quantity` must be > 0.
- `PATCH /characters/:id/inventory/:itemId` (body: { quantity }) → **replaces** quantity with the provided value (absolute, not delta). Setting `quantity: 0` is equivalent to DELETE.
- `DELETE /characters/:id/inventory/:itemId` → removes item entirely

### Scenes (DM only for mutations)
- `GET /campaigns/:id/scenes`
- `POST /campaigns/:id/scenes`
- `PATCH /scenes/:id`
- `DELETE /scenes/:id`
- `POST /campaigns/:id/scenes/:sceneId/activate` → Sets `currentSceneId`. Returns 404 if scene does not exist or belongs to a different campaign. Returns 403 if caller is not campaign owner.

### Characters (enhanced)
- `POST /campaigns/:id/characters` → Create character (body from wizard)
  - **Limit:** One character per user per campaign total. If user already has any character in this campaign, return 409 Conflict.
  - Server **recalculates** `maxHp` and `ac` from stats + class; ignores client-provided values
  - Server sets `currentHp = maxHp` on creation
  - Validates `stats` contain exactly the 6 keys with Standard Array values
- `GET /characters/:id` → includes inventory with item details
- `PATCH /characters/:id` → Partial update with role-based field filtering
  - **Immutable for everyone:** `name`, `race`, `class`, `level`, `userId`, `campaignId`. Disallowed fields are **silently ignored** for all users (not 400 error).
  - **DM (campaign owner):** can update `stats`, `currentHp`, `maxHp`, `ac`, `backstory`. Changing `stats` triggers automatic recalculation of `maxHp` and `ac`. If `maxHp` is reduced below `currentHp`, `currentHp` is **clamped** to the new `maxHp`.
  - **Player (own character):** can only update `backstory` and `currentHp`. Any disallowed fields in the request body are **silently ignored** (not 400 error).
  - **Edge case:** If the request body contains **only** disallowed fields (e.g., a player sends `{ "stats": {...} }`), after filtering there are zero valid fields. Return **400 Bad Request** with message "No valid fields to update."
  - **Other players:** 403 Forbidden

### Campaign State (new)
- `GET /campaigns/:id/state` → returns `{ currentScene: Scene | null, myCharacter: Character | null }`
  - `currentScene`: the active scene for this campaign
  - `myCharacter`: the calling user's **active** character (`isActive = true`) in this campaign, **with inventory eager-loaded** (null if not joined or no active character)

## 6. DM Prompt Enhancement

The DM receives dynamic context injected into the **system prompt on each request** (not a static system prompt). The `DMService.buildPrompt(campaignId: string, sessionId: string)` method constructs this per-request, loading the current scene and active characters from the database using the provided `campaignId`.

```
--- CURRENT SCENE ---
Location: [scene name]
Description: [scene description]
Type: [scene type]

--- PARTY SUMMARY ---
[Character 1]: [Name], [Race or "Unknown"] [Class or "Unknown"] Lv[N], HP: [current]/[max], AC: [ac]
[Character 2]: ...
```

### Scene Transition Protocol
When the DM wants to change the scene, it includes:
```
[SCENE_CHANGE: <scene_id>]
```

The backend:
1. Parses this from the DM response using regex `\[SCENE_CHANGE:\s*([a-f0-9-]+)\]`
2. Validates the scene_id exists and belongs to the current campaign (DMService receives `campaignId` as a parameter from the calling `GameService` during message processing)
   - **If invalid / not found / different campaign:** Silently ignore the tag (do not change scene, but still strip it from the message). Log a warning.
3. Calls `CampaignsService` to validate scene belongs to campaign and update `campaign.currentSceneId`
4. Emits `scene_changed` event via WebSocket to all players in the room with payload `{ id, name, description, type }`
5. Strips the tag from **all three places:** the persisted message (saved to DB), the WebSocket broadcast payload, **and** the HTTP response returned to the requesting client

**Graceful fallback when `currentSceneId` is null:** The `--- CURRENT SCENE ---` block is omitted from the DM prompt entirely.

## 7. Character Creation Wizard (Frontend)

### Step 1: Basics
- Name (text, 2-50 chars)
- Race (select: Human, Elf, Dwarf, Halfling, Orc, Tiefling)
- Class (select: Fighter, Wizard, Rogue, Cleric, Ranger, Paladin, Barbarian, Bard)
- **Level is always 1** on creation (no level selection)

### Step 2: Stats
- Display 6 stats (STR, DEX, CON, INT, WIS, CHA) in a 2x3 grid
- Each stat has a dropdown with remaining values from the Standard Array pool
- Assigning a value removes it from the pool; changing a selection returns the previous value to the pool
- **Validation:** All 6 stats must have a unique value from {15,14,13,12,10,8}
- Show modifiers in real-time next to each stat
- Auto-calculate **HP** based on class base HP + CON modifier (client-side preview only; server recalculates on submit)
- Auto-calculate **AC** as `10 + DEX modifier` (client-side preview only; server recalculates on submit)

### Step 3: Backstory & Review
- Backstory textarea (optional, max 2000 chars)
- Review card showing all stats, modifiers, HP, AC
- Confirm button

## 8. Game UI Enhancements

### GamePlay.tsx additions:
- **Scene Panel** (top): Shows current scene name + description in a styled card
- **Character Sidebar** (collapsible):
  - If `myCharacter` exists: Shows HP/AC, stats, inventory quick-list (item name + quantity)
  - If `myCharacter` is null: Shows "Create Character" CTA button linking to `/campaigns/:id/characters/new`
- **Scene Change Animation**: When `scene_changed` event received, fade-in the new scene card

## 9. Validation Rules

### Character Stats
- Each stat must be an integer between 3 and 18 (inclusive)
- **Standard Array (creation only):** On `POST /campaigns/:id/characters`, stats must be exactly {15, 14, 13, 12, 10, 8} assigned to the 6 stats
- **DM updates:** On `PATCH /characters/:id`, DM can set any integer 3-18 per stat (not restricted to Standard Array)
- `currentHp`: integer, `0 <= currentHp <= maxHp`
- `maxHp`: integer, `> 0`
- `ac`: integer, `>= 0`
- `level`: integer, `>= 1`

### Inventory
- `quantity`: integer, `>= 0`
- Adding an existing item updates quantity (upsert via unique constraint)

### Character Creation
- `name`: 2-50 chars, required
- `race`: must be one of the allowed races enum
- `class`: must be one of the allowed classes enum
- `stats`: must contain exactly keys {str, dex, con, int, wis, cha} with values from Standard Array

### Items
- `name`: 1-100 chars, required
- `type`: must be one of the enum values

### Scenes
- `name`: 1-100 chars, required
- `type`: must be one of the enum values

## 10. Authorization Rules

- Only campaign owner (DM) can create/edit/delete items and scenes
- Players can only view items/scenes, manage their own character inventory
- DM can update any character's HP/stats during gameplay
- Players can update only their own character's backstory and currentHp via `PATCH /characters/:id`, and manage their own inventory via inventory endpoints

## 11. SQLite Compatibility Notes

All JSON columns use `json` type (not `jsonb`).
Default values for JSON: `'{}'` or `'[]'` as string literals.
No `timestamptz` - use standard TypeORM datetime.

## 12. Migration Strategy

**Development:** TypeORM `synchronize: true` handles schema changes automatically.

**Production:** A manual migration is required:
1. Add `currentHp`, `maxHp`, `ac` columns to `characters`
2. **Backfill existing characters:** For each existing character, compute `maxHp` and `ac` from their current `stats` + `class`, set `currentHp = maxHp`
3. Add `currentSceneId` column to `campaigns` (nullable, FK to `scenes`)
4. Create `items`, `character_inventory`, and `scenes` tables
5. **Backfill existing campaigns:** Run a one-time script to create default scenes and items for campaigns created before this deployment, and set their `currentSceneId` to the "Tavern" scene.

## 13. Seed Data

**Trigger:** Automatically run when a campaign is created (hook in `CampaignsService.create()`).

**Default scenes created:**
- "Tavern" (type: `indoor`, description: "A cozy tavern with a roaring fireplace...")
- "Town Square" (type: `town`, description: "The bustling center of town...")
- "Wilderness Camp" (type: `wilderness`, description: "A makeshift camp under the stars...")

**Initial scene:** `campaign.currentSceneId` is automatically set to the "Tavern" scene on campaign creation.

**Starting inventory:** New characters start with an empty inventory.

**Scene deletion:** When a scene is deleted, `campaign.currentSceneId` becomes NULL via `ON DELETE SET NULL`. The DM prompt omits the scene block, and the Game UI shows "No active scene" in the scene panel.

**Default items created:**
- "Health Potion" (type: `consumable`, description: "Restores health when consumed")
- "Rusty Dagger" (type: `weapon`, description: "An old but functional blade")
- "Leather Armor" (type: `armor`, description: "Basic protection")
- "Rations" (type: `misc`, description: "Food for one day")

## 14. Testing Strategy

### Backend Unit Tests
- **Stat calculations:**
  - Modifier formula: `floor((stat - 10) / 2)` for stats 3-18
  - Max HP formula: `classBaseHp + (conModifier * level)` for each class
  - AC formula: `10 + dexModifier`
- **Inventory CRUD:**
  - Adding item creates inventory row with correct quantity
  - Adding same item again updates quantity (upsert)
  - PATCH replaces quantity correctly
  - DELETE removes item from inventory
  - Quantity cannot go negative
- **Scene transitions:**
  - Valid `[SCENE_CHANGE: id]` updates campaign.currentSceneId
  - Invalid scene_id is silently ignored, tag stripped
  - Scene from different campaign is rejected
  - `scene_changed` event is broadcast to all room members

### Frontend Tests
- **Wizard navigation:** Step 1 → 2 → 3 → submit flow
- **Stat assignment:** Dropdowns disable used values, all stats must be filled before proceeding
- **Review card:** Displays correct modifiers, HP, AC based on selections

### Authorization Tests
- **Character PATCH:** Player cannot update another player's character; DM can update any character
- **Character PATCH:** Player cannot update `stats`, `maxHp`, `ac` (only `backstory` and `currentHp`)
- **Items/Scenes mutations:** Non-DM player receives 403 on POST/PATCH/DELETE
- **Inventory:** Player can only modify their own character's inventory

### Integration Tests
- **DM prompt:** Verify current scene + character summaries appear in the constructed prompt
- **Scene change flow:** DM response with tag → DB updated → WebSocket event received → UI updates
