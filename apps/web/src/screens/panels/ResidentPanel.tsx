import {
  ANIMALS,
  BAC_SAU_SHOP_ITEMS,
  CROPS,
  POND_FISHES,
  type RESIDENT_QUESTS,
  RESIDENT_RECIPES,
} from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, type Me } from '../../lib/api';
import { useUi } from '../../lib/store';
import { Button, ErrorState, Modal } from '../../ui/primitives';
import { fishIcon } from '../../art/fish';
import { CommunityBoard } from './CommunityBoard';
import { PartyPanel } from './PartyPanel';

type Tab = 'quests' | 'farm' | 'kitchen' | 'aquarium' | 'bida' | 'community';
interface Farm {
  animals: { id: string; type: string; name: string; fedAt: string | null; lastYieldAt: string | null }[];
  pondFishes: { id: string; species: string; fedAt: string | null; weightKg: number }[];
  warehouse: { items: { itemId: string; quantity: number }[] };
}
interface Resident {
  quests: ((typeof RESIDENT_QUESTS)[number] & { progress: number; claimed: boolean })[];
  recipes: ((typeof RESIDENT_RECIPES)[number] & { unlocked: boolean })[];
  order: { id: string; recipe_id: string; destination: string; started_at: string } | null;
}
interface Aquarium {
  fish: {
    id: string;
    speciesId: string;
    name: string;
    weightKg: number;
    sizeCm: number;
    caughtAt: string;
    slot: number | null;
    favorite: boolean;
  }[];
  trophies: string[];
}
interface Records {
  leaderboard: { id: string; name: string; wins: number }[];
  history: {
    id: string;
    mode: string;
    winner_id: string;
    finished_at: string;
    host: string;
    guest: string;
  }[];
}
const itemName = (id: string) =>
  Object.values(CROPS).find((c) => c.harvestItemId === id)?.name ??
  Object.values(ANIMALS).find((a) => a.yieldItemId === id)?.yieldName ??
  Object.values(POND_FISHES).find((f) => f.harvestItemId === id)?.name ??
  BAC_SAU_SHOP_ITEMS.find((i) => i.id === id)?.name ??
  id;

