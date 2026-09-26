import { CAFE_INGREDIENTS } from '@cozy/game-data';
import { Coffee, Fish, Package, Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, num } from '../lib/api';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';
import { useRefreshEconomy } from '../lib/queries';
import { Button, CoinIcon } from '../ui/primitives';

function rewardToast(coin: number, fame: number, title: string, tired?: boolean) {
  useUi.getState().toast({
    kind: 'reward',
    title,
    body: `+${num(coin)} Coin${fame ? ` · +${fame} Fame` : ''}${tired ? ' · Daily soft cap reached, rewards reduced' : ''}`,
  });
}

function errorToast(err: unknown) {
  useUi
    .getState()
    .toast({ kind: 'error', title: err instanceof ApiError ? err.message : 'Something went wrong' });
  play('error');
}

function Reward({ coin, fame }: { coin: number; fame: number }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 16, fontSize: 18, fontWeight: 700 }}>
      <span className="row" style={{ gap: 6 }}>
        <CoinIcon size={18} /> +{coin}
      </span>
      {fame ? (
        <span className="row" style={{ gap: 6, color: 'var(--reward)' }}>
          <Star size={18} /> +{fame}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- fishing

type FishPhase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'waiting'; runId: string; nonce: string; biteAt: number; windowMs: number }
  | { kind: 'bite'; runId: string; nonce: string }
  | { kind: 'reeling' }
  | { kind: 'result'; title: string; body: string; coin?: number; fame?: number; good: boolean };

export function FishingActivity() {
  const close = useUi((s) => s.setActivity);
  const refresh = useRefreshEconomy();
  const [phase, setPhase] = useState<FishPhase>({ kind: 'idle' });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const cast = useCallback(async () => {
    setPhase({ kind: 'starting' });
    play('splash');
    try {
      const r = await api<{ runId: string; nonce: string; biteInMs: number; reactionWindowMs: number }>(
        '/activities/fishing/start',
        { body: {} },
      );
      setPhase({
        kind: 'waiting',
        runId: r.runId,
        nonce: r.nonce,
        biteAt: Date.now() + r.biteInMs,
        windowMs: r.reactionWindowMs,
      });
    } catch (err) {
      errorToast(err);
      close(null);
    }
  }, [close]);

  const reel = useCallback(async () => {
    const p = phaseRef.current;
    if (p.kind !== 'waiting' && p.kind !== 'bite') return;
    setPhase({ kind: 'reeling' });
    try {
      const r = await api<{
        outcome: string;
        message?: string;
        fish?: { name: string; rarity: string };
        coin?: number;
        fame?: number;
        tired?: boolean;
      }>('/activities/fishing/complete', { body: { runId: p.runId, nonce: p.nonce } });
      if (r.outcome === 'caught' && r.fish) {
        play('coin');
        setPhase({
          kind: 'result',
          good: true,
          title: `You caught a ${r.fish.name}!`,
          body: `A ${r.fish.rarity} catch.`,
          coin: r.coin,
          fame: r.fame,
        });
        rewardToast(r.coin ?? 0, r.fame ?? 0, r.fish.name, r.tired);
        refresh();
      } else {
        play('error');
        setPhase({
          kind: 'result',
          good: false,
          title: r.outcome === 'too_early' ? 'Too early!' : 'It got away',
          body: r.message ?? '',
        });
      }
    } catch (err) {
      errorToast(err);
      setPhase({ kind: 'idle' });
    }
  }, [refresh]);

  // bite timer (visual cue only; the server decides whether the reaction was in time)
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const t = window.setTimeout(
      () => {
        play('bite');
        setPhase({ kind: 'bite', runId: phase.runId, nonce: phase.nonce });
      },
      Math.max(0, phase.biteAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => {
    if (phase.kind !== 'bite') return;
    const t = window.setTimeout(() => void reel(), 2400);
    return () => clearTimeout(t);
  }, [phase, reel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const p = phaseRef.current;
        if (p.kind === 'idle' || p.kind === 'result') void cast();
        else if (p.kind === 'waiting' || p.kind === 'bite') void reel();
      }
      if (e.key === 'Escape') close(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cast, reel, close]);

  const biting = phase.kind === 'bite';
  return (
    <div className="activity" role="dialog" aria-label="Fishing">
      <div className="activity-card">
        <div
          className="activity-art"
          style={{ background: 'linear-gradient(#bfe3ef, #6fb6d6 55%, #5aa3c6)' }}
        >
          {phase.kind === 'waiting' || phase.kind === 'bite' || phase.kind === 'reeling' ? (
            <>
              <span className="ripple" style={{ top: 110 }} />
              <div className={`bobber ${biting ? 'bite' : ''}`} />
            </>
          ) : phase.kind === 'result' ? (
            <Fish size={64} color={phase.good ? '#2a2438' : '#ffffff'} strokeWidth={1.5} />
          ) : (
            <Fish size={56} color="#ffffff" strokeWidth={1.5} />
          )}
        </div>
        <div className="activity-body" aria-live="assertive">
          {phase.kind === 'idle' ? (
            <>
              <h3>Wobbly Pier</h3>
              <p className="muted">
                Cast your line and wait for a bite. React fast when the bobber dips — quicker reactions land
                rarer fish.
              </p>
              <Button variant="primary" size="lg" onClick={() => void cast()}>
                Cast line <span className="kbd">Space</span>
              </Button>
            </>
          ) : phase.kind === 'starting' ? (
            <h3>Casting…</h3>
          ) : phase.kind === 'waiting' ? (
            <>
              <h3>Waiting for a bite…</h3>
              <p className="muted">Don’t pull too early.</p>
              <Button size="lg" onClick={() => void reel()}>
                Reel in <span className="kbd">Space</span>
              </Button>
            </>
          ) : phase.kind === 'bite' ? (
            <>
              <h3 style={{ color: 'var(--reward)' }}>Something bit! Reel it in!</h3>
              <Button variant="reward" size="lg" onClick={() => void reel()}>
                Reel in now <span className="kbd">Space</span>
              </Button>
            </>
          ) : phase.kind === 'reeling' ? (
            <h3>Reeling…</h3>
          ) : (
            <>
              <h3>{phase.title}</h3>
              <p className="muted">{phase.body}</p>
              {phase.good ? <Reward coin={phase.coin ?? 0} fame={phase.fame ?? 0} /> : null}
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => close(null)}>
                  Done
                </Button>
                <Button variant="primary" onClick={() => void cast()}>
                  Cast again <span className="kbd">Space</span>
                </Button>
              </div>
            </>
          )}
          {phase.kind !== 'result' && phase.kind !== 'idle' ? null : phase.kind === 'idle' ? (
            <Button variant="ghost" onClick={() => close(null)}>
              Leave pier
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cafe

interface CafeRun {
  runId: string;
  nonce: string;
  customer: string;
  order: string[];
  timeLimitMs: number;
  started: number;
}

const label = (id: string) => CAFE_INGREDIENTS.find((i) => i.id === id)?.label ?? id;

export function CafeActivity() {
  const close = useUi((s) => s.setActivity);
  const refresh = useRefreshEconomy();
  const [run, setRun] = useState<CafeRun | null>(null);
  const [seq, setSeq] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    good: boolean;
    title: string;
    body: string;
    coin?: number;
    fame?: number;
  }>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);

  async function start() {
    setBusy(true);
    setResult(null);
    setSeq([]);
    try {
      const r = await api<Omit<CafeRun, 'started'>>('/activities/cafe/start', { body: {} });
      setRun({ ...r, started: Date.now() });
      play('pop');
    } catch (err) {
      errorToast(err);
      close(null);
    } finally {
      setBusy(false);
    }
  }

  async function serve(final: string[]) {
    if (!run) return;
    setBusy(true);
    try {
      const r = await api<{
        outcome: string;
        coin?: number;
        fame?: number;
        message?: string;
        tired?: boolean;
      }>('/activities/cafe/complete', {
        body: { runId: run.runId, nonce: run.nonce, sequence: final },
      });
      if (r.outcome === 'served') {
        play('coin');
        setResult({
          good: true,
          title: 'Order served!',
          body: `${run.customer} looks almost pleased.`,
          coin: r.coin,
          fame: r.fame,
        });
        rewardToast(r.coin ?? 0, r.fame ?? 0, 'Drink served', r.tired);
        refresh();
      } else {
        play('error');
        setResult({
          good: false,
          title: r.outcome === 'late' ? 'Too slow' : 'Wrong order',
          body: r.message ?? '',
        });
      }
      setRun(null);
    } catch (err) {
      errorToast(err);
      setRun(null);
    } finally {
      setBusy(false);
    }
  }

  function add(id: string) {
    if (!run || busy) return;
    play('click');
    const next = [...seq, id];
    setSeq(next);
    if (next.length === run.order.length) void serve(next);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (run) void api('/activities/cancel', { body: { runId: run.runId } }).catch(() => undefined);
        close(null);
      }
      const n = Number(e.key);
      if (run && n >= 1 && n <= CAFE_INGREDIENTS.length) add(CAFE_INGREDIENTS[n - 1]!.id);
      if (!run && !busy && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        void start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const left = run ? Math.max(0, run.timeLimitMs - (Date.now() - run.started)) : 0;

  return (
    <div className="activity" role="dialog" aria-label="Cafe shift">
      <div className="activity-card" style={{ width: 'min(520px, calc(100% - 32px))' }}>
        <div
          className="activity-art"
          style={{ background: 'linear-gradient(160deg, #f1dcc0, #e7c49b)', height: 140 }}
        >
          <Coffee size={56} color="#6b3b2a" strokeWidth={1.5} />
        </div>
        <div className="activity-body">
          {run ? (
            <>
              <div className="row between">
                <span className="muted" style={{ fontSize: 13 }}>
                  Customer: <strong style={{ color: 'var(--ink)' }}>{run.customer}</strong>
                </span>
                <span className="timer-ring" style={{ color: left < 5000 ? 'var(--danger)' : 'var(--ink)' }}>
                  {(left / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="order-strip" aria-label="Order">
                {run.order.map((o, i) => (
                  <div key={i} className={`order-slot ${seq[i] ? (seq[i] === o ? 'filled' : 'wrong') : ''}`}>
                    {label(o)}
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Add ingredients in order. Keys <span className="kbd">1</span>–<span className="kbd">8</span>{' '}
                work too.
              </p>
              <div className="ingredients">
                {CAFE_INGREDIENTS.map((ing, i) => (
                  <button key={ing.id} className="ingredient" disabled={busy} onClick={() => add(ing.id)}>
                    <div className="muted" style={{ fontSize: 10 }}>
                      {i + 1}
                    </div>
                    {ing.label}
                  </button>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!seq.length || busy}
                  onClick={() => setSeq(seq.slice(0, -1))}
                >
                  Undo last
                </Button>
              </div>
            </>
          ) : result ? (
            <>
              <h3>{result.title}</h3>
              <p className="muted">{result.body}</p>
              {result.good ? <Reward coin={result.coin ?? 0} fame={result.fame ?? 0} /> : null}
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => close(null)}>
                  End shift
                </Button>
                <Button variant="primary" loading={busy} onClick={() => void start()}>
                  Next customer <span className="kbd">Space</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3>Bean There Cafe</h3>
              <p className="muted">
                Customers shout an order. Build the drink in the exact order before they lose patience. Faster
                service pays a bigger tip.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => close(null)}>
                  Not now
                </Button>
                <Button variant="primary" size="lg" loading={busy} onClick={() => void start()}>
                  Start shift <span className="kbd">Space</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- delivery

export async function startDelivery() {
  const ui = useUi.getState();
  try {
    const r = await api<{
      runId: string;
      nonce: string;
      destination: never;
      destinationLabel: string;
      package: string;
      timeLimitMs: number;
    }>('/activities/delivery/start', { body: {} });
    play('pop');
    ui.setDelivery({ ...r, startedAt: Date.now() });
    ui.toast({
      kind: 'info',
      title: `Deliver "${r.package}"`,
      body: `Take it to ${r.destinationLabel}. Follow the orange marker.`,
    });
  } catch (err) {
    errorToast(err);
  }
}

export function DeliveryHud() {
  const job = useUi((s) => s.delivery);
  const zone = useUi((s) => s.zone);
  const setDelivery = useUi((s) => s.setDelivery);
  const refresh = useRefreshEconomy();
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);
  if (!job) return null;
  const left = Math.max(0, job.timeLimitMs - (Date.now() - job.startedAt));
  const here = zone === job.destination;

  async function deliver() {
    if (!job) return;
    setBusy(true);
    try {
      const r = await api<{
        outcome: string;
        coin?: number;
        fame?: number;
        message?: string;
        tired?: boolean;
      }>('/activities/delivery/complete', {
        body: { runId: job.runId, nonce: job.nonce },
      });
      if (r.outcome === 'delivered') {
        play('coin');
        rewardToast(r.coin ?? 0, r.fame ?? 0, 'Delivered!', r.tired);
        refresh();
      } else {
        play('error');
        useUi.getState().toast({ kind: 'error', title: r.message ?? 'Delivery failed' });
      }
      setDelivery(null);
    } catch (err) {
      errorToast(err);
      if (err instanceof ApiError && err.code !== 'not_at_location') setDelivery(null);
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (job) await api('/activities/cancel', { body: { runId: job.runId } }).catch(() => undefined);
    setDelivery(null);
  }

  return (
    <div className="delivery-hud" role="status">
      <Package size={22} color="var(--reward)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>{job.package}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {left === 0
            ? 'Out of time — deliver anyway for no pay, or abandon.'
            : `Deliver to ${job.destinationLabel}`}
        </span>
      </div>
      <span className="timer-ring" style={{ color: left < 8000 ? 'var(--danger)' : 'var(--ink)' }}>
        {Math.ceil(left / 1000)}s
      </span>
      {here ? (
        <Button variant="reward" loading={busy} onClick={() => void deliver()}>
          Hand over
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => void abandon()}>
          Abandon
        </Button>
      )}
    </div>
  );
}
