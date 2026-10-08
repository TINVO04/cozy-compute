// ============================================================================
// File: apps/web/src/game/river-vessel-traffic.ts
// Exquisite Sông Đồng Nai River Vessel Traffic Renderer
// Features: Ghe Tam Bản, Xà Lan Chở Cát, Ca Nô Cao Tốc, Tàu Đánh Cá
// with fine wood grain, layered shading, V-shaped water wakes, and navigation lights.
// ============================================================================

import type Phaser from 'phaser';
import { oceanRiverVessels, type RiverVessel } from '@cozy/game-data';
import { useUi } from '../lib/store';
import { calculateBienHoaLighting } from './weather-engine';

export class RiverVesselTraffic {
  private graphics: Phaser.GameObjects.Graphics;
  private lights: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, _sceneKind: 'ocean') {
    // Set depth: in water above riverbed (-10), below bridge deck (1100 / 2600)
    const baseDepth = 380;
    this.graphics = scene.add.graphics().setName('river:vessels').setDepth(baseDepth);
    this.lights = scene.add
      .graphics()
      .setName('river:vessel-lights')
      .setDepth(baseDepth + 2);
  }

  update(now: number) {
    const g = this.graphics.clear();
    const l = this.lights.clear();
    const ui = useUi.getState();
    const brightness = calculateBienHoaLighting(ui.weather.solarHour, ui.weather).lampBrightness;
    const isNight = brightness > 0.08;

    const vessels: RiverVessel[] = oceanRiverVessels(now);

    for (const v of vessels) {
      // Gentle bobbing heave on river water
      const heave = ui.reducedMotion ? 0 : Math.sin(now / 480 + v.length) * 1.5;
      const x = Math.round(v.x);
      const y = Math.round(v.y + heave);
      const dir = v.dirX;

      // 1. Water Wake & Bow Wave (Vệt rẽ sóng nước & bọt bèo)
      this.drawVesselWake(g, x, y, v, dir, now);

      // 2. Render Specific Handcrafted Vessel Body
      switch (v.kind) {
        case 'sampan':
          this.drawSampan(g, l, x, y, v, dir, isNight, brightness);
          break;
        case 'barge':
          this.drawBarge(g, l, x, y, v, dir, isNight, brightness, now);
          break;
        case 'cutter':
          this.drawCutter(g, l, x, y, v, dir, isNight, brightness);
          break;
        case 'trawler':
          this.drawTrawler(g, l, x, y, v, dir, isNight, brightness);
          break;
      }
    }
  }

  private drawVesselWake(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    v: RiverVessel,
    dir: number,
    now: number,
  ) {
    const pulse = Math.sin(now / 220) * 1.5;
    const sternX = x - (dir * v.length) / 2;
    const bowX = x + (dir * v.length) / 2;
    const wakeLen = v.length * 1.6;

    // Soft water contact shadow under hull
    g.fillStyle(0x064e3b, 0.45);
    g.fillEllipse(x, y + 2, v.length + 6, v.width + 4);

    // Dynamic churning foam spray behind stern (bọt nước chân vịt / mái chèo)
    g.fillStyle(0xd1fae5, 0.42);
    g.fillEllipse(sternX - dir * 12, y, 20 + pulse, v.width * 0.75);

    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(sternX - dir * 6, y, 12, v.width * 0.45);

    // V-shaped trailing bow ripple wake (vệt rẽ sóng chữ V đôi)
    g.lineStyle(1.6, 0xa7f3d0, 0.38);
    g.beginPath();
    g.moveTo(bowX - dir * 4, y);
    g.lineTo(sternX - dir * wakeLen, y - v.width * 0.85);
    g.moveTo(bowX - dir * 4, y);
    g.lineTo(sternX - dir * wakeLen, y + v.width * 0.85);
    g.strokePath();

    // Secondary subtle outer ripple
    g.lineStyle(1.0, 0x6ee7b7, 0.22);
    g.beginPath();
    g.moveTo(bowX - dir * 10, y);
    g.lineTo(sternX - dir * (wakeLen * 1.25), y - v.width * 1.3);
    g.moveTo(bowX - dir * 10, y);
    g.lineTo(sternX - dir * (wakeLen * 1.25), y + v.width * 1.3);
    g.strokePath();
  }

  /**
   * 1. Ghe Tam Bản Nam Bộ (Traditional wooden sampan with arched bamboo canopy & oarsman)
   */
  private drawSampan(
    g: Phaser.GameObjects.Graphics,
    l: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    v: RiverVessel,
    dir: number,
    isNight: boolean,
    brightness: number,
  ) {
    const halfL = v.length / 2;
    const halfW = v.width / 2;

    // Curved wooden boat hull (Vỏ gỗ tam bản bo tròn tự nhiên)
    g.fillStyle(0x5c2b09, 1); // Dark teak outer rim
    g.fillEllipse(x, y, v.length, v.width);
    g.fillStyle(0x92400e, 1); // Warm cedar planking
    g.fillEllipse(x, y - 1, v.length - 4, v.width - 3);
    g.fillStyle(0xb45309, 1);
    g.fillEllipse(x, y - 1, v.length - 8, v.width - 5);

    // Inner deck planks (sàn ván gỗ lát bên trong)
    g.fillStyle(0xd97706, 1);
    g.fillRect(x - halfL + 8, y - halfW + 3, v.length - 16, v.width - 6);
    g.fillStyle(0x78350f, 0.6);
    for (let px = x - halfL + 12; px < x + halfL - 10; px += 6) {
      g.fillRect(px, y - halfW + 3, 1, v.width - 6);
    }

    // Woven bamboo leaf canopy (Mui lá đan che mưa nắng giữa thuyền)
    const canopyW = 16;
    const canopyX = x - 2;
    g.fillStyle(0x854d0e, 1); // Bamboo frame ribs
    g.fillRect(canopyX - canopyW / 2 - 1, y - halfW + 1, canopyW + 2, v.width - 2);
    g.fillStyle(0xca8a04, 1); // Woven thatch roof
    g.fillRect(canopyX - canopyW / 2, y - halfW + 2, canopyW, v.width - 4);
    g.fillStyle(0xfde047, 0.85); // Sunlit straw weave highlights
    for (let s = -canopyW / 2 + 2; s < canopyW / 2; s += 3) {
      g.fillRect(canopyX + s, y - halfW + 3, 2, v.width - 6);
    }

    // Oarsman in blue áo bà ba & golden nón lá (Người chèo đò)
    const sternX = x - dir * (halfL - 8);
    // Body & arms
    g.fillStyle(0x1e3a8a, 1); // Áo bà ba xanh chàm
    g.fillCircle(sternX, y, 4.5);
    // Bamboo oar (Mái chèo tre dài chĩa xuống nước)
    g.fillStyle(0x78350f, 1);
    g.fillRect(sternX - dir * 2, y - halfW - 4, 2, v.width + 8);
    g.fillStyle(0xd97706, 1);
    g.fillRect(sternX - dir * 2, y + halfW + 2, 4, 3); // Oar blade
    // Conical leaf hat (Nón lá vàng rơm)
    g.fillStyle(0xfef08a, 1);
    g.fillTriangle(sternX - 6, y + 2, sternX + 6, y + 2, sternX, y - 6);
    g.fillStyle(0xeab308, 0.9);
    g.fillTriangle(sternX - 4, y + 2, sternX + 4, y + 2, sternX, y - 4);

    // Bow navigation hurricane lantern (Đèn bão mũi ghe)
    if (isNight) {
      const bowX = x + dir * (halfL - 3);
      l.fillStyle(0xfde047, 0.95);
      l.fillRect(bowX - 1, y - 1, 3, 3);
      l.fillStyle(0xfef08a, brightness * 0.35).fillCircle(bowX, y, 16);
    }
  }

  /**
   * 2. Xà Lan Chở Cát / Hàng Sông Đồng Nai (Long steel river sand barge with flag & wheelhouse)
   */
  private drawBarge(
    g: Phaser.GameObjects.Graphics,
    l: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    v: RiverVessel,
    dir: number,
    isNight: boolean,
    brightness: number,
    now: number,
  ) {
    const halfL = v.length / 2;
    const halfW = v.width / 2;

    // Steel barge hull (Thân xà lan thép dài màu xám xanh đậm)
    g.fillStyle(0x0f172a, 1);
    g.fillRect(x - halfL - 1, y - halfW - 1, v.length + 2, v.width + 2);
    g.fillStyle(0x1e293b, 1);
    g.fillRect(x - halfL, y - halfW, v.length, v.width);
    // Red industrial waterline bumper (Vạch mớn nước đỏ cam bảo vệ thân tàu)
    g.fillStyle(0xdc2626, 1);
    g.fillRect(x - halfL, y + halfW - 2, v.length, 2);
    g.fillStyle(0x475569, 1);
    g.fillRect(x - halfL + 3, y - halfW + 2, v.length - 6, v.width - 4);

    // Cargo hold with golden river sand (Khoang chứa cát vàng sông Đồng Nai)
    const cargoLeft = x - halfL + 14;
    const cargoW = v.length - 38;
    g.fillStyle(0x0f172a, 1);
    g.fillRect(cargoLeft, y - halfW + 3, cargoW, v.width - 6);

    // 3 Textured sand mounds (Các gò cát vàng mấp mô)
    const sandColors = [0xd97706, 0xf59e0b, 0xfde047];
    for (let mound = 0; mound < 3; mound++) {
      const mx = cargoLeft + cargoW * (0.2 + mound * 0.3);
      g.fillStyle(sandColors[0]!, 1);
      g.fillEllipse(mx, y, cargoW * 0.16, v.width * 0.35);
      g.fillStyle(sandColors[1]!, 1);
      g.fillEllipse(mx, y - 1, cargoW * 0.12, v.width * 0.26);
      g.fillStyle(sandColors[2]!, 0.9);
      g.fillEllipse(mx, y - 2, cargoW * 0.08, v.width * 0.18);
    }

    // 2-Story white Wheelhouse Cabin at stern (Cabin buồng lái 2 tầng ở đuôi xà lan)
    const cabinW = 18;
    const cabinX = dir > 0 ? x - halfL + 3 : x + halfL - (cabinW + 3);
    g.fillStyle(0xf8fafc, 1);
    g.fillRect(cabinX, y - halfW + 2, cabinW, v.width - 4);
    g.fillStyle(0xe2e8f0, 1);
    g.fillRect(cabinX + 2, y - halfW + 3, cabinW - 4, v.width - 6);

    // Panoramic forward bridge windows (Kính buồng lái màu xanh trời)
    g.fillStyle(0x0284c7, 1);
    const winX = dir > 0 ? cabinX + cabinW - 4 : cabinX + 1;
    g.fillRect(winX, y - halfW + 4, 3, v.width - 8);

    // Fluttering Vietnamese National Flag on cabin roof (Cờ đỏ sao vàng tung bay)
    const flagWave = Math.sin(now / 150) * 1.5;
    const flagMastX = cabinX + cabinW / 2;
    const flagMastY = y - halfW - 1;
    // Steel mast
    g.fillStyle(0x64748b, 1);
    g.fillRect(flagMastX, flagMastY - 8, 1, 9);
    // Red flag
    g.fillStyle(0xef4444, 1);
    g.fillRect(flagMastX - (dir > 0 ? 7 : -1), flagMastY - 8 + flagWave * 0.5, 7, 5);
    // Yellow star
    g.fillStyle(0xfde047, 1);
    g.fillRect(flagMastX - (dir > 0 ? 5 : -3), flagMastY - 7 + flagWave * 0.5, 3, 3);

    // Night navigation lights (Red Port, Green Starboard, Bright White Headlight)
    if (isNight) {
      const bowX = dir > 0 ? x + halfL : x - halfL;
      // Port side red / Starboard side green
      l.fillStyle(0xef4444, 0.95).fillRect(cabinX + 2, y - halfW + 1, 2, 2);
      l.fillStyle(0x22c55e, 0.95).fillRect(cabinX + 2, y + halfW - 3, 2, 2);

      // Powerful white beam shining forward into the river
      l.fillStyle(0xffffff, 1.0).fillRect(bowX - 1, y - 1, 3, 3);
      l.fillStyle(0xfffed7, brightness * 0.4).fillCircle(bowX, y, 26);
    }
  }

  /**
   * 3. Ca Nô Cao Tốc (Streamlined speedboat cutter with blue racing livery & twin outboards)
   */
  private drawCutter(
    g: Phaser.GameObjects.Graphics,
    l: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    v: RiverVessel,
    dir: number,
    isNight: boolean,
    brightness: number,
  ) {
    const halfL = v.length / 2;
    const halfW = v.width / 2;

    // Sleek white fiberglass hull (Vỏ composite khí động học bóng bẩy)
    g.fillStyle(0x0f172a, 0.4);
    g.fillEllipse(x, y + 2, v.length + 4, v.width + 4);

    g.fillStyle(0xf8fafc, 1);
    g.fillEllipse(x, y, v.length, v.width);
    g.fillStyle(0xe2e8f0, 1);
    g.fillEllipse(x, y - 1, v.length - 2, v.width - 2);

    // Cyan/Cobalt racing stripe along flanks (Sọc xanh thể thao)
    g.fillStyle(0x0284c7, 1);
    g.fillRect(x - halfL + 6, y - 2, v.length - 12, 4);

    // Curved tinted cockpit windshield (Kính chắn gió màu xanh trong suốt)
    const bowX = x + dir * (halfL - 9);
    g.fillStyle(0x38bdf8, 0.9);
    g.fillRect(bowX - 3, y - halfW + 3, 6, v.width - 6);
    g.fillStyle(0xffffff, 0.7);
    g.fillRect(bowX - 1, y - halfW + 4, 2, v.width - 8); // specular glint

    // Twin black outboard motors at stern (Động cơ gắn ngoài kép nhô ra sau)
    const sternX = x - dir * (halfL - 2);
    g.fillStyle(0x0f172a, 1);
    g.fillRect(sternX - 3, y - 5, 6, 4);
    g.fillRect(sternX - 3, y + 1, 6, 4);

    if (isNight) {
      l.fillStyle(0x38bdf8, 0.95).fillRect(bowX, y - 1, 3, 3);
      l.fillStyle(0x7dd3fc, brightness * 0.35).fillCircle(bowX, y, 18);
    }
  }

  /**
   * 4. Tàu Đánh Cá Sông Đồng Nai (Traditional emerald-green fishing trawler with squid lights)
   */
  private drawTrawler(
    g: Phaser.GameObjects.Graphics,
    l: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    v: RiverVessel,
    dir: number,
    isNight: boolean,
    brightness: number,
  ) {
    const halfL = v.length / 2;
    const halfW = v.width / 2;

    // Classic Vietnamese emerald-green wooden hull (Vỏ tàu gỗ xanh lá đậm truyền thống)
    g.fillStyle(0x052e16, 1);
    g.fillEllipse(x, y, v.length, v.width);
    g.fillStyle(0x15803d, 1);
    g.fillEllipse(x, y - 1, v.length - 3, v.width - 3);
    g.fillStyle(0x22c55e, 1);
    g.fillEllipse(x, y - 1, v.length - 7, v.width - 5);

    // Teak deckboard (Sàn gỗ boong tàu)
    g.fillStyle(0xd97706, 1);
    g.fillRect(x - halfL + 8, y - halfW + 3, v.length - 16, v.width - 6);

    // Rolled fishing nets at stern (Cuộn lưới chài boong sau)
    const sternX = x - dir * (halfL - 11);
    g.fillStyle(0x334155, 1);
    g.fillCircle(sternX, y, 5);
    g.fillStyle(0x475569, 1);
    g.fillCircle(sternX, y, 3);

    // Orange rescue lifebuoy ring on cabin side (Phao cứu sinh tròn màu cam)
    g.fillStyle(0xf97316, 1);
    g.fillCircle(x, y - halfW + 2, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(x, y - halfW + 2, 1);

    // Wooden cabin with crimson roof (Buồng lái gỗ nóc đỏ)
    const cabinX = x + dir * 4;
    g.fillStyle(0xf8fafc, 1);
    g.fillRect(cabinX - 7, y - halfW + 3, 14, v.width - 6);
    g.fillStyle(0xdc2626, 1); // Red roof
    g.fillRect(cabinX - 8, y - halfW + 2, 16, 3);

    // Incandescent night fishing lights string (Giàn đèn câu đêm rực rỡ)
    if (isNight) {
      for (let d = -6; d <= 6; d += 4) {
        l.fillStyle(0xfef08a, 1).fillRect(cabinX + d, y - halfW - 2, 2, 2);
      }
      l.fillStyle(0xfde047, brightness * 0.45).fillCircle(cabinX, y, 22);
    }
  }

  destroy() {
    this.graphics.destroy();
    this.lights.destroy();
  }
}
