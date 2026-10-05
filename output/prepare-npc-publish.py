from pathlib import Path
import shutil
source = Path.cwd()
target = source.parent / 'cozy-town-life-publish'
files = ['packages/game-data/src/town-life.ts', 'packages/game-data/src/town-life.test.ts', 'apps/realtime/src/rooms/town-life.test.ts', 'apps/web/src/game/town-life.ts', 'apps/web/src/game/traffic.ts', 'apps/web/e2e/town-life.spec.ts', 'apps/web/e2e/fixtures/town-life.html', 'docs/design/town-life-assets.md']
for name in files:
    out = target / name
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, out)
vehicles = (source / 'packages/game-data/src/vehicles.ts').read_text(encoding='utf-8')
roads = vehicles[vehicles.index('/** Shared by road art'):vehicles.index('export const DEALER_DRIVEWAY')]
roads += vehicles[vehicles.index('export const onRoad'):vehicles.index('export const onDriveway')]
roads += vehicles[vehicles.index('export const INTERSECTIONS'):vehicles.index('export type TrafficViolation')]
roads += vehicles[vehicles.index('/** Entry across a stop line'):]
(target / 'packages/game-data/src/town-roads.ts').write_text("import type { Rect } from './map.js';\n\n" + roads, encoding='utf-8')
for name in ['packages/game-data/src/town-life.ts', 'packages/game-data/src/town-life.test.ts']:
    p = target / name
    p.write_text(p.read_text(encoding='utf-8').replace("'./vehicles.js'", "'./town-roads.js'"), encoding='utf-8')
p = target / 'packages/game-data/src/index.ts'
p.write_text(p.read_text(encoding='utf-8') + "\nexport * from './town-life.js';\nexport * from './town-roads.js';\n", encoding='utf-8')
p = target / 'apps/realtime/src/schema.ts'
s = p.read_text(encoding='utf-8')
current = (source / 'apps/realtime/src/schema.ts').read_text(encoding='utf-8')
actor = current[current.index('export class TownActorState'):current.index('export class RoomState')]
s = s.replace('export class RoomState extends Schema {', actor + "export class RoomState extends Schema {\n  @type({ map: TownActorState }) townActors = new MapSchema<TownActorState>();\n  @type('number') serverTime = 0;")
p.write_text(s, encoding='utf-8')
p = target / 'apps/realtime/src/rooms/town.ts'
s = p.read_text(encoding='utf-8')
current = (source / 'apps/realtime/src/rooms/town.ts').read_text(encoding='utf-8')
s = "import { TownLifeSimulation } from '@cozy/game-data';\nimport { TownActorState } from '../schema.js';\n" + s
life = current[current.index('  private townLife ='):current.index('  override maxClients')]
s = s.replace('  override maxClients', life + '  override maxClients', 1)
talk = current[current.index('    this.syncTownLife();', current.index('override onCreate')):current.index("    this.onMessage('vehicle:toggle'")]
s = s.replace("    this.state.kind = 'town';", "    this.state.kind = 'town';\n" + talk)
tick = '''  protected override tick(dtMs: number) {
    this.state.serverTime = Date.now();
    super.tick(dtMs);
    this.townLife.update(dtMs, this.state.serverTime, [...this.state.players.values()].filter(p => p.connected));
    this.syncTownLife();
  }

'''
s = s.replace('  protected override afterMove', tick + '  protected override afterMove', 1)
p.write_text(s, encoding='utf-8')
p = target / 'apps/web/src/game/scenes.ts'
s = p.read_text(encoding='utf-8')
s = "import { TownLifeLayer } from './town-life';\nimport { createTraffic } from './traffic';\nimport type { TownActor } from '@cozy/game-data';\n" + s
s = s.replace('export class TownScene extends WorldScene {', '''export class TownScene extends WorldScene {
  private townLife: TownLifeLayer | null = null;
  private offTownDialogue: (() => void) | null = null;
  private updateTraffic: (() => void) | null = null;''')
s = s.replace('    super.update(time, delta);\n    this.syncDockedBoat();', '''    super.update(time, delta);
    const actors = (net.room?.state as { townActors?: { values(): IterableIterator<TownActor> } } | undefined)?.townActors;
    this.townLife?.update(actors ? [...actors.values()] : [], time, delta);
    this.updateTraffic?.();
    this.syncDockedBoat();''', 1)
s = s.replace('    buildDetailedTown(this);', '''    buildDetailedTown(this);
    this.townLife = new TownLifeLayer(this, () => this.getSelfPos(), id => net.room?.send('town:talk', { id }));
    this.updateTraffic = createTraffic(this, () => (net.room?.state as { serverTime?: number } | undefined)?.serverTime ?? 0);''', 1)
s = s.replace("    this.events.once('shutdown', () => {\n      window.removeEventListener('keydown', onKey);", '''    this.events.once('shutdown', () => {
      this.offTownDialogue?.();
      this.offTownDialogue = null;
      this.townLife?.destroy();
      this.townLife = null;
      this.updateTraffic = null;
      window.removeEventListener('keydown', onKey);''', 1)
s = s.replace('  protected override onBind(room: Room) {\n    const $', '''  protected override onBind(room: Room) {
    this.offTownDialogue?.();
    this.offTownDialogue = room.onMessage('town:dialogue', (reply: { name: string; text: string }) => this.townLife?.dialogue(reply));
    const $''', 1)
p.write_text(s, encoding='utf-8')
print('Prepared isolated NPC changes.')