export function ResidentPanel({
  me,
  onClose,
  initialTab = 'quests',
}: {
  me: Me;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');
  const room = useUi((s) => s.room);
  const qc = useQueryClient();
  const ownerId = room.kind === 'apartment' ? (room.ownerId ?? me.id) : me.id;
  const resident = useQuery({
    queryKey: ['resident'],
    queryFn: () => api<Resident>('/api/resident'),
    refetchInterval: 10000,
  });
  const farm = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<Farm>('/api/farm/me'),
    enabled: tab === 'farm' || tab === 'kitchen',
    refetchInterval: 5000,
  });
  const aquarium = useQuery({
    queryKey: ['aquarium', ownerId],
    queryFn: () => api<Aquarium>(`/api/aquarium/${ownerId}`),
    enabled: tab === 'aquarium',
  });
  const records = useQuery({
    queryKey: ['bida-records'],
    queryFn: () => api<Records>('/api/bida/records'),
    enabled: tab === 'bida',
    refetchInterval: 15000,
  });
  const stock = (id: string) => farm.data?.warehouse.items.find((i) => i.itemId === id)?.quantity ?? 0;
  async function act(path: string, body: unknown) {
    if (busy) return;
    setBusy(true);
    setFailure('');
    setMessage('');
    try {
      await api(path, { body, idempotencyKey: crypto.randomUUID() });
      await qc.invalidateQueries();
      setMessage('Đã cập nhật.');
      window.dispatchEvent(new Event('farm:refresh'));
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'Không thể thực hiện.');
    } finally {
      setBusy(false);
    }
  }
  const err = resident.error ?? farm.error ?? aquarium.error ?? records.error;
  return (
    <Modal
      title="Sổ cư dân Biên Hòa"
      description="Mỗi ngày một câu chuyện trong khu phố."
      onClose={onClose}
      width={820}
    >
      <nav className="resident-tabs" aria-label="Nội dung sổ cư dân">
        {(
          [
            ['quests', 'Hành trình'],
            ['farm', 'Chăm nuôi'],
            ['kitchen', 'Bếp & giao món'],
            ['aquarium', 'Trưng bày'],
            ['bida', 'Bida H2S'],
            ['community', 'Khu phố & tổ đội'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? 'primary' : 'secondary'}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setFailure('');
              setMessage('');
            }}
          >
            {label}
          </Button>
        ))}
      </nav>
      {err ? <ErrorState error={err} /> : null}
      <p role={failure ? 'alert' : 'status'} className={failure ? 'error-text' : 'muted'}>
        {failure || message}
      </p>
      {resident.isLoading ? <p role="status">Đang mở sổ cư dân…</p> : null}
      {tab === 'quests' ? (
        <div className="resident-grid">
          {resident.data?.quests.map((q) => (
            <article className="resident-card" key={q.id}>
              <small>{q.chapter}</small>
              <h3>{q.name}</h3>
              <p>{q.description}</p>
              <progress
                value={q.progress}
                max={q.target}
                aria-label={`${q.name}: ${q.progress}/${q.target}`}
              />
              <p>
                {q.progress}/{q.target} · {q.coin} Xu · Kỷ niệm “{q.title}”
              </p>
              <Button
                disabled={busy || q.claimed || q.progress < q.target}
                onClick={() => void act('/api/resident/claim', { questId: q.id })}
              >
                {q.claimed ? 'Đã nhận kỷ niệm' : 'Nhận thưởng'}
              </Button>
            </article>
          ))}
        </div>
      ) : null}
      {tab === 'farm' ? (
        <div className="stack">
          <p>Mua giống và thức ăn ở Bác Sáu. Cho ăn một lần, đợi đến kỳ rồi thu sản phẩm vào kho.</p>
          <div className="resident-grid">
            {Object.values(ANIMALS)
              .filter((a) => stock(a.stockItemId) > 0)
              .map((a) => (
                <article className="resident-card" key={a.type}>
                  <h3>{a.name}</h3>
                  <p>Còn {stock(a.stockItemId)} con giống trong kho.</p>
                  <Button
                    disabled={busy}
                    onClick={() => void act('/api/farm/care', { kind: 'raise', id: a.stockItemId })}
                  >
                    Đưa vào chuồng
                  </Button>
                </article>
              ))}
            {farm.data?.animals.map((a) => {
              const def = Object.values(ANIMALS).find((d) => d.type === a.type);
              if (!def) return null;
              const pending = !!a.fedAt && (!a.lastYieldAt || new Date(a.lastYieldAt) < new Date(a.fedAt));
              const seconds = pending
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(a.fedAt!).getTime() + def.feedIntervalSec * 1000 - Date.now()) / 1000,
                    ),
                  )
                : 0;
              return (
                <article className="resident-card" key={a.id}>
                  <h3>{a.name}</h3>
                  <p>
                    {pending
                      ? seconds
                        ? `Còn ${seconds} giây đến kỳ ${def.yieldName}.`
                        : `Đã có ${def.yieldName}.`
                      : `Cần ${def.feedName} · Có ${stock(def.feedItemId)}`}
                  </p>
                  <Button
                    disabled={busy || (pending ? seconds > 0 : stock(def.feedItemId) < 1)}
                    onClick={() =>
                      void act(
                        pending ? '/api/farm/care' : '/api/farm/animals/feed',
                        pending
                          ? { kind: 'collect', id: a.id }
                          : { animalId: a.id, feedItemId: def.feedItemId },
                      )
                    }
                  >
                    {pending ? 'Thu sản phẩm' : 'Cho ăn'}
                  </Button>
                </article>
              );
            })}
          </div>
          <h3>Ao nhà</h3>
          <div className="resident-grid">
            {Object.values(POND_FISHES)
              .filter((f) => stock(f.fingerlingItemId) > 0)
              .map((f) => (
                <article className="resident-card" key={f.species}>
                  <h3>{f.name}</h3>
                  <p>Có {stock(f.fingerlingItemId)} con giống.</p>
                  <Button
                    disabled={busy}
                    onClick={() => void act('/api/farm/pond/stock', { fishSpecies: f.species })}
                  >
                    Thả vào ao
                  </Button>
                </article>
              ))}
            {farm.data?.pondFishes.map((f) => {
              const def = Object.values(POND_FISHES).find((d) => d.species === f.species)!;
              const seconds = f.fedAt
                ? Math.max(
                    0,
                    Math.ceil(
                      (new Date(f.fedAt).getTime() + def.growthDurationSec * 1000 - Date.now()) / 1000,
                    ),
                  )
                : 0;
              return (
                <article className="resident-card" key={f.id}>
                  <h3>{def.name}</h3>
                  <p>
                    {f.weightKg} kg ·{' '}
                    {f.fedAt
                      ? seconds
                        ? `Còn ${seconds} giây`
                        : 'Đến kỳ thu hoạch'
                      : `Cần ${itemName(def.feedItemIds[0]!)}`}
                  </p>
                  <Button
                    disabled={busy || (f.fedAt ? seconds > 0 : stock(def.feedItemIds[0]!) < 1)}
                    onClick={() =>
                      void act('/api/farm/care', { kind: f.fedAt ? 'pond-harvest' : 'pond-feed', id: f.id })
                    }
                  >
                    {f.fedAt ? 'Thu hoạch' : 'Cho ăn'}
                  </Button>
                </article>
              );
            })}
          </div>
          {!farm.data?.pondFishes.length ? (
            <p className="muted">Ao chưa có cá. Mua cá giống ở Bác Sáu rồi thả tại đây.</p>
          ) : null}
        </div>
      ) : null}
      {tab === 'kitchen' ? (
        <div className="stack">
          <p>
            Vào Cơm Gà 68 để nấu và nhận đơn. Nguyên liệu lấy từ kho nông trại; vào địa điểm của khách để giao
            món.
          </p>
          {resident.data?.order ? (
            <article className="resident-card">
              <h3>
                Đơn đang giao: {RESIDENT_RECIPES.find((r) => r.id === resident.data!.order!.recipe_id)?.name}
              </h3>
              <p>Khách: {RESIDENT_RECIPES.find((r) => r.id === resident.data!.order!.recipe_id)?.customer}</p>
              <div className="resident-tabs">
                <Button
                  disabled={busy || room.kind !== resident.data.order.destination}
                  onClick={() => void act('/api/kitchen', { kind: 'deliver', id: resident.data!.order!.id })}
                >
                  Giao món
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => void act('/api/kitchen', { kind: 'cancel', id: resident.data!.order!.id })}
                >
                  Hủy đơn, trả món vào kho
                </Button>
              </div>
            </article>
          ) : null}
          <div className="resident-grid">
            {resident.data?.recipes.map((r) => (
              <article className="resident-card" key={r.id}>
                <h3>{r.name}</h3>
                <p>
                  Khách: {r.customer} · {r.reward} Xu/đơn
                </p>
                <ul>
                  {r.ingredients.map((i) => (
                    <li key={i.id}>
                      {itemName(i.id)}: {stock(i.id)}/{i.quantity}
                    </li>
                  ))}
                </ul>
                <p>
                  Đã nấu: {stock(r.output)}
                  {r.unlocked ? '' : ` · Mở sau ${r.unlockOrders} đơn thành công`}
                </p>
                <div className="resident-tabs">
                  <Button
                    disabled={
                      busy ||
                      !r.unlocked ||
                      room.kind !== 'comga' ||
                      r.ingredients.some((i) => stock(i.id) < i.quantity)
                    }
                    onClick={() => void act('/api/kitchen', { kind: 'cook', id: r.id })}
                  >
                    Nấu món
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      !r.unlocked ||
                      room.kind !== 'comga' ||
                      stock(r.output) < 1 ||
                      !!resident.data?.order
                    }
                    onClick={() => void act('/api/kitchen', { kind: 'order', id: r.id })}
                  >
                    Nhận giao
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {tab === 'aquarium' ? (
        <div className="stack">
          <p>
            {ownerId === me.id
              ? 'Đặt bể cá trong nhà để mở 3 vị trí trưng bày. Cá yêu thích hoặc đang trưng bày được bảo vệ khi bán.'
              : 'Bộ sưu tập của chủ nhà.'}
          </p>
          <div className="resident-tabs">
            {aquarium.data?.trophies.map((t) => (
              <span className="badge" key={t}>
                {t}
              </span>
            ))}
          </div>
          {!aquarium.data?.fish.length ? <p>Chưa có cá để trưng bày.</p> : null}
          <div className="resident-grid">
            {aquarium.data?.fish.map((f) => (
              <article className="resident-card" key={f.id}>
                <img
                  src={fishIcon(f.speciesId, 3)}
                  alt={f.name}
                  style={{ width: 96, height: 64, objectFit: 'contain', imageRendering: 'pixelated' }}
                />
                <h3>{f.name}</h3>
                <p>
                  {f.weightKg} kg · {f.sizeCm} cm
                </p>
                <p>
                  Bắt ngày {new Date(f.caughtAt).toLocaleDateString('vi-VN')}
                  {f.slot ? ` · Bể cá, ô ${f.slot}` : ''}
                </p>
                {ownerId === me.id ? (
                  <>
                    <Button
                      disabled={busy}
                      aria-pressed={f.favorite}
                      onClick={() =>
                        void act('/api/aquarium', { id: f.id, slot: f.slot, favorite: !f.favorite })
                      }
                    >
                      {f.favorite ? 'Bỏ yêu thích' : 'Giữ làm kỷ niệm'}
                    </Button>
                    <label>
                      Vị trí trưng bày
                      <select
                        aria-label={`Trưng bày ${f.name}`}
                        value={f.slot ?? ''}
                        disabled={busy}
                        onChange={(e) =>
                          void act('/api/aquarium', {
                            id: f.id,
                            slot: e.target.value ? Number(e.target.value) : null,
                            favorite: f.favorite,
                          })
                        }
                      >
                        <option value="">Trong túi</option>
                        {[1, 2, 3].map((n) => (
                          <option key={n} value={n}>
                            Ô {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
      {tab === 'bida' ? (
        <div className="stack">
          <h3>Bảng thắng tuần này</h3>
          <p className="muted">Trận 8 bi và carom với người chơi khác được ghi nhận khi kết thúc ván.</p>
          <ol>
            {records.data?.leaderboard.map((p) => (
              <li key={p.id}>
                {p.name} · {p.wins} trận thắng
              </li>
            ))}
          </ol>
          {!records.data?.leaderboard.length ? (
            <p>Chưa có kết quả tuần này. Hẹn bạn một ván tại H2S!</p>
          ) : null}
          <h3>Lịch sử của bạn</h3>
          {records.data?.history.map((m) => (
            <article className="resident-card" key={m.id}>
              <strong>
                {m.host} — {m.guest}
              </strong>
              <p>
                {m.mode} · {m.winner_id === me.id ? 'Thắng' : 'Thua'} ·{' '}
                {new Date(m.finished_at).toLocaleString('vi-VN')}
              </p>
            </article>
          ))}
        </div>
      ) : null}
      {tab === 'community' ? (
        <>
          <CommunityBoard userId={me.id} onClose={onClose} />
          <PartyPanel userId={me.id} />
        </>
      ) : null}
    </Modal>
  );
}
