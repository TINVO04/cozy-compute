import Phaser from 'phaser';
import { createRoot } from 'react-dom/client';
import { MartialHud } from '../../src/screens/panels/MartialHud';
import { paintMartialHall, playMartialEffect } from '../../src/game/martial-art';
import { net } from '../../src/game/net';
import { useUi } from '../../src/lib/store';
import { Avatar } from '../../src/game/players';
import {
  DEFAULT_APPEARANCE,
  MARTIAL_SKILLS,
  type MartialSkillId,
  type MartialSnapshot,
} from '@cozy/game-data';

const handlers = new Map<string, (s: unknown) => void>();
const actions: unknown[] = [];
const state: MartialSnapshot = {
  now: 100000,
  fighters: [
    {
      sid: 'self',
      userId: 'self',
      name: 'Thanh Phong',
      weapon: 'crystal',
      learned: MARTIAL_SKILLS.map((s) => s.id),
      hp: 84,
      energy: 72,
      cooldowns: {},
      guardUntil: 0,
    },
    {
      sid: 'other',
      userId: 'other',
      name: 'Minh Nguyệt',
      weapon: 'iron',
      learned: ['slash'],
      hp: 68,
      energy: 85,
      cooldowns: {},
      guardUntil: 0,
    },
  ],
  match: null,
  invites: [],
  rankings: [{ userId: 'other', name: 'Minh Nguyệt', rating: 1048, wins: 3 }],
  result: '',
};
net.onRoomMessage = (type, handler) => {
  handlers.set(type, handler as (s: unknown) => void);
  return () => {
    handlers.delete(type);
  };
};
net.onRoom = () => () => false;
net.send = (type, msg) => {
  actions.push({ type, msg });
};
Object.assign(net, {
  room: { sessionId: 'self', state: { players: new Map([['self', { x: 168, y: 320 }]]) } },
});
useUi.setState({ room: { kind: 'martial', label: 'Đại hội Võ thuật' }, connection: 'online' });
class Preview extends Phaser.Scene {
  constructor() {
    super('preview');
  }
  create() {
    paintMartialHall(this);
    const self = new Avatar(this, 'self', 'Thanh Phong', DEFAULT_APPEARANCE, 410, 355, true);
    new Avatar(this, 'other', 'Minh Nguyệt', DEFAULT_APPEARANCE, 565, 355, false);
    this.cameras.main.setZoom(Math.min(this.scale.width / 960, this.scale.height / 720));
    this.cameras.main.centerOn(480, 360);
    Object.assign(window, {
      martialEffect: (id: MartialSkillId = 'wave') => {
        const spec = MARTIAL_SKILLS.find((s) => s.id === id)!;
        self.container.setPosition(410, 355);
        const e = { skill: id, sid: 'self', x: 410, y: 355, angle: 0 };
        if (spec.windup) playMartialEffect(this, { ...e, phase: 'windup' });
        this.time.delayedCall(spec.windup, () => {
          if (id === 'wave' || id === 'step') {
            playMartialEffect(this, { ...e, phase: 'dash', endX: 542, endY: 355, duration: 240 });
            this.tweens.add({ targets: self.container, x: 542, duration: 240 });
            this.time.delayedCall(240, () => playMartialEffect(this, { ...e, x: 542, phase: 'cast' }));
          } else playMartialEffect(this, { ...e, phase: 'cast' });
        });
      },
      martialScene: this,
    });
  }
}
new Phaser.Game({
  type: Phaser.CANVAS,
  pixelArt: true,
  roundPixels: true,
  width: window.innerWidth,
  height: window.innerHeight,
  audio: { noAudio: true },
  banner: false,
  scene: [Preview],
});
createRoot(document.getElementById('root')!).render(<MartialHud />);
const timer = window.setInterval(() => handlers.get('martial:state')?.(state), 100);
window.addEventListener('pagehide', () => clearInterval(timer));
Object.assign(window, { martialActions: actions });
