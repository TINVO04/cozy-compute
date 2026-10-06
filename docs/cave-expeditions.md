# Hang Ngọc

Walk east to the end of the main town road (tile rows 10–11). The town server grants a short-lived entry ticket after validating the player's position. Each player enters a private expedition with an outdoor blacksmith shop and five sequential cave floors.

- WASD/arrows: move. E: shop, gate, mining, stairs, or exit when nearby.
- F/Space or the attack button: sword attack, with a 450 ms server cooldown.
- Keys 1–8 or the skill bar: use dojo techniques learned by this character. Ownership comes from the same Redis set as the dojo. The server enforces energy, cooldowns, windup, direction and hit geometry. Equipped cave weapon damage scales offensive techniques. Guard reduces monster damage by 75%, healing restores up to 24 HP, and dash sweeps stop at cave walls. Returning to the entrance restores HP and energy.
- Red circles telegraph monster attacks for 650 ms. Move away to dodge.
- Clear every monster to open the next floor. Floor five contains a crystal golem.
- Mine stone, iron and crystal with three interactions per node. Defeated monsters also drop resources.
- Return to the entrance to heal and sell resources; defeat rescues the player without removing saved loot.
- The free training sword deals 12 damage. Iron costs 180 Coin and deals 22; crystal costs 650 and deals 36. Purchased upgrades equip immediately.
- Collected items sparkle, pop up, fly toward the player and display their name/quantity after the database confirms the grant. Combat includes sword arcs, enemy movement, hit flashes, damage numbers, defeat particles and sound. Reduced motion is respected.

Inventory and weapons persist in PostgreSQL through migration 0007_cave_expeditions.sql. The internal API performs purchases, sales and loot grants in locked transactions, with durable request IDs and ledger entries. Clients cannot submit rewards to this endpoint. Floor progress resets when a new expedition is created; loot and equipment persist. Pending grants retry with the original request ID during an API interruption, and stairs/retreat wait for the queue to finish.

Validation: realtime cave tests cover reach, cadence, mining depletion, stairs, rescue, trade serialization and retry identity; API cave tests cover unauthorized grants, concurrent replay, persistence and insufficient funds. Browser fixtures cover 720p, 900p and 1080p rendering. The live browser test starts at the normal town return spawn near the eastern exit, then uses keyboard movement for cave travel and shop/mining/combat/sale flow. Set CAVE_LIVE_TEST=1 to run it with an isolated API on port 8788 and realtime server on 2568. Full town-spawn-to-exit connectivity is checked separately in the game-data tests.

For a running installation, restart API/realtime with the new code; the API startup applies the migration automatically.
