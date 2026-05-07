# Subproject 3: Image Generation

## Overview

Add AI-powered image generation to bring characters, items, and scenes to life. Images are generated on-demand and cached, serving as visual complements to the text-based gameplay.

## Goal

Every character, notable item, and scene can have a generated image. Images are created during character creation, item discovery, or scene transitions, enhancing immersion without disrupting the turn-based flow.

## Architecture

### Backend Additions

**New Modules:**

- **`ImageGenerationModule`** - Orchestrates image generation requests.
- **`ImageStorageService`** - Handles upload to cloud storage (S3/MinIO) and CDN delivery.
- **`ImageCacheService`** - Caches prompts and generated images to avoid redundant generation.

**Image Generation Flow:**

1. **Trigger:** Player creates character, DM describes a scene, or item is discovered.
2. **Prompt Engineering:** The backend constructs an optimized prompt from:
   - Entity type (character/scene/item)
   - Descriptive text (backstory, appearance, scene description)
   - Style prompt ("fantasy medieval art, digital painting, highly detailed")
   - Negative prompt ("modern, sci-fi, text, watermark")
3. **Generation:** Call image generation API (DALL-E 3, Midjourney API, or Stable Diffusion via Replicate/Local).
4. **Storage:** Save image to object storage, store URL in database.
5. **Broadcast:** Emit `image:generated` event to campaign room.
6. **Cache:** Store hash(prompt) → image_url in Redis (TTL 30 days).

**Database Additions:**

```sql
-- Images
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- character, scene, item, npc
  entity_id UUID NOT NULL, -- polymorphic reference
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_key TEXT, -- S3/MinIO path
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  metadata JSONB DEFAULT '{}', -- {model, seed, size, style}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add image_id to existing tables
ALTER TABLE characters ADD COLUMN portrait_image_id UUID REFERENCES images(id);
ALTER TABLE scenes ADD COLUMN scene_image_id UUID REFERENCES images(id);
ALTER TABLE items ADD COLUMN item_image_id UUID REFERENCES images(id);
ALTER TABLE npcs ADD COLUMN portrait_image_id UUID REFERENCES images(id);
```

**Configuration:**

- Image generation is async (don't block game flow).
- Show loading states in UI.
- Allow campaign owners to enable/disable image generation (cost control).
- Rate limiting: Max X images per session to control API costs.

### Frontend Additions

**New Components:**

- **`CharacterPortrait`** - Shows character image in sheet and game sidebar. Loading skeleton while generating.
- **`SceneBackground`** - Display scene image as subtle background or modal in game interface.
- **`ItemCard`** - Item with generated image in inventory.
- **`ImageGallery`** - Grid of all campaign images.
- **`GenerationQueue`** - Shows pending image generations with progress.

**UI Integration:**

- Character creation: Generate portrait after completing backstory (optional, button-triggered).
- Game interface: When DM describes a new scene, trigger scene image generation.
- Item discovery: When DM mentions a notable item, offer to generate image.
- NPC encounter: Generate NPC portrait on first meeting.

## Implementation Plan

### Phase 1: Infrastructure (2-3 days)
1. Set up image generation API integration (DALL-E 3 or Replicate)
2. Configure object storage (MinIO for dev, S3 for prod)
3. Create image generation queue (BullMQ with Redis)
4. Implement ImageStorageService
5. Add image database schema

### Phase 2: Backend Generation (3-4 days)
1. Build prompt engineering service for different entity types
2. Implement async image generation pipeline
3. Add image caching with Redis
4. Create WebSocket events for image status updates
5. Implement rate limiting and cost tracking

### Phase 3: Frontend Integration (3-4 days)
1. Build CharacterPortrait component
2. Add scene background image display
3. Create item cards with images
4. Implement generation queue UI
5. Add image gallery page

### Phase 4: Polish & Optimization (2 days)
1. Optimize prompts for consistent style
2. Add fallback images for failed generations
3. Implement image preloading
4. Add user preferences (style, quality)
5. Test with various entity descriptions

## Deliverables

- [ ] AI image generation for characters, scenes, items, NPCs
- [ ] Async generation queue with status tracking
- [ ] Image storage and CDN delivery
- [ ] Prompt caching to reduce costs
- [ ] Character portraits in game UI
- [ ] Scene background images
- [ ] Item images in inventory
- [ ] Campaign image gallery
- [ ] Cost controls and rate limiting

## Dependencies

- Completion of Subprojects 1 and 2
- Image generation API account (OpenAI, Replicate, etc.)
- Object storage (S3, MinIO, Cloudflare R2)

## Out of Scope

- Real-time video/animation generation
- Custom fine-tuned models
- Player-uploaded images (only AI-generated)
- 3D model generation
- In-painting or image editing
