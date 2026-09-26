/**
 * Multiplayer harness: registers N bot players, joins the town, walks them around and
 * checks every client converges on the same authoritative state.
 *   pnpm loadtest -- --clients 100 --seconds 30
 */
import { Client, type Room } from 'colyseus.js';

const args = process.argv.slice(2);
const arg = (name: string, fallback: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : fallback;
};
const CLIENTS = arg('clients', 20);
const SECONDS = arg('seconds', 15);
const API = process.env.VITE_API_URL ?? 'http://localhost:8787';
const WS = process.env.VITE_REALTIME_URL ?? 'ws://localhost:2567';

async function register(i: number, run: string): Promise<string> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `bot${i}-${run}@load.test`,
      password: 'loadtest-password',
      displayName: `bot${i}_${run}`.slice(0, 20),
    }),
  });
  if (!res.ok) throw new Error(`register ${i} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { token: string }).token;
}

interface PlayerLike {
  x: number;
  y: number;
}
type PlayersMap = {
  get: (k: string) => PlayerLike | undefined;
  forEach: (cb: (p: PlayerLike, k: string) => void) => void;
  size: number;
};

async function main() {
  const run = Date.now().toString(36).slice(-6);
  console.log(`registering ${CLIENTS} bots…`);
  const tokens: string[] = [];
  for (let i = 0; i < CLIENTS; i += 10) {
    tokens.push(
      ...(await Promise.all(
        Array.from({ length: Math.min(10, CLIENTS - i) }, (_, k) => register(i + k, run)),
      )),
    );
  }
  console.log('joining town…');
  const rooms: Room[] = [];
  const joinTimes: number[] = [];
  for (const token of tokens) {
    const started = Date.now();
    const room = await new Client(WS).joinOrCreate('town', { token });
    joinTimes.push(Date.now() - started);
    rooms.push(room);
  }
  const pings: number[] = [];
  rooms.forEach((room) => room.onMessage('pong', (m: { t: number }) => pings.push(Date.now() - m.t)));
  rooms.forEach((room) => room.onMessage('*', () => undefined));
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 0, y: 0 },
  ];
  let seq = 0;
  const until = Date.now() + SECONDS * 1000;
  console.log(`walking for ${SECONDS}s…`);
  while (Date.now() < until) {
    for (const room of rooms) {
      if (Math.random() < 0.3)
        room.send('input', { ...dirs[Math.floor(Math.random() * dirs.length)]!, seq: ++seq });
      if (Math.random() < 0.02) room.send('ping', { t: Date.now() });
      if (Math.random() < 0.005) room.send('chat', { text: 'beep boop' });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  rooms.forEach((room) => room.send('input', { x: 0, y: 0, seq: ++seq }));
  await new Promise((r) => setTimeout(r, 1500));

  // Convergence: every client should see the same positions for every player.
  const reference = (rooms[0]!.state as { players: PlayersMap }).players;
  let mismatches = 0;
  let seen = 0;
  for (const room of rooms) {
    const players = (room.state as { players: PlayersMap }).players;
    reference.forEach((p, sid) => {
      const other = players.get(sid);
      seen++;
      if (!other || Math.abs(other.x - p.x) > 0.5 || Math.abs(other.y - p.y) > 0.5) mismatches++;
    });
  }
  const sorted = [...pings].sort((a, b) => a - b);
  const q = (x: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * x))] ?? 0;
  console.log(
    JSON.stringify(
      {
        clients: CLIENTS,
        playersInRoom: reference.size,
        joinMsAvg: Math.round(joinTimes.reduce((a, b) => a + b, 0) / joinTimes.length),
        pingP50: q(0.5),
        pingP95: q(0.95),
        stateChecks: seen,
        desyncs: mismatches,
      },
      null,
      2,
    ),
  );
  await Promise.all(rooms.map((r) => r.leave()));
  if (mismatches > 0 || reference.size < CLIENTS) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
