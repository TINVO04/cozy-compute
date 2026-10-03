import { Client, type Room } from 'colyseus.js';
import { session } from '../lib/api';
import { useUi } from '../lib/store';
import { resolveEndpoint } from '../lib/endpoints';

function resolveWsUrl(): string {
  const env = import.meta.env.VITE_REALTIME_URL as string | undefined;
  return resolveEndpoint(env, typeof window === 'undefined' ? undefined : window.location, 'realtime');
}

const WS = resolveWsUrl();

type Listener = (room: Room) => void;

/**
 * Owns the single active Colyseus room. Handles reconnection with backoff and room transfer
 * between the town and apartments.
 */
class Net {
  private client = new Client(WS);
  room: Room | null = null;
  private listeners = new Set<Listener>();
  private target:
    | { name: 'town' }
    | { name: 'apartment'; ownerId: string }
    | { name: 'company' }
    | { name: 'university' }
    | { name: 'comga' }
    | { name: 'bida' }
    | { name: 'cybernet' }
    | { name: 'farm'; ownerId: string; farmToken?: string }
    | { name: 'ocean' } = {
    name: 'town',
  };
  private retry = 0;
  private retryTimer: number | undefined;
  private closedByUs = false;
  private subscriptions = new Map<(data: unknown) => void, () => void>();
  private messageHandlers = new Map<string, Set<(data: unknown) => void>>();
  /** Incremented on every connect/disconnect so late join results from superseded attempts are discarded. */
  private generation = 0;
  /** Connection attempts run one at a time so the server never sees two joins racing for the same player. */
  private queue: Promise<void> = Promise.resolve();

  onRoom(fn: Listener) {
    this.listeners.add(fn);
    if (this.room && !this.closedByUs) fn(this.room);
    return () => this.listeners.delete(fn);
  }

  connect(target = this.target): Promise<void> {
    this.target = target;
    this.closedByUs = false;
    const gen = ++this.generation;
    this.queue = this.queue.then(() => this.doConnect(target, gen));
    return this.queue;
  }

  private async doConnect(target: Net['target'], gen: number): Promise<void> {
    if (gen !== this.generation) return;
    const ui = useUi.getState();
    ui.setConnection(this.room ? 'reconnecting' : 'connecting');
    const token = session.get();
    if (!token) return;
    if (this.room) {
      this.closedByUs = true;
      await this.room.leave(true).catch(() => undefined);
      this.room = null;
    }
    try {
      const room =
        target.name === 'town'
          ? await this.client.joinOrCreate('town', { token })
          : target.name === 'company'
            ? await this.client.joinOrCreate('company', { token })
            : target.name === 'university'
              ? await this.client.joinOrCreate('university', { token })
              : target.name === 'comga'
                ? await this.client.joinOrCreate('comga', { token })
                : target.name === 'bida' || target.name === 'cybernet'
                  ? await this.client.joinOrCreate(target.name, { token })
                  : target.name === 'ocean'
                    ? await this.client.joinOrCreate('ocean', { token })
                    : target.name === 'farm'
                      ? await this.client.joinOrCreate('farm', {
                          token,
                          ownerId: target.ownerId,
                          farmToken: target.farmToken,
                        })
                      : await this.client.joinOrCreate('apartment', { token, ownerId: target.ownerId });
      if (gen !== this.generation) {
        await room.leave(true).catch(() => undefined);
        return;
      }
      this.attach(room);
    } catch (err) {
      if (gen !== this.generation) return;
      console.warn('[net] join failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (target.name === 'apartment' || target.name === 'farm') {
        useUi.getState().toast({
          kind: 'error',
          title: target.name === 'farm' ? 'Không thể vào trang trại' : 'Không thể vào căn hộ',
          body: msg,
        });
        return this.connect({ name: 'town' });
      }
      this.scheduleRetry();
    }
  }

