# Subproject 2: Characters & Scenarios

## Overview

Expand the foundational engine with a comprehensive character system and rich scenario/scene management. This subproject transforms basic character sheets into fully-featured RPG characters and gives the DM tools to create immersive worlds.

## Goal

Players can create detailed characters with stats, skills, inventory, and backstories. The AI DM can describe and manage dynamic scenes, locations, and NPCs that persist within a campaign.

## Architecture

### Backend Additions

**New Modules:**

- **`SkillModule`** - Character skills and abilities system. Define skills per class, skill checks, proficiency bonuses.
- **`InventoryModule`** - Item management. Items have stats, descriptions, rarity, and can be equipped/used.
- **`SceneModule`** - Scene/location management. The DM can define and transition between scenes (tavern, dungeon, forest, etc.).
- **`NPCModule`** - Non-player character tracking. NPCs have names, personalities, relationships to players, and can appear across sessions.
- **`CharacterSheetService`** - Calculates derived stats (HP, AC, modifiers) from base stats, level, equipment, and buffs.

**Extended Database Schema:**

```sql
-- Skills
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  ability VARCHAR(20), -- str, dex, con, int, wis, cha
  category VARCHAR(50) -- combat, exploration, social, knowledge
);

-- Character Skills (proficiency levels)
CREATE TABLE character_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  proficiency VARCHAR(20) DEFAULT 'none', -- none, proficient, expert
  bonus INT DEFAULT 0,
  UNIQUE(character_id, skill_id)
);

-- Items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- weapon, armor, consumable, quest, misc
  rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  stats JSONB DEFAULT '{}', -- {damage, defense, healing, effects}
  metadata JSONB DEFAULT '{}' -- {weight, value, requirements}
);

-- Character Inventory
CREATE TABLE character_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  equipped BOOLEAN DEFAULT false,
  slot VARCHAR(50) -- head, body, weapon, offhand, etc.
);

-- Scenes/Locations
CREATE TABLE scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- indoor, outdoor, dungeon, town, wilderness
  ambiance TEXT, -- Mood description for the DM
  connections JSONB DEFAULT '[]', -- [{scene_id, description, locked, key_item_id}]
  metadata JSONB DEFAULT '{}' -- {lighting, weather, hazards}
);

-- NPCs
CREATE TABLE npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  race VARCHAR(50),
  occupation VARCHAR(100),
  personality TEXT,
  backstory TEXT,
  stats JSONB DEFAULT '{}',
  relationship_to_party TEXT, -- friendly, hostile, neutral, quest-related
  current_location UUID REFERENCES scenes(id),
  is_alive BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Campaign State (current scene, active quests, etc.)
CREATE TABLE campaign_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  current_scene_id UUID REFERENCES scenes(id),
  active_quests JSONB DEFAULT '[]',
  world_state JSONB DEFAULT '{}', -- {factions, events, time_of_day, weather}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**AI DM Enhancements:**

- The DM now receives: current scene description, present NPCs, party inventory, and active quests in the prompt.
- Scene transitions triggered by DM responses are parsed and saved (`[SCENE_CHANGE: scene_id]` format).
- NPC interactions are tracked and affect relationship scores.

### Frontend Additions

**New Pages/Components:**

- **`/campaigns/:id/characters/new`** - Step-by-step character wizard:
  1. Choose race and class
  2. Roll/point-buy stats (str, dex, con, int, wis, cha)
  3. Select skills and proficiencies
  4. Choose starting equipment
  5. Write backstory
  6. Final review and creation

- **`/campaigns/:id/characters/:characterId`** - Full character sheet:
  - Stats block with modifiers
  - Skills list with proficiency indicators
  - Inventory grid with equip/unequip
  - Backstory and notes
  - Level progression tracker

- **`/campaigns/:id/scenes`** - Scene browser for campaign owner/DM:
  - Map-like view of connected scenes
  - Create/edit scenes
  - Set current scene for active session

- **Game UI Enhancements:**
  - Scene description panel (appears when entering a new scene)
  - NPC encounter cards
  - Inventory quick-access in game sidebar
  - Dice roll results with animations
  - Character portrait placeholder

## Implementation Plan

### Phase 1: Character System (4-5 days)
1. Extend character schema with stats, skills, inventory
2. Build character creation wizard backend
3. Create skill and item seed data
4. Implement inventory management
5. Build character sheet frontend
6. Add character creation wizard UI

### Phase 2: Scenes & Locations (3-4 days)
1. Create scene management backend
2. Build scene transition logic in DM prompts
3. Implement campaign state tracking
4. Create scene browser/map UI
5. Add scene descriptions to game interface

### Phase 3: NPC System (3-4 days)
1. Create NPC CRUD backend
2. Integrate NPCs into DM context
3. Build NPC relationship tracking
4. Create NPC cards in game UI
5. Add NPC encounter handling

### Phase 4: Integration & Polish (2-3 days)
1. Connect all systems in game flow
2. Test complex interactions (combat, inventory, scene changes)
3. Balance default skill/item data
4. Performance optimization
5. Update documentation

## Deliverables

- [ ] Detailed character creation with stats, skills, inventory
- [ ] Full character sheet view
- [ ] Item and equipment system
- [ ] Scene/location management
- [ ] NPC tracking and relationships
- [ ] Enhanced AI DM with scene and NPC awareness
- [ ] Campaign state persistence
- [ ] Dice rolling system with modifiers

## Dependencies

- Completion of Subproject 1
- Balanced game data (skills, items, races, classes)

## Out of Scope

- Image generation for characters/items (Subproject 3)
- Combat automation (manual DM adjudication)
- Character progression/leveling automation
- Audio/ambient sounds for scenes
