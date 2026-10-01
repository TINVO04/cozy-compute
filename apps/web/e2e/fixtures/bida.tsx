import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { createStandard8BallRack } from '@cozy/game-data';
import { BidaArenaPanel } from '../../src/screens/panels/BidaArenaPanel';
import { net } from '../../src/game/net';
import type { Me } from '../../src/lib/api';
import { useUi } from '../../src/lib/store';
import '../../src/styles.css';

const callbacks = new Map<string, Set<(data: unknown) => void>>();
const sent: { type: string; data: unknown }[] = [];
const fakeRoom = {
  sessionId: 'host',
  reconnectionToken: 'fixture',
  onMessage(type: string, callback: (data: unknown) => void) {
    if (!callbacks.has(type)) callbacks.set(type, new Set());
    callbacks.get(type)!.add(callback);
    return () => callbacks.get(type)!.delete(callback);
  },
  onLeave() {},
};
net.room = fakeRoom as unknown as typeof net.room;
net.send = (type, data) => {
  sent.push({ type, data });
};
useUi.setState({ muted: true, reducedMotion: true });
const emit = (type: string, data: unknown) => callbacks.get(type)?.forEach((fn) => fn(data));
const match = {
  id: 'fixture-table',
  name: 'Online fixture',
  mode: '8ball',
  hostId: 'host',
  hostName: 'Host',
  guestId: 'guest',
  guestName: 'Guest',
  status: 'waiting',
  turn: 'host',
  score1: 0,
  score2: 0,
  balls: createStandard8BallRack(),
};
Object.assign(window, { bidaFixture: { sent, emit, match, net, fakeRoom, callbacks } });
function Fixture() {
  const [open, setOpen] = useState(true);
  return open ? (
    <BidaArenaPanel me={{ displayName: 'Host' } as Me} onClose={() => setOpen(false)} />
  ) : (
    <button onClick={() => setOpen(true)}>Mở lại</button>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
