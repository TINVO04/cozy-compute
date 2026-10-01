import { useUi } from './store';

let ctx: AudioContext | null = null;

type Cue =
  | 'coin'
  | 'click'
  | 'error'
  | 'splash'
  | 'bite'
  | 'duck'
  | 'pop'
  | 'nibble'
  | 'reel'
  | 'bida_hit'
  | 'bida_cushion'
  | 'bida_pocket'
  | 'bida_win';

const CUES: Record<Cue, { f: number[]; d: number; type: OscillatorType; vol: number }> = {
  coin: { f: [988, 1319], d: 0.08, type: 'square', vol: 0.05 },
  click: { f: [660], d: 0.03, type: 'triangle', vol: 0.05 },
  error: { f: [220, 180], d: 0.1, type: 'sawtooth', vol: 0.04 },
  splash: { f: [320, 240, 180], d: 0.06, type: 'triangle', vol: 0.05 },
  nibble: { f: [440, 360], d: 0.04, type: 'triangle', vol: 0.04 },
  bite: { f: [880, 880], d: 0.06, type: 'square', vol: 0.06 },
  duck: { f: [740, 988, 1175], d: 0.06, type: 'square', vol: 0.05 },
  pop: { f: [523, 784], d: 0.05, type: 'triangle', vol: 0.05 },
  reel: { f: [520, 680], d: 0.04, type: 'triangle', vol: 0.05 },
  bida_hit: { f: [820, 520], d: 0.04, type: 'triangle', vol: 0.07 },
  bida_cushion: { f: [190, 110], d: 0.06, type: 'sine', vol: 0.06 },
  bida_pocket: { f: [340, 240, 150], d: 0.09, type: 'sine', vol: 0.08 },
  bida_win: { f: [523, 659, 784, 1046], d: 0.12, type: 'square', vol: 0.07 },
};

/** Tiny synthesized sound effects — no audio assets required. */
export function play(cue: Cue) {
  if (useUi.getState().muted) return;
  try {
    ctx ??= new AudioContext();
    const spec = CUES[cue];
    let t = ctx.currentTime;
    for (const f of spec.f) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = spec.type;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(spec.vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.d);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + spec.d);
      t += spec.d * 0.9;
    }
  } catch {
    // audio is optional
  }
}
