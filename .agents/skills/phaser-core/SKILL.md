---
name: phaser-core
description: Standards and patterns for Phaser 3 2D game engine development, scene lifecycles, asset pipelines, camera controls, display depth sorting, and rendering performance.
---

# Phaser 3 Core Game Engine Skill

Adapted from the **awesome-gamedev-agent-skills** ecosystem (1,400+ ⭐). This skill provides specialized guidance for architecting, optimizing, and maintaining 2D game clients built with **Phaser 3**, WebGL/Canvas rendering, and responsive viewports.

---

## 1. Scene Architecture & Lifecycle Management

### 1.1 The Standard Scene Lifecycle
Always respect Phaser's lifecycle phases:
- **`init(data)`**: Receive parameters from other scenes, initialize internal state flags.
- **`preload()`**: Queue textures, audio, tilemaps, and spritesheets. Use cache guards (`if (this.textures.exists(key)) return;`) to avoid redundant reloads.
- **`create()`**: Instantiate game objects, containers, cameras, physics colliders, and event listeners.
- **`update(time, delta)`**: Frame tick logic.
  - Keep `update()` lightweight. Never allocate new objects, arrays, or anonymous closures inside `update()` to avoid Garbage Collection (GC) pauses.
  - Scale all movement calculations by `delta / 1000` or use fixed-step logic.

### 1.2 Memory Leak Prevention & Scene Teardown
When switching scenes or destroying dynamic entities:
- Always call `.destroy(true)` on containers and sprites when unmounting or removing.
- Clean up window/DOM event listeners:
  ```typescript
  // In create():
  const onKeyDown = (e: KeyboardEvent) => this.handleKey(e);
  window.addEventListener('keydown', onKeyDown);
  
  // In scene shutdown/destroy:
  this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('keydown', onKeyDown);
    this.tweens.killAll();
    this.time.removeAllEvents();
  });
  ```

---

## 2. 2D Rendering & Spatial Depth Sorting (Y-Sorting)

### 2.1 The 2.5D Isometric/Top-Down Depth Rule
In top-down 2D worlds, objects lower on the screen (larger Y) must render in front of objects higher on the screen:
```typescript
// For dynamic entities (players, NPCs, walking animals):
entity.container.setDepth(entity.container.y);

// For static structures with anchor (0.5, 1.0):
building.setDepth(building.y);

// Fixed layers:
// Background/Ground tiles: depth -100 to -10
// Pathways/Fences:         depth -9 to -1
// Dynamic World Layer:     depth = y (0 to mapHeight)
// Overheads/Bridge Decks:  depth = mapHeight + 100
// UI & In-world Badges:    depth = mapHeight + 500
```

### 2.2 Pixel-Perfect Rendering Settings
Ensure the game configuration enforces nearest-neighbor scaling:
```typescript
{
  type: Phaser.AUTO,
  pixelArt: true,
  roundPixels: true,
  render: {
    antialias: false,
    antialiasGL: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  }
}
```

---

## 3. Camera Controls & Viewport Geometry

- **Smooth Player Tracking (Lerp & Deadzone)**:
  ```typescript
  this.cameras.main.startFollow(playerContainer, true, 0.08, 0.08);
  this.cameras.main.setDeadzone(40, 30);
  this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
  ```
- **Responsive Zooming**:
  Clamp zoom levels between `0.75x` and `2.0x` with fractional increments (`±0.15`), rounding pixel positions to prevent sprite tearing.
- **Shake & Flash (Game Juice)**:
  Use lightweight camera effects for impacts:
  ```typescript
  this.cameras.main.shake(120, 0.005);
  ```

---

## 4. Object Pooling & Performance Best Practices

1. **Particle & Wake Spawning**:
   - For footprints, water wakes, and ambient dust, recycle graphics or pool sprite instances rather than creating and destroying hundreds of objects per second.
2. **Offscreen Culling**:
   - In large maps, avoid running tweens or pathfinding on NPCs that are outside the camera view frustum plus a 2-tile margin.
3. **Texture Atlas Utilization**:
   - Combine small individual item icons, emote icons, and UI glyphs into single texture atlases to minimize WebGL draw calls.
4. **Interactive Hit Areas**:
   - Use dedicated invisible `Phaser.GameObjects.Zone` objects for click/hover hitboxes instead of complex polygons.
