# Fish rendered asset direction

The swordfish, rainbow guppy and golden dragon fish are the quality references. All collectibles need the same dimensional rendering: sculpted volume, detailed surface materials, glossy eyes and delicate fin structure. Smooth contours and gradients alone do not meet this target. Each species keeps its own anatomy and fictional identity.

## Shared visual rules

- Transparent backgrounds with the complete subject inside the image.
- Refined materials appropriate to the animal: scales, skin, rubber or leather.
- Readable silhouette and controlled highlights at thumbnail size.
- One source for icons, the compendium, admin previews, trophies and held fish in Phaser.
- Preserve image aspect ratio and use linear sampling for rendered fish. The town retains its pixel rendering.
- Keep the three original reference designs intact.

## Legendary collection

All 11 legendary collectibles now have rendered bitmap assets. Golden Dragon Fish retains its existing artwork; the other ten have enhanced individual prompts in [fish-render-prompts.json](fish-render-prompts.json). Each combines a distinctive silhouette, detailed materials and one thematic signature. Avoid giving every animal the same gold tint or crown.

| Species               | Individual direction                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Killer whale          | Sculptural dorsal silhouette, obsidian reflections and pearl-white markings; a quiet regal presence. |
| Humpback whale        | Sweeping long flippers and pearl-blue throat grooves expressing its singing identity.                |
| Blue whale            | Glacial cobalt materials, monumental proportions and a compact blowhole spray.                       |
| Great white shark     | Silver skin, tooth detail and a small kelp strand reflecting its vegetarian character.               |
| Manta ray             | Midnight-blue wings with embedded bronze arabesque patterns, evoking a living magic carpet.          |
| Giant squid           | Crimson mantle, copper accents and individually modeled rows of suction cups.                        |
| Crypto whale          | Inset gold coin and emerald/ruby candlestick markings integrated into its flank.                     |
| Abyssal kraken        | Amethyst mantle, readable curling arms and bioluminescent sucker rings.                              |
| Golden dragon fish    | Preserve the original rendered golden dragon artwork.                                                |
| Rubber duck leviathan | Glossy golden rubber, a small crown and a bounded sculptural halo.                                   |
| Landlord pike         | Emerald scales with gold edging and the tall dark fedora from its actual game description.           |

These signatures are prompt requirements, not a claim that anatomy or every generated detail has passed visual review. The screenshot at output/fish-art/legendary-gallery.png and individual WebP files provide reviewable results. Browser checks verify shared asset use, transparency and complete preview bounds.

## Asset pipeline and current completion

The catalog contains 63 collectibles: 55 original species plus eight higher-tier variants. Dedicated rendered bitmap coverage is 63/63: the three preserved style references plus 60 generated images. All 11 legendary species and all eight higher-tier variants have individual artwork. Every original species and variant has dedicated bitmap art. The Canvas fallback remains only for loading and asset-request failures; it is no longer the normal artwork for any collectible.

The shared loader in apps/web/src/art/fish-assets.ts refreshes subscribers as images arrive. Canvas caches include each species revision, so a loading fallback cannot become permanent. Admin previews, backpack icons, trophy canvases and held fish use the same source with its actual aspect ratio. Rendered world textures use linear sampling; town pixel art retains its existing sampling.

The user chose gemini-3.1-flash-image through the local OpenAI-compatible gateway. Direct HTTP with image/text modalities was used for the initial generation because the skill's GPT Image CLI does not support the requested Gemini model. The continuation uses AGY's built-in generate_image tool with all three reference images as ImagePaths. The chat model is Gemini 3.8 Flash (High); the image model is identified by the tool's error metadata. Credentials remain process-local and are never installed in game code.

Raw sources are preserved under output/imagegen/gemini-test/, legendary/, collection/ and agy-session/. Exact prompts are in fish-render-prompts.json and output/imagegen/agy-session/actual-image-prompts.json. The installer output/imagegen/gemini-test/install-rendered-fish.py removes the green backdrop, clears tiny matte specks, preserves muted interior skin colors, fits the complete silhouette within 720 pixels and adds 24 pixels of transparent padding per side. Final optimized WebPs live under apps/web/public/fish/. The asset report records source dimensions, silhouette bounds and final sizes.

Earlier visual review found green spill in the anglerfish lure, lionfish fin membranes and some barracuda tooth roots. Targeted reproducible cleanup in the installer preserves their fine anatomy. The first 13 AGY assets passed the final dark-background review recorded in output/imagegen/agy-session/visual-review.md. The latest continuation review is recorded separately; generation success and passing pixel/bounds checks alone do not imply visual approval.

## Higher-tier variants

The rarity order is Legendary (legendary), Nghich Thien (defiant), then Chi Ton (sovereign). Vietnamese display labels are defined in the shared game catalog. Each variant has a separate collectible ID and variantOf link to its parent; every variant now has its own rendered bitmap.

| Variant              | Art direction                                                         |
| -------------------- | --------------------------------------------------------------------- |
| office_carp_ceo      | Copper carp, oversized silk tie, briefcase and crooked crown.         |
| pufferfish_gym       | Golden puffer with muscular fins, coral dumbbell and tiny tail.       |
| catfish_noodle       | Slate catfish, inverted noodle-bowl hat and chopstick whiskers.       |
| disco_trout_diva     | Lavender trout, curly wig, star glasses, microphone and feather boa.  |
| swordfish_void       | Obsidian bill, starfield scales, amethyst fins and violet void orbit. |
| golden_dragon_astral | Platinum-gold armor, sapphire star core and celestial fin ribbons.    |
| koi_storm            | Cobalt scales, electric engravings and narrow lightning sigil rings.  |
| kraken_eclipse       | Black jade mantle, ember suckers and copper eclipse ring.             |

