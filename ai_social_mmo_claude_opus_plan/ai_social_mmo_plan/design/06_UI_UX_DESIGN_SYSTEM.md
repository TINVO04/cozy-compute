# UI/UX Design System

## Design direction

**Premium pixel-social MMO:** pixel-art world + modern, polished application chrome.

The visual target is not “old MMO UI”. It is a deliberately modern product that happens to use pixel/2D social-world art.

## Community references to study

### Habbo
Learn:
- room readability;
- avatar + furniture density;
- chat anchored to the world;
- compact room controls.

### Pixadom
Learn:
- 2D cozy social world;
- apartments as a main progression surface;
- event/leaderboard presentation;
- browser-first frictionless entry.

### Everskies
Learn:
- dense avatar/fashion browsing;
- social activity feed;
- item-centric commerce;
- creator-oriented UI.

### Highrise
Learn:
- event hub structure;
- reward visibility;
- fashion challenges;
- room discovery and social navigation.

Highrise has explicitly treated events as a central social hub and has been iterating on event UI cohesion in 2026. [Highrise event UX](https://highrise.game/news/event-ui-polish-and-pizzazz-2980)

Pixadom's current roadmap also places apartments, social features and UI improvements among the systems needed for a long-lived social MMO. [Pixadom roadmap](https://www.pixadom.com/roadmap)

Everskies currently supports community design submissions and a quality review flow, reinforcing the value of creator-centric UI. [Everskies design rules](https://support.everskies.com/en/articles/8996924-what-are-the-rules-for-submitting-a-design-on-everskies)

## Original visual system

### Canvas/world
- pixel-art characters and props;
- crisp nearest-neighbor asset scaling;
- limited particle density so the scene remains readable;
- subtle depth shadows;
- expressive emotes.

### UI chrome
Use modern 8px spacing system.

Suggested spacing tokens:
- 4, 8, 12, 16, 24, 32, 48

Suggested corner radius:
- 10px cards;
- 14px modal;
- 18px large feature panels;
- fully rounded pills only for tags/status.

### Typography
Use one highly legible UI sans family plus a pixel/display face only for small decorative headings.

Avoid using pixel fonts for body copy, prices, settings or dense tables.

### Color approach
Start with:
- warm near-white background;
- charcoal/dark ink;
- deep indigo/plum primary;
- mint/teal success accent;
- coral warning/reward accent;
- gold for premium/rare states.

Keep saturation controlled. Rare/reward colors should feel special because the baseline is restrained.

## Main screen layout

Desktop 1440x900 reference:

```text
+------------------------------------------------------------+
| Logo | Town | Events | Shop | Apartment | AI | Friends    |
+----------------------+-----------------------+-------------+
|                      |                       |             |
|                      |                       |  Friends    |
|      GAME WORLD      |   GAME WORLD / HUD    |  / Chat     |
|                      |                       |             |
|                      |                       |             |
+----------------------+-----------------------+-------------+
| Chat / Emotes | Quest | Coin | Fame | AI Credit | Profile |
+------------------------------------------------------------+
```

Do not literally copy this layout from an existing game. It is a structural blueprint.

## Key screens

### Town HUD
Show:
- Coin;
- Fame;
- AI Credit;
- current event;
- minimap/area label only when useful;
- chat/emote access;
- quick inventory.

### Shop
Needs:
- categories;
- item cards;
- rarity;
- owned state;
- preview;
- buy/equip;
- wishlist.

### Apartment editor
Needs:
- object inventory;
- placement grid;
- rotate;
- snap;
- undo/redo;
- room theme;
- publish/save.

### Event hub
Needs:
- countdown;
- rules;
- entry/join button;
- reward preview;
- participant count;
- recent winners;
- event history.

### AI Rewards
Needs a professional finance-style information hierarchy:

```text
AI REWARD BALANCE
$3.72 estimated quota

Available model passes
[ Creator Pro ] [ Vision Lite ] [ Chat Basic ]

Redeem
12,000 Coin -> $1 AI quota

Your keys
creator-pro-key-01   ACTIVE   $2.10 remaining
```

Never make the AI reward page look like a crypto dashboard.

### Connection detail
Use a clean technical-console aesthetic, not a neon hacker theme.

Include:
- Base URL;
- key masked by default;
- copy button;
- model list;
- quota/expiry;
- code examples;
- rotate/revoke;
- warning that the key is a secret.

## State requirements

Every screen must define:
- loading;
- empty;
- success;
- error;
- disabled;
- permission denied;
- offline/reconnect;
- optimistic update rollback where applicable.

## Interaction quality

- hover/pressed/focus states;
- keyboard navigation for non-game UI;
- no tiny click targets;
- tooltips for unfamiliar icons;
- toast notifications for async success/failure;
- modal confirmation for irreversible actions;
- motion reduced via user preference.

## Responsive behavior

Primary target: desktop browser 1280px+.

Support down to 1024px without overlapping panels.

Mobile web is secondary; keep architecture flexible but do not let mobile constraints degrade desktop UX in MVP.

## Art direction rule

References are used as visual research. Do not copy:
- logos;
- character sprites;
- exact item art;
- exact background art;
- exact UI screenshots;
- exact proprietary icons;
- trademarked visual identity.

Use the references to extract interaction principles and then build an original visual language.
