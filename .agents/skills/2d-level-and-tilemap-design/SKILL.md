---
name: 2d-level-and-tilemap-design
description: Principles and workflows for 2D level design, spatial pacing, tilemap zoning, collision footprint mapping, pathing flow, and Points of Interest (POIs).
---

# 2D Level & Tilemap Design Skill

Adapted from the **Claude-Code-Game-Studios (CCGS)** level design department and top-down RPG layout standards. This skill guides the agent in structuring immersive, navigable, and technically sound 2D game maps.

---

## 1. Spatial Pacing & Landmark Architecture

### 1.1 The Rule of Thirds & Visual Landmarks
- **Visual Anchors**: Every district must feature at least one dominant, recognizable structure or landmark (e.g., Cầu Hóa An bridge, Tiệm Ngư Cụ Bác Ba, võ đường, tháp đồng hồ) visible from multiple vantage points.
- **Sightline Pacing**: Position major attractions so that as soon as one Point of Interest (POI) fades off-screen, the edge of the next POI enters the player's camera viewport.

### 1.2 Path Widths & Traffic Hierarchy
Prevent bottleneck congestion, especially in multiplayer games with active player avatars and vehicles:
- **Major Thoroughfares (Streets / Avenues)**: $\ge 4$ to $6$ tiles wide ($128\text{px} - 192\text{px}$). Accommodates two-way car/motorbike traffic plus sidewalks.
- **Secondary Paths (Market Alleys / Pier Boardwalks)**: $\ge 3$ tiles wide ($96\text{px}$). Allows two avatars to walk past each other without collision friction.
- **Intimate Trails (Garden paths / Mountain switchbacks)**: $2$ tiles wide ($64\text{px}$).
- **Water Channels**: $\ge 6$ to $8$ tiles wide between bridge piers to allow smooth ship navigation without clipping bank colliders.

---

## 2. Standard Tilemap Layering Hierarchy

Every top-down 2D map must adhere to this consistent layer stack (bottom to top):

| Layer Name | Type | Depth Range | Contents & Purpose |
|---|---|---|---|
| `Ground_Base` | Tile Layer | `-20` | Seamless terrain (grass meadow, river water basin, ocean floor). |
| `Ground_Paths` | Tile Layer | `-15` | Cobblestone roads, asphalt, sand shores, tilled garden soil. |
| `Ground_Deco` | Tile Layer | `-10` | Small flat props (pebbles, fallen leaves, sewer grates, road markings). |
| `Structures_Solid`| Object / Sprite | `Y + Height` | Building facades, tree trunks, market stalls, lampposts (Y-sorted). |
| `Canopy_Overhang`| Tile / Sprite | `+3000` | Tree crowns, roof eaves, bridge road decks (occludes avatars underneath). |
| `Colliders` | Object Layer | N/A (Hidden) | Physics collision boxes mapped 1:1 to server-side `BLOCKERS`. |
| `Zones_POIs` | Object Layer | N/A (Hidden) | Interaction circles/rectangles triggering HUD prompts and activities. |

---

## 3. Collision Box Footprints (The 2.5D Illusion)

### 3.1 The Footprint Collider Rule
In 2.5D top-down perspective, collision boxes must **never** cover the entire bounding rectangle of a building or tree!
- **Trees**: Collider is only a small rectangle at the base of the trunk ($16\text{px} \times 16\text{px}$). The avatar must be able to walk behind the leafy canopy.
- **Buildings**: Collider covers only the foundation base ($Y \approx 0.6 \times \text{Height}$ to $1.0 \times \text{Height}$). Avatars walking behind the rooftop must occlude realistically.
- **Water Shorelines**: Place collider 4px into the water, allowing the player's feet to slightly overlap the river bank edge for natural depth.

### 3.2 Smooth Corner Navigation
- Chamfer or bevel sharp $90^\circ$ alley corners with a 1-tile offset or angle to prevent moving avatars from getting stuck on single-pixel vertices.

---

## 4. POI Zoning & Interaction Design

1. **Trigger Radius Sizing**:
   - Small props (trash bin, mailbox): Radius $1.5$ to $2.0$ tiles ($\approx 48\text{px} - 64\text{px}$).
   - NPC Vendors / Stalls: Radius $2.5$ to $3.5$ tiles ($\approx 80\text{px} - 112\text{px}$).
   - Large Gates / Portals (Farm Gate, River Slipway): Radius $3.5$ to $5.0$ tiles.
2. **Clear Indicator Glyph**:
   - Provide visual affordance when the player steps inside the trigger zone:
     - Floating badge above object: `[E] Tương tác`.
     - HUD action bar prompt at the bottom of the screen.
3. **No Overlapping Trigger Polygons**:
   - Never place two distinct interaction POIs so close that their activation zones overlap, which causes confusing ambiguous inputs for the player.
