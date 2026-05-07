# Subproject 4: Auth & Monetization

## Overview

Add production-ready authentication, subscription tiers, payments, and campaign management limits. Transform the platform from a free tool into a sustainable product.

## Goal

Users can register with social login, subscribe to paid tiers, and access features based on their plan. Campaign creation and AI usage are gated by subscription level.

## Architecture

### Backend Additions

**New Modules:**

- **`OAuthModule`** - Social login integration (Google, Discord). Extends existing JWT auth.
- **`SubscriptionModule`** - Plan management, feature gating, and upgrade/downgrade logic.
- **`PaymentModule`** - Payment processing via Stripe. Handles subscriptions, invoices, and webhooks.
- **`BillingService`** - Tracks usage (AI tokens, image generations, campaign hours) for metering.
- **`QuotaService`** - Enforces plan limits in real-time.

**Extended Database Schema:**

```sql
-- Subscription Plans
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL, -- free, adventurer, legend
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly INT, -- cents
  price_yearly INT, -- cents
  stripe_price_id_monthly VARCHAR(100),
  stripe_price_id_yearly VARCHAR(100),
  features JSONB NOT NULL, -- {max_campaigns, max_players_per_campaign, ai_model, images_enabled, memory_sessions}
  is_active BOOLEAN DEFAULT true
);

-- User Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, canceled, past_due, trialing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth Connections
CREATE TABLE oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL, -- google, discord
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  UNIQUE(provider, provider_account_id)
);

-- Usage Tracking (for metering and limits)
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  resource_type VARCHAR(50) NOT NULL, -- llm_tokens, image_generation, session_minutes
  quantity INT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Feature Gating Logic:**

Middleware/interceptor pattern:

```typescript
// Before creating campaign
const plan = await this.subscriptionService.getUserPlan(userId);
const campaignCount = await this.campaignService.countUserCampaigns(userId);
if (campaignCount >= plan.features.max_campaigns) {
  throw new ForbiddenException('Campaign limit reached for your plan');
}

// Before image generation
if (!plan.features.images_enabled) {
  throw new ForbiddenException('Image generation requires Adventurer plan or higher');
}

// Before using advanced AI model
if (campaign.dm_model === 'gpt-4o' && plan.features.ai_model !== 'premium') {
  throw new ForbiddenException('This AI model requires a higher tier plan');
}
```

**Stripe Integration:**

- Checkout session for new subscriptions
- Customer portal for managing billing
- Webhooks for: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Graceful downgrade handling (existing campaigns remain, new ones blocked)

### Frontend Additions

**New Pages:**

- **`/pricing`** - Plan comparison table. Features, prices, and CTA buttons.
- **`/settings/billing`** - Manage subscription, update payment method, view invoices.
- **`/settings/account`** - Link social accounts, change password, delete account.
- **`/upgrade`** - Upsell page when hitting plan limits.

**Enhanced Components:**

- **`PlanBadge`** - Shows current plan in navbar.
- **`FeatureGate`** - Wrapper component that shows upgrade CTA for premium features.
- **`UsageMeter`** - Shows current usage vs plan limits.

**Plan Tiers (Example):**

| Feature | Free | Adventurer ($9.99/mo) | Legend ($19.99/mo) |
|---------|------|----------------------|-------------------|
| Max Campaigns | 1 | 5 | Unlimited |
| Max Players | 3 | 6 | 10 |
| AI Model | GPT-3.5 | GPT-4o | GPT-4o + Claude |
| Images | No | 50/mo | Unlimited |
| Memory | 3 sessions | 10 sessions | Unlimited |
| Custom DM Prompt | No | Yes | Yes |
| Priority Support | No | Email | Discord + Priority |

## Implementation Plan

### Phase 1: OAuth & Enhanced Auth (2-3 days)
1. Add Google OAuth integration
2. Add Discord OAuth integration
3. Implement account linking (multiple OAuth per user)
4. Add password reset flow
5. Update frontend login/register with social buttons

### Phase 2: Stripe & Payments (3-4 days)
1. Set up Stripe account and products
2. Implement checkout session creation
3. Build Stripe webhook handler
4. Create subscription lifecycle management
5. Add customer portal integration
6. Test payment flows (use Stripe test mode)

### Phase 3: Plans & Feature Gating (2-3 days)
1. Create plan configuration and seed data
2. Implement QuotaService for limit enforcement
3. Add plan checks to campaign creation
4. Add plan checks to AI usage
5. Add plan checks to image generation
6. Build middleware/interceptors for feature gating

### Phase 4: Frontend (2-3 days)
1. Build pricing page
2. Create billing settings page
3. Add plan badges and usage meters
4. Implement FeatureGate component
5. Build upgrade/upsell flows

### Phase 5: Analytics & Metering (2 days)
1. Implement usage tracking for all billable resources
2. Create usage dashboard for users
3. Add admin analytics panel
4. Set up alerts for unusual usage

## Deliverables

- [ ] Social login (Google, Discord)
- [ ] Subscription plans with feature gating
- [ ] Stripe payment processing
- [ ] Billing management portal
- [ ] Usage tracking and metering
- [ ] Plan upgrade/downgrade flows
- [ ] Campaign limits enforcement
- [ ] AI model access control
- [ ] Image generation quotas
- [ ] Admin analytics dashboard

## Dependencies

- Completion of Subprojects 1, 2, and 3
- Stripe account
- Google Cloud Console (OAuth credentials)
- Discord Developer Portal (OAuth credentials)

## Out of Scope

- Affiliate/referral system
- Team/organization plans
- Gift subscriptions
- In-app purchases (mobile)
- Cryptocurrency payments
- Usage-based billing (only tier-based for MVP)
