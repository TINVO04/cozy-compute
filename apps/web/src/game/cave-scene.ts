import type Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import {
  CAVE_BLOCKERS,
  CAVE_GATE,
  CAVE_HEIGHT,
  CAVE_SHOP,
  CAVE_STAIRS,
  CAVE_WIDTH,
  caveNear,
  MARTIAL_SKILLS,
  type MartialEffect,
  type CaveEffect,
  type CaveSnapshot,
} from '@cozy/game-data';
import { WorldScene } from './scenes';
import { net } from './net';
import { useCave } from './cave-state';
import { useUi } from '../lib/store';
import { paintCaveWorld, CAVE_THEMES } from '../art/cave-world';
import { CavePresentation } from './cave-presentation';
import { MartialEffects } from './martial-effects';

export class CaveScene extends WorldScene {
  private ground!: Phaser.GameObjects.Container;
  private presentation!: CavePresentation;
  private lastFloor = -1;
  constructor() {
    super('cave');
  }
  protected worldSize() {
    return { width: CAVE_WIDTH, height: CAVE_HEIGHT };
  }
  protected blockers() {
    return CAVE_BLOCKERS;
  }
  protected matchesRoom(room: Room) {
    return room.name === 'cave';
  }

  protected buildWorld() {
    this.lastFloor = -1;
    useCave.getState().setSnapshot(null);
    this.ground = this.add.container(0, 0).setDepth(-20);
    this.presentation = new CavePresentation(this, () => {
      const self = this.layer?.self;
      return self ? { x: self.container.x, y: self.container.y, sprite: self.sprite } : null;
    });
    this.drawGround(0);
    const martial = new MartialEffects(this, (sid) => this.layer?.avatars.get(sid));
    const offMartial = net.onRoomMessage<MartialEffect>('cave:martial', (effect) => {
      martial.emit(effect);
      if (effect.phase === 'windup' && effect.sid)
        this.layer?.scriptedMove(
          effect.sid,
          effect,
          effect,
          MARTIAL_SKILLS.find((s) => s.id === effect.skill)!.windup,
        );
      if (effect.phase === 'dash' && effect.sid && effect.endX !== undefined && effect.endY !== undefined)
        this.layer?.scriptedMove(
          effect.sid,
          effect,
          { x: effect.endX, y: effect.endY },
          effect.duration ?? 240,
        );
    });
    const offState = net.onRoomMessage<CaveSnapshot>('cave:state', (state) => {
      useCave.getState().setSnapshot(state);
      if (this.lastFloor !== state.floor) {
        this.lastFloor = state.floor;
        this.drawGround(state.floor);
        useUi.getState().setPanel(null);
        useUi.getState().setRoom({
          kind: 'cave',
          label: state.floor ? `Hang Ngọc · Tầng ${state.floor}/5` : 'Cửa Hang Ngọc',
        });
        if (!useUi.getState().reducedMotion) this.cameras.main.fadeIn(400, 17, 22, 35);
      }
    });
    const offFx = net.onRoomMessage<CaveEffect>('cave:effect', (effect) => this.effect(effect));
    const offShop = net.onRoomMessage('cave:shop', () => useUi.getState().setPanel('cave-shop'));
    const offExit = net.onRoomMessage('cave:exit', () => {
      void net.goTown('cave');
    });
    const key = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        useUi.getState().panel ||
        useUi.getState().activity ||
        document.querySelector('.backdrop') ||
        (event.target instanceof HTMLElement &&
          (event.target.matches('input, textarea, select') || event.target.isContentEditable))
      )
        return;
      if (event.code === 'Space' || event.key.toLowerCase() === 'f') {
        if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
        event.preventDefault();
        net.send('cave:action', { action: 'attack' });
      }
      if (event.key.toLowerCase() === 'e') net.send('cave:action', { action: 'interact' });
      const skill = MARTIAL_SKILLS.find((s) => s.key === event.key);
      if (skill) {
        event.preventDefault();
        net.send('cave:action', { action: 'cast', skill: skill.id });
      }
    };
    window.addEventListener('keydown', key);
    this.events.once('shutdown', () => {
      this.presentation.destroy();
      offState();
      offFx();
      offMartial();
      offShop();
      offExit();
      window.removeEventListener('keydown', key);
      useCave.getState().setSnapshot(null);
    });
  }
  protected override onBind() {
    net.send('cave:sync', {});
  }

  private drawGround(floor: number) {
    this.ground.removeAll(true);
    const key = 'cave:world:v2:' + floor;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, paintCaveWorld(floor));
    this.ground.add(this.add.image(0, 0, key).setOrigin(0));
    const label = (x: number, y: number, text: string) =>
      this.ground.add(
        this.add
          .text(x, y, text, {
            fontFamily: 'sans-serif',
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ecdfbd',
            stroke: '#27373b',
            strokeThickness: 3,
            align: 'center',
          })
          .setOrigin(0.5),
      );
    label(480, 38, CAVE_THEMES[floor]!.name.toLocaleUpperCase('vi-VN'));
    if (!floor) {
      label(355, 291, 'TIỆM THỢ RÈN');
      label(798, 346, 'HANG NGỌC');
      label(120, 376, '← THỊ TRẤN');
    } else {
      label(112, 370, 'LỐI VỀ');
      label(832, 379, floor === 5 ? 'LỐI TRỞ VỀ' : 'ĐƯỜNG XUỐNG');
    }
  }

  protected override onSelfMove(x: number, y: number) {
    const state = useCave.getState().snapshot;
    if (!state) return;
    const p = { x, y };
    let prompt = state.floor
      ? 'F / Space: đánh quái · E: khai thác khi đứng gần quặng'
      : 'Đi tới tiệm thợ rèn hoặc cổng Hang Ngọc';
    if (x < 160) prompt = state.floor ? 'E · Trở về cửa hang và hồi máu' : 'E · Về thị trấn';
    else if (!state.floor && caveNear(p, CAVE_SHOP, 110)) prompt = 'E · Mua vũ khí / Bán tài nguyên';
    else if (!state.floor && caveNear(p, CAVE_GATE, 96)) prompt = 'E · Bắt đầu khám phá tầng 1';
    else if (state.floor && state.ores.some((o) => o.hp > 0 && caveNear(p, o, 66)))
      prompt = 'E · Khai thác quặng';
    else if (state.floor && caveNear(p, CAVE_STAIRS))
      prompt = state.cleared ? 'E · Đi tiếp qua cổng đã mở' : 'Hạ hết quái để mở cổng';
    if (useCave.getState().prompt !== prompt) useCave.getState().setPrompt(prompt);
  }

  override update(time: number, delta: number) {
    super.update(time, delta);
    const state = useCave.getState().snapshot;
    if (state && this.presentation) this.presentation.update(state, time, delta);
  }

  private effect(e: CaveEffect) {
    this.presentation.effect(e);
  }
}
