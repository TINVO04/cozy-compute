import { CAVE_RESOURCES, CAVE_WEAPONS, MARTIAL_SKILLS, caveSaleValue } from '@cozy/game-data';
import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCave } from '../../game/cave-state';
import { net } from '../../game/net';
import { useUi } from '../../lib/store';
import { qk } from '../../lib/queries';
import { Button, Modal } from '../../ui/primitives';
import './cave.css';

export function CaveHud() {
  const state = useCave((s) => s.snapshot);
  const prompt = useCave((s) => s.prompt);
  const panel = useUi((s) => s.panel);
  const connected = useUi((s) => s.connection === 'online');
  if (!state) return null;
  const weapon = CAVE_WEAPONS.find((w) => w.id === state.account.weapon)!;
  const alive = state.enemies.filter((e) => e.hp > 0).length;
  return (
    <>
      <section className="cave-status" aria-label="Trạng thái thám hiểm">
        <span className="cave-eyebrow">
          {state.floor
            ? state.floor === 18
              ? 'ĐỈNH CAO HANG NGỌC / TẦNG 18 / 18 (BOSS)'
              : 'THÁM HIỂM / TẦNG ' + state.floor + ' / 18'
            : 'TRẠM DỪNG / HANG NGỌC (HÔM NAY: ' + (state.clearedFloorsToday?.length ?? 0) + '/18 TẦNG)'}
        </span>
        <div className="cave-health-label">
          <strong>
            {state.floor
              ? state.clearedToday
                ? '✓ Đã xong hôm nay (Quái hồi sinh sau 00:00)'
                : state.cleared
                  ? 'Cổng đã mở!'
                  : 'Còn ' + alive + ' quái'
              : 'Chuẩn bị lên đường · 18 Tầng thử thách'}
          </strong>
          <span>♥ {state.hp}/100</span>
        </div>
        <progress aria-label="Máu" max={100} value={state.hp} />
        <small>
          {weapon.name} · {weapon.damage} sát thương
        </small>
        {state.combat && (
          <div className="cave-energy">
            <span>Nội lực {Math.floor(state.combat.energy)}/100</span>
            <progress aria-label="Nội lực" max={100} value={state.combat.energy} />
          </div>
        )}
        <div className="cave-resource-row" aria-label="Tài nguyên trong túi">
          {CAVE_RESOURCES.map((r) => (
            <span key={r.id}>
              {r.name} <b>{state.account.resources[r.id]}</b>
            </span>
          ))}
        </div>
      </section>
      {!panel && (
        <div className="cave-actions">
          <span className="cave-prompt" role="status">
            {prompt}
          </span>
          <div className="cave-action-buttons">
            {state.floor > 0 && (
              <Button
                variant="primary"
                disabled={!connected || state.hp <= 0 || !!state.combat?.casting}
                onClick={() => net.send('cave:action', { action: 'attack' })}
              >
                ⚔ Đánh <kbd>F / Space</kbd>
              </Button>
            )}
            <Button disabled={!connected} onClick={() => net.send('cave:action', { action: 'interact' })}>
              Tương tác <kbd>E</kbd>
            </Button>
            {state.floor > 0 && (
              <Button disabled={!connected} onClick={() => net.send('cave:action', { action: 'retreat' })}>
                Về cửa hang
              </Button>
            )}
          </div>
          {state.floor > 0 && state.combat && (
            <div className="cave-skillbar" role="group" aria-label="Chiêu thức võ đường">
              {MARTIAL_SKILLS.map((skill) => {
                const combat = state.combat!;
                const learned = combat.learned.includes(skill.id);
                const seconds = Math.max(0, ((combat.cooldowns[skill.id] ?? 0) - combat.now) / 1000);
                const reason = !learned
                  ? 'Học ở võ đường'
                  : seconds > 0
                    ? seconds.toFixed(1) + 's'
                    : combat.energy < skill.energy
                      ? 'Thiếu nội lực'
                      : skill.energy + ' nội lực';
                return (
                  <button
                    key={skill.id}
                    type="button"
                    className="cave-skill"
                    style={{ borderColor: '#' + skill.color.toString(16) }}
                    title={skill.description + ' · ' + reason}
                    aria-label={skill.key + ' · ' + skill.name + ' · ' + reason}
                    disabled={
                      !connected ||
                      !learned ||
                      seconds > 0 ||
                      combat.energy < skill.energy ||
                      !!combat.casting ||
                      state.hp <= 0
                    }
                    onClick={() => net.send('cave:action', { action: 'cast', skill: skill.id })}
                  >
                    <kbd>{skill.key}</kbd>
                    <strong>{skill.name}</strong>
                    <small>{reason}</small>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {panel === 'cave-shop' && <CaveShop onClose={() => useUi.getState().setPanel(null)} />}
    </>
  );
}

function CaveShop({ onClose }: { onClose: () => void }) {
  const state = useCave((s) => s.snapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const pending = useRef<{ action: 'buy' | 'sell'; item?: string; requestId: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const qc = useQueryClient();
  useEffect(() => {
    const off = net.onRoomMessage<{ ok: boolean; message?: string }>('cave:trade', (result) => {
      clearTimeout(timer.current);
      setBusy(false);
      pending.current = null;
      if (result.ok) {
        setMessage('Giao dịch thành công!');
        void qc.invalidateQueries({ queryKey: qk.me });
      } else setMessage(result.message ?? 'Giao dịch thất bại.');
    });
    return () => {
      off();
      clearTimeout(timer.current);
    };
  }, [qc]);
  if (!state) return null;
  const current = CAVE_WEAPONS.findIndex((w) => w.id === state.account.weapon);
  const value = caveSaleValue(state.account.resources);
  function trade(action: 'buy' | 'sell', item?: string) {
    if (busy) return;
    const old = pending.current;
    const request =
      old?.action === action && old.item === item ? old : { action, item, requestId: crypto.randomUUID() };
    pending.current = request;
    setBusy(true);
    setMessage('Đang giao dịch…');
    net.send('cave:action', request);
    timer.current = setTimeout(() => {
      setBusy(false);
      setMessage('Chưa nhận được phản hồi. Bấm lại để thử cùng giao dịch.');
    }, 7000);
  }
  return (
    <Modal
      title="Tiệm thợ rèn Hang Ngọc"
      description="Mua vũ khí, bán chiến lợi phẩm. Vũ khí mới được trang bị ngay."
      onClose={onClose}
      width={620}
    >
      <div className="cave-shop-balance">
        Túi tiền <strong>{state.account.coin.toLocaleString('vi-VN')} Coin</strong>
      </div>
      <div className="cave-shop-list">
        {CAVE_WEAPONS.map((w, index) => (
          <div className="cave-shop-item" key={w.id}>
            <div className="cave-sword" style={{ color: '#' + w.color.toString(16) }}>
              ⚔
            </div>
            <div>
              <strong>{w.name}</strong>
              <small>{w.damage} sát thương mỗi đòn</small>
            </div>
            <Button
              disabled={busy || index <= current || state.account.coin < w.price}
              onClick={() => trade('buy', w.id)}
            >
              {index === current ? 'Đang trang bị' : index < current ? 'Đã nâng cấp' : w.price + ' Coin'}
            </Button>
          </div>
        ))}
      </div>
      <h3>Thu mua tài nguyên</h3>
      <div className="cave-shop-list">
        {CAVE_RESOURCES.map((r) => (
          <div className="cave-shop-item" key={r.id}>
            <div>
              <strong>
                {r.name} × {state.account.resources[r.id]}
              </strong>
              <small>{r.price} Coin / đơn vị</small>
            </div>
            <b>{r.price * state.account.resources[r.id]} Coin</b>
          </div>
        ))}
      </div>
      <Button block variant="reward" disabled={busy || !value} onClick={() => trade('sell')}>
        Bán tất cả · Nhận {value} Coin
      </Button>
      <p role="status" className="cave-trade-message">
        {message || 'Kiếm tập sự và cuốc khai thác được cấp sẵn miễn phí.'}
      </p>
    </Modal>
  );
}
