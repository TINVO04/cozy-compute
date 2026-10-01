# Visual QA Review: Final Three Species (Batch 10)

**Date & Time:** 2026-10-01 19:38 Asia/Saigon

**Review Type:** Visual QA & Matting Inspection (Post-installation)

**Reviewed Assets:**

- `D:/Game_Cua_Bao/apps/web/public/fish/sunfish_mola-render.webp`
- `D:/Game_Cua_Bao/apps/web/public/fish/cyber_koi-render.webp`
- `D:/Game_Cua_Bao/apps/web/public/fish/phoenix_tetra-render.webp`
- `D:/Game_Cua_Bao/output/fish-art/agy-collection.png` (Dark Board Preview, 29 installed species)
- Raw sources inspected: `sunfish_mola-reference-1.jpg`, `cyber_koi-reference-1.jpg`, `phoenix_tetra-reference-1.jpg`
- Reference anchors inspected: `swordfish-illustration.webp`, `guppy_rainbow-illustration.webp`, `golden_dragon_fish-illustration.webp`

---

## 1. Sunfish Mola (`sunfish_mola`) — Cá Mặt Trăng Ngơ Ngác

### Silhouette & Anatomy

- **Orientation:** Correct left-facing profile.
- **Tall Fins:** Both dorsal and anal fins are tall, elongated, and properly angled backward with authentic skin-covered fin-ray ridging.
- **Truncated Clavus:** Faithfully models the authentic _Mola mola_ pseudo-tail (clavus) instead of a standard caudal peduncle/fin. The rear edge features a thick, scalloped, ruffled margin with subtle rounded ossicles.
- **Head & Facial Expression:** Open circular mouth with fleshy lips, large bulbous glassy eye with prominent iris ring and heavy brow ridge, perfectly capturing the comedic, vacant "ngơ ngác" stare. Small rounded pectoral fin positioned vertically behind the gill opening.

### Material & Finish

- Sculpted leathery dermal texture with fine stippling, pores, and folds.
- Studio lighting from above creates soft silvery-blue highlights with subtle pearlescent lavender/cyan undertones on the belly.
- Dimensional volume matches the tactile quality of the three reference models.

### Matting & Transparency Quality

- **Alpha Masking:** Clean perimeter cut with zero truncation on the dorsal or ventral fin tips.
- **Chroma Extraction:** No trapped `#00FF00` green background remnants, even inside the open mouth aperture.
- **Dark Board Display:** Edges blend seamlessly on `#1a2332` dark card without haloing or harsh fringe.

### Issues / Notes

- None requiring re-generation. Silhouette is large and circular, which fills the square bounding box naturally and remains instantly recognizable at small UI sizes.

---

## 2. Cyber Koi (`cyber_koi`) — Cá Chép Cyberpunk 2077

### Silhouette & Anatomy

- **Orientation:** Correct left-facing swimming profile.
- **Carp Morphology:** Authentic cyprinid anatomy with elongated torpedo body, classic rounded head, downturned mouth, and delicate whisker barbels intact beneath the snout.
- **Cybernetic Integration:** Integrated glowing cyan PCB circuit patterns routed along the scale contours. A rectangular microchip/quantum processor is recessed into the operculum (gill cover) with trace connections entering the skull.
- **Fin Elements:** Dorsal, pectoral, pelvic, anal, and caudal fins exhibit luminous cyan fiber-optic striations aligned along individual fin rays.

### Material & Finish

- Polished metallic blue-silver finish with specular highlights on overlapping scale bevels.
- Luminous cyan circuits have bounded emissive glow without blowing out neighboring scales or creating diffuse muddy blur.

### Matting & Transparency Quality

- **Alpha Masking:** Fine whisker barbels are fully preserved without erosion or clipping.
- **Inter-fin Voids:** The negative space between pelvic and ventral fins has been cleanly removed with zero residual green spill.
- **Dark Board Display:** Vibrant high-contrast presence against the dark background card; circuit glows pop cleanly.

### Issues / Notes

- No functional or artistic defects. The design strikes an ideal balance between recognizable carp anatomy and sci-fi aesthetic.

---

## 3. Phoenix Tetra (`phoenix_tetra`) — Cá Neon Hỏa Phụng

### Silhouette & Anatomy

- **Orientation:** Correct left-facing profile.
- **Flame Fins:** Elaborate flowing dorsal, anal, and caudal fins sculpted into fiery plume shapes. Fin rays fan out into delicate translucent flame tips.
- **Tetra Morphology:** Compact, deep-bodied fish profile with prominent round obsidian-and-gold eye and upturned mouth. Retains distinct fish scale geometry rather than dissolving into abstract fire.

### Material & Finish

- Warm, saturated orange-red coloration with gradient shifts to bright golden-yellow flame highlights at the fin fringes.
- Finely textured scales with warm directional studio speculars that match the golden dragonfish reference.
- Translucent fin webbing allows the game canvas background to show through naturally.

### Matting & Transparency Quality

- **Alpha Masking:** High-complexity serrated flame tendrils are intact across all fin tips with zero harsh clipping.
- **Chroma Extraction:** No green spill or border halo around delicate fin tips.
- **Dark Board Display:** Spectacular warm illumination and contrast on dark card backgrounds.

### Issues / Notes

- Body shape is slightly deeper and rounder than a wild slender neon tetra (leaning toward a fancy tetra/betta hybrid silhouette), but this adds substantial visual weight and readable collectible presence at icon and card scales.

---

## 4. Collection Consistency & Dark Board Assessment (`agy-collection.png`)

- **Total Displayed Species:** 29 installed fish.
- **Cohesion:** All three new additions harmonize with the existing 26 species in lighting angle, scale finish, eye reflectivity, and rendered depth.
- **Color Balance:**
  - `cyber_koi` adds cool tech-metallic blue hues.
  - `phoenix_tetra` introduces a vibrant fiery-orange focal point.
  - `sunfish_mola` grounds the oceanic tier with realistic cool slate-grey tones.
- **Production Status:** Ready for use in game inventory, collection log, and catch preview panels.

---

## 5. Next Session Quota Schedule

- **Remaining Jobs:** 3 species (`ghost_shark`, `beluga_whale`, `narwhal`).
- **Provider Quota Reset (Estimate):** `00:30:16` on `2026-10-02 Asia/Saigon` (`2026-10-01T17:30:16Z`).
