# Core Gameplay Design

## MVP world

A compact 2D town with:

- Central Plaza
- Cafe / social job hub
- Fishing pier
- Delivery station
- Fashion shop
- Furniture shop
- Apartment building
- Event board
- AI Rewards kiosk

Do not build an open world for MVP.

## Movement

- top-down/isometric-feeling 2D room navigation;
- keyboard + mouse first;
- click-to-move optional later;
- server authoritative position and room membership;
- client interpolation for smoothness;
- emotes do not require server physics.

## Three MVP activities

### Fishing
Short 20–60 second interaction loop. Server rolls catch result. Reward depends on skill timing, collection target and optional daily bonus.

### Delivery
Take an order, route through a compact town, deliver before timer. Failure never destroys inventory. Reward is deterministic + small performance bonus.

### Social event
5–20 players. Examples: Worst Outfit, Furniture Panic, Find the Duck, Delivery Dash, Guess the NPC.

## Non-combat progression

- Coin
- Fame
- Collection sets
- Apartment score
- Fashion score
- Event badges
- creator reputation
- AI Credit eligibility

## Humor systems

Item rarity names can be funny but should remain readable:

- Common: “Questionable”
- Rare: “Why Do You Own This?”
- Epic: “Unreasonably Expensive”
- Legendary: “I Regret Everything”

Achievement examples:

- “Professional Procrastinator”
- “Landlord’s Favorite Tenant”
- “Dress Like You Owe Money”
- “Built a House With No Plan”

## Social surfaces

- overhead display name + optional status/title;
- chat bubble;
- emote wheel;
- friend list;
- room visitors;
- apartment guestbook;
- event lobby;
- player card;
- report/mute/block.

## AI reward is not earned by raw playtime alone

Redemption eligibility should require a mix of:

- account age;
- completed onboarding;
- minimum unique activities played;
- anti-bot trust score;
- Fame threshold;
- cooldown between redemptions.

Never reward an account only for idle time or repetitive single-click behavior.
