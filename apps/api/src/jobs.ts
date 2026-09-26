import type { AppContext } from './context.js';
import { syncUsage } from './services/ai.js';
import { tickEvents } from './services/events.js';

/**
 * Background loops. A Redis lock makes sure only one API instance runs each job at a time.
 */
export function startJobs(ctx: AppContext): () => void {
  const timers: NodeJS.Timeout[] = [];
  const run = (name: string, everyMs: number, fn: () => Promise<unknown>) => {
    const tick = async () => {
      const got = await ctx.redis
        .set(`job:${name}`, String(process.pid), 'PX', Math.max(everyMs - 100, 500), 'NX')
        .catch(() => null);
      if (!got) return;
      try {
        await fn();
      } catch (err) {
        ctx.log.error({ err, job: name }, 'job failed');
      }
    };
    timers.push(setInterval(() => void tick(), everyMs));
    void tick();
  };
  run('events', 2000, () => tickEvents(ctx));
  run('usage-sync', 60_000, () => syncUsage(ctx));
  return () => timers.forEach(clearInterval);
}
