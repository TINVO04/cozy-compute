---
name: pixel-art-studio
description: Standards, workflows, and aesthetic rules for crafting 2D pixel art sprites, animation cycles, palette locking, character equipment, and tile-aligned game assets.
---

# 2D Pixel Art Studio Skill

Adapted from the **Gamezxz/pixel-art-studio** framework and professional retro game aesthetic guidelines. This skill guides the agent in designing, constructing, critiquing, and animating 2D pixel art assets for characters, weapons, fauna, props, and tiles.

---

## 1. Golden Rules of Pixel Art

1. **Strict Grid Alignment (No "Mixels")**:
   - Every sprite in a scene must share the exact same pixel scale (pixel density).
   - Never mix a 2x-scaled sprite with a 1x-scaled sprite in the same visual layer.
   - Standard tile grid: $32\text{px} \times 32\text{px}$ (or $16\text{px} \times 16\text{px}$ for micro-props).

2. **Palette Locking & Color Ramps**:
   - Limit color count per asset to a tight, cohesive ramp (typically 3 to 5 shades per material: Highlight, Base, Shadow, Dark Outline).
   - Use hue shifting: Shadows shift cooler (blue/purple tones), highlights shift warmer (yellow/orange tones). Never shade simply by increasing black/white opacity.
   - Maintain global palette harmony across items so they feel like they belong in the same world.

3. **Clean Outlines & "Selout" (Selective Outlining)**:
   - Outer silhouette: Dark, crisp border defining the shape against any background terrain.
   - Internal details: Use dark tones of the local color instead of pure black lines to keep assets soft and readable.
   - Eliminate "jaggies": Diagonal lines must use consistent step ratios (e.g. 1-1-1-1 or 2-2-2-2), never uneven staircases (e.g. 1-2-1-3-2).

4. **Zero Orphan Noise**:
   - Avoid isolated single-pixel dots floating without purpose. Every pixel should be part of a deliberate cluster forming a stroke, highlight, or shadow rim.

---

## 2. Character & Equipment Standards (Chibi & LPC)

### 2.1 The 4-Direction Grid Convention
Characters and vehicles operate in 4 cardinal orientations:
- `0`: Down (facing screen / South)
- `1`: Up (facing away / North)
- `2`: Left (facing West)
- `3`: Right (facing East - often horizontally flipped from Left or with unique hand layering)

### 2.2 Layering Hierarchy for Wearables & Gear
When layering equipment onto player avatars:
```text
Back Layer:      Backpack / Slung Fishing Rod / Sheathed Sword / Two-Wheeler Body
Shadow:          Contact ground ellipse (hex 0x2a2438, alpha 0.25)
Base Body:       Legs -> Torso -> Arms -> Head & Skin
Clothing:        Pants/Skirts -> Shirt/Top -> Outer Cloak
Facial Gear:     Beard / Glasses / Face Accessory
Hair & Hat:      Hair strands -> Hat / Helmet / Headband
Handheld:        Active Held Item / Fish / Rod / Drawn Weapon (front or behind based on direction)
```

### 2.3 Attachment Anchors
- **Head Anchor**: Hats must align with the skull crown (typically $Y \approx -AVATAR\_FEET\_OFFSET$).
- **Back Anchor**: Slung fishing rods and sheathed swords tilt diagonally across the back torso ($\approx 35^\circ$ to $45^\circ$).
- **Hands Anchor**: Held fish or tools sit at hip/chest level when standing, bobbing 1px during walk animations.

---

## 3. Animation Timing & Frame Budgets

### 3.1 Standard Walk Cycles (4 to 6 frames)
- **4-Frame Walk**:
  - `Frame 0`: Contact left (left foot forward)
  - `Frame 1`: Passing neutral (torso rises 1px)
  - `Frame 2`: Contact right (right foot forward)
  - `Frame 3`: Passing neutral (torso rises 1px)
- **Timing**: $125\text{ms}$ to $160\text{ms}$ per frame ($6$ to $8\text{ FPS}$) produces a confident, grounded stride.

### 3.2 Idle Breathing & Water Bobbing
- **Breathing**: 2-frame subtle $1\text{px}$ vertical oscillation every $1200\text{ms}$ to $1800\text{ms}$.
- **Vessel Water Bobbing**:
  - Heave: $\sin(time \cdot \omega) \cdot 2.5\text{px}$.
  - Roll: $\sin(time \cdot \omega + \phi) \cdot 0.04\text{ rad}$.

### 3.3 Action Swings (Combat & Tools)
- `Anticipation` (1 frame): Weapon pulls back.
- `Smash / Swing` (1 frame): Extended arc with motion blur smear / slash streak.
- `Recovery` (2 frames): Settling back to idle stance.