Relative catch weights are 0.24-0.28 for defiant and 0.045-0.07 for sovereign, below legendary weights. Existing rod bonuses support both tiers. Tests verify sovereign remains rarer than defiant, which remains rarer than legendary. Rewards, inventory selection, daily soft caps and escape rolls remain server-authoritative. CSS glows and world effects distinguish the tiers; reduced-motion preferences disable animation while preserving static visibility.

The final variant board is output/fish-art/higher-tiers.png. The historical higher-tiers-pending.png depicts the earlier parent-art fallbacks; it is not a preview of the final designs. The current browser gallery is higher-tiers-gallery.png.

## Earlier generation runs

The resumed AGY session on 2026-10-01 successfully generated 13 new assets: all eight variants plus electric_eel, arowana_dragon, sturgeon, catfish_giant and alligator_gar. All 13 are installed. AGY has produced 26 saved assets across its sessions; continuation bookkeeping excludes the initial Betta, so completed_jobs_count is 25 of 31 with six remaining.

The subsequent sunfish_mola request returned HTTP 429 RESOURCE_EXHAUSTED / QUOTA_EXHAUSTED for gemini-3.1-flash-image at approximately 19:10 Asia/Saigon. Raw error metadata estimates reset at 2026-10-01T17:02:01Z, or 00:02:01 on 2026-10-02 Asia/Saigon. This is a provider estimate, not a guaranteed recovery time. No retries or account/model switches were made after this error. Sanitized metadata is in output/imagegen/agy-session/quota-recheck.json.

Full production prompts are preserved in docs/fish-render-prompts.json. The account-switch continuations below completed the remaining queue; earlier quota-reset timestamps describe historical errors, not current pending work.

The continuation's final AGY visual review passed all 13 new assets after a targeted alpha cleanup removed a trapped backdrop triangle between the left tentacle arches of kraken_eclipse. The cleanup is reproducible in the installer and preserves the jade mantle and tentacle edges. Project format, lint, typecheck and unit-test gates passed; all 13 fish-art/fishing browser scenarios passed. Four asset-content and framing scenarios passed again after the Kraken cleanup.

## Anatomy references

- [Swordfish](https://en.wikipedia.org/wiki/Swordfish): long pointed bill; preserve the complete tip.
- [Manta ray](https://en.wikipedia.org/wiki/Manta_ray): triangular wings and forward-facing cephalic lobes.
- [Axolotl](https://en.wikipedia.org/wiki/Axolotl): branching external gills and four limbs.
- [Humpback whale](https://en.wikipedia.org/wiki/Humpback_whale): long pectoral fins and head tubercles.

References inform anatomy; no third-party artwork was reused. Fictional details originate from the game's species descriptions.

## Latest account-switch continuation

After the user switched the AGY account at approximately 19:30 Asia/Saigon on 2026-10-01, three additional image requests succeeded: sunfish_mola, cyber_koi and phoenix_tetra. Their dedicated transparent WebPs are installed and registered with actual dimensions. AGY now has 29 saved outputs across sessions, including the initial Betta; continuation bookkeeping is 28/31 with three remaining. The exact four tool calls from session 4663bf24-a822-438a-8da1-31cdacfd49a3 are preserved in actual-image-prompts.json.

The fourth request, ghost_shark, returned HTTP 429 RESOURCE_EXHAUSTED / QUOTA_EXHAUSTED for gemini-3.1-flash-image. The verified raw error estimates reset at 2026-10-01T17:30:16Z, or 00:30:16 on 2026-10-02 Asia/Saigon. This remains a provider estimate. No additional image-generation calls were sent after the error. At that point, pending jobs were ghost_shark, beluga_whale and narwhal. They were completed in the subsequent account-switch continuation below.

The three new assets passed AGY visual review against the raw sources, the style anchors and the rebuilt dark board, recorded in output/imagegen/agy-session/visual-review-final-three.md. No matting correction was required. The phoenix tetra has a deeper fantasy silhouette than a wild neon tetra, which the review accepts as a collectible interpretation. Lint, typecheck, unit tests and all eight fish-art browser scenarios passed after integration.

## Catalog completion

After the next user-controlled account switch, ghost_shark, beluga_whale and narwhal were successfully generated in AGY session 53dc7599-7bb4-4812-a8ee-9d9e0edfcdfd. All three dedicated transparent WebPs are installed with actual aspect ratios. Coverage is now 63/63, including all 55 originals and eight higher-tier variants; pending_species and remaining-jobs.json are empty. AGY has 32 saved raw outputs, comprising the initial Betta plus all 31 continuation jobs. The final calls use the same three real style references and gemini-3.1-flash-image route.

The fish-art browser regression now requires a dedicated registered bitmap for every catalog species, preventing a new or removed asset from silently reverting to Canvas-only artwork. Loading/error fallbacks remain tested separately.

The final three species passed AGY visual inspection of the installed cutouts, original generated frames, reference anchors and dark collection board. No additional alpha correction was required; narwhal retains its complete spiral tusk and ghost shark retains its spectral anatomy. Findings are recorded in output/imagegen/agy-session/visual-review-last-species.md. All eight fish-art browser scenarios passed with full 63-species bitmap coverage.

Final quality gates passed in an isolated checkout containing the fish changes: format, lint, typecheck and the complete unit suite (129 tests). The shared working directory also passed lint/typecheck and all eight fish-art browser scenarios. Its initial full-unit run failed two university-layout tests because an independent room redesign was being edited concurrently; those unrelated files were excluded from the validated fish changes. Checkout CRLF line endings were normalized to LF for the format gate.