  private attach(room: Room) {
    this.room = room;
    this.retry = 0;
    this.closedByUs = false;
    const ui = useUi.getState();
    ui.setConnection('online');
    sessionStorage.setItem('cozy.reconnect', room.reconnectionToken);
    room.onMessage('chat', (m: { from: string; userId: string; name: string; text: string; at: number }) =>
      useUi.getState().pushChat(m),
    );
    room.onMessage('notice', (m: { kind: string; text: string }) =>
      useUi.getState().toast({ kind: m.kind === 'warning' ? 'error' : 'info', title: m.text }),
    );
    for (const [type, handlers] of this.messageHandlers) {
      for (const handler of handlers) {
        this.subscriptions.get(handler)?.();
        this.subscriptions.set(handler, room.onMessage(type, handler));
      }
    }
    room.onMessage('*', () => undefined);
    room.onLeave((code) => {
      if (this.room !== room) return;
      this.room = null;
      if (this.closedByUs) return;
      if (code === 4001) {
        useUi.getState().setConnection('offline');
        useUi.getState().toast({ kind: 'info', title: 'Bạn đã mở game ở một thẻ trình duyệt khác.' });
        return;
      }
      if (code === 4003) {
        useUi.getState().setConnection('offline');
        return;
      }
      useUi.getState().setConnection('reconnecting');
      void this.tryReconnect(room.reconnectionToken);
    });
    this.listeners.forEach((fn) => fn(room));
  }

  private async tryReconnect(token: string) {
    try {
      const room = await this.client.reconnect(token);
      this.attach(room);
    } catch {
      void this.connect(this.target);
    }
  }

  private scheduleRetry() {
    useUi.getState().setConnection('reconnecting');
    const delay = Math.min(15000, 1000 * 2 ** this.retry++);
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(() => void this.connect(this.target), delay);
  }

  retryNow() {
    window.clearTimeout(this.retryTimer);
    this.retry = 0;
    void this.connect(this.target);
  }

  goTown() {
    useUi.getState().setRoom({ kind: 'town', label: 'Thị trấn' });
    return this.connect({ name: 'town' });
  }

  goApartment(ownerId: string, label: string) {
    useUi.getState().setRoom({ kind: 'apartment', ownerId, label });
    return this.connect({ name: 'apartment', ownerId });
  }

  goCompany(label = 'Văn Phòng VietProDev') {
    useUi.getState().setRoom({ kind: 'company', label });
    return this.connect({ name: 'company' });
  }

  goUniversity(label = 'Đại Học Công Nghệ Đồng Nai (DNTU)') {
    useUi.getState().setRoom({ kind: 'university', label });
    return this.connect({ name: 'university' });
  }

  goComGa(label = 'Cơm Gà Xối Mỡ 68 Biên Hòa') {
    useUi.getState().setRoom({ kind: 'comga', label });
    return this.connect({ name: 'comga' });
  }

  goBida(label = 'CLB Bida H2S Trảng Dài (Biên Hòa)') {
    useUi.getState().setRoom({ kind: 'bida', label });
    return this.connect({ name: 'bida' });
  }

  goCyberNet(label = 'Cyber Game HNT Trảng Dài') {
    useUi.getState().setRoom({ kind: 'cybernet', label });
    return this.connect({ name: 'cybernet' });
  }

  goFarm(ownerId: string, label = 'Trang Trại Cá Nhân', farmToken?: string) {
    useUi.getState().setFarmOwnerId(ownerId);
    useUi.getState().setRoom({ kind: 'farm', ownerId, label });
    return this.connect({ name: 'farm', ownerId, farmToken });
  }

  goOcean(label = 'Hải Trình Biển Sâu') {
    useUi.getState().setRoom({ kind: 'ocean', label });
    return this.connect({ name: 'ocean' });
  }

  send(type: string, msg: unknown) {
    this.room?.send(type, msg);
  }

  onRoomMessage<T = unknown>(type: string, handler: (data: T) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    const set = this.messageHandlers.get(type)!;
    const fn = handler as (data: unknown) => void;
    set.add(fn);

    if (this.room) this.subscriptions.set(fn, this.room.onMessage(type, fn));

    return () => {
      set.delete(fn);
      if (set.size === 0) this.messageHandlers.delete(type);
      this.subscriptions.get(fn)?.();
      this.subscriptions.delete(fn);
    };
  }

  isConnected(): boolean {
    return Boolean(this.room);
  }

  async disconnect() {
    this.generation++;
    window.clearTimeout(this.retryTimer);
    this.closedByUs = true;
    const oldRoom = this.room;
    this.room = null;
    this.queue = this.queue.then(async () => {
      this.closedByUs = true;
      await oldRoom?.leave(true).catch(() => undefined);
    });
    await this.queue;
  }
}

export const net = new Net();
