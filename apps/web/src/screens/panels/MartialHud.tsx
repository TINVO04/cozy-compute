import { useEffect, useRef, useState } from 'react';
import {
  CAVE_WEAPONS,
  MARTIAL_MASTER,
  MARTIAL_SKILLS,
  caveNear,
  type MartialSnapshot,
} from '@cozy/game-data';
import { net } from '../../game/net';
import { useUi } from '../../lib/store';
import './martial.css';

const send = (action: string, extra = {}) => net.send('martial:action', { action, ...extra });
export function MartialHud() {
  const [state, setState] = useState<MartialSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const panel = useUi((s) => s.panel);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const off = net.onRoomMessage<MartialSnapshot>('martial:state', setState);
    const offRoom = net.onRoom((room) => {
      if (room.name === 'martial') send('sync');
    });
    return () => {
      off();
      offRoom();
    };
  }, []);
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el?.matches('input, textarea, select') || el?.isContentEditable || panel || e.repeat) return;
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (open && e.key === 'Tab') {
        const buttons = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && el === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && el === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (!open) {
        const skill = MARTIAL_SKILLS.find((s) => s.key === e.key);
        if (skill) {
          e.preventDefault();
          send('cast', { skill: skill.id });
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, panel]);
  const sid = net.room?.sessionId;
  const me = state?.fighters.find((f) => f.sid === sid);
  const match = state?.match;
  const fighting = !!match && (match.a === sid || match.b === sid);
  const invitation = state?.invites.find((i) => i.to === sid);
  const outgoing = state?.invites.find((i) => i.from === sid);
  const pos = net.room?.state?.players?.get(sid);
  const nearMaster = pos && caveNear(pos, MARTIAL_MASTER, 100);
  const name = (id: string) => state?.fighters.find((f) => f.sid === id)?.name ?? 'Võ sĩ';
  return (
    <div className="martial-hud">
      <div className="martial-heading">
        <div>
          <strong>Đại hội Võ thuật</strong>
          <span>{match ? name(match.a) + '  ⚔  ' + name(match.b) : 'Võ đường Bửu Long'}</span>
        </div>
        <button ref={triggerRef} onClick={() => setOpen(true)}>
          Võ đường [E]
        </button>
        <button onClick={() => void net.goTown('martial')}>
          {fighting ? 'Rời sân (xử thua)' : 'Về thị trấn'}
        </button>
      </div>
      {match && state ? (
        <div className="martial-clock" role="status">
          {state.now < match.startsAt
            ? 'Chuẩn bị · ' + Math.ceil((match.startsAt - state.now) / 1000)
            : 'Còn ' + Math.max(0, Math.ceil((match.endsAt - state.now) / 1000)) + ' giây'}
        </div>
      ) : null}
      {invitation ? (
        <div className="martial-invite" role="status">
          <strong>{name(invitation.from)} mời bạn tỷ thí</strong>
          <button
            onClick={() => {
              send('accept', { target: invitation.from });
              setOpen(false);
            }}
          >
            Nhận lời
          </button>
          <button onClick={() => send('decline')}>Từ chối</button>
        </div>
      ) : null}
      <div className="martial-hotbar">
        <div className="martial-vitals">
          {me ? (
            <>
              <strong>{CAVE_WEAPONS.find((w) => w.id === me.weapon)?.name}</strong>
              <span>
                Thể lực {me.hp}/100 · Nội lực {Math.floor(me.energy)}/100
              </span>
            </>
          ) : (
            'Đang kết nối võ đường…'
          )}
        </div>
        <div className="martial-skills">
          {MARTIAL_SKILLS.map((s) => {
            const learned = me?.learned.includes(s.id);
            const remaining = Math.max(0, ((me?.cooldowns[s.id] ?? 0) - (state?.now ?? 0)) / 1000);
            return (
              <button
                key={s.id}
                disabled={
                  !learned ||
                  remaining > 0 ||
                  (me?.energy ?? 0) < s.energy ||
                  (!!match && fighting && (state?.now ?? 0) < match.startsAt)
                }
                title={s.description + ' ' + s.energy + ' nội lực. Hồi ' + s.cooldown / 1000 + ' giây.'}
                onClick={() => send('cast', { skill: s.id })}
              >
                <kbd>{s.key}</kbd>
                <strong>{s.name}</strong>
                <span>
                  {!learned
                    ? 'Học tại võ sư'
                    : remaining > 0
                      ? remaining.toFixed(1) + 's'
                      : s.energy + ' nội lực'}
                </span>
              </button>
            );
          })}
        </div>
        <small>WASD / ↑↓←→ di chuyển và hướng kiếm · 1–8 ra chiêu · E võ đường</small>
      </div>
      {open ? (
        <div className="martial-backdrop backdrop" onClick={() => setOpen(false)}>
          <div
            ref={menuRef}
            className="martial-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Võ đường Bửu Long"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="martial-menu-title">
              <h2>Võ đường Bửu Long</h2>
              <button
                aria-label="Đóng võ đường"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                Đóng · Esc
              </button>
            </div>
            <p>
              Học võ miễn phí. Mang kiếm từ cửa Hang Ngọc để giao lưu. Mỗi trận kéo dài tối đa 2 phút; hết
              giờ, người còn nhiều thể lực hơn thắng.
            </p>
            <div className="martial-columns">
              <section>
                <h3>Võ sư truyền dạy</h3>
                <p>
                  {nearMaster
                    ? 'Võ sư đã sẵn sàng truyền chiêu.'
                    : 'Đóng bảng và đi đến võ sư bên trái sân để học.'}
                </p>
                {MARTIAL_SKILLS.map((s) => (
                  <div className="martial-row" key={s.id}>
                    <div>
                      <strong>{s.name}</strong>
                      <small>{s.description}</small>
                    </div>
                    <button
                      disabled={!me || !nearMaster || fighting || me.learned.includes(s.id)}
                      onClick={() => send('learn', { skill: s.id })}
                    >
                      {me?.learned.includes(s.id) ? 'Đã học' : 'Học chiêu'}
                    </button>
                  </div>
                ))}
                <p>Đến mộc nhân bên phải sân, hướng kiếm vào mộc nhân rồi nhấn 1–8 để luyện tập.</p>
              </section>
              <section>
                <h3>Giao lưu tỷ thí</h3>
                {fighting ? <button onClick={() => send('forfeit')}>Xin thua trận này</button> : null}
                {outgoing ? (
                  <p>
                    Đã mời {name(outgoing.to)}. Chờ nhận lời…{' '}
                    <button onClick={() => send('decline')}>Hủy lời mời</button>
                  </p>
                ) : null}
                {state?.fighters
                  .filter((f) => f.sid !== sid)
                  .map((f) => (
                    <div className="martial-row" key={f.sid}>
                      <div>
                        <strong>{f.name}</strong>
                        <small>{CAVE_WEAPONS.find((w) => w.id === f.weapon)?.name}</small>
                      </div>
                      <button
                        disabled={!!match || !!outgoing}
                        onClick={() => send('invite', { target: f.sid })}
                      >
                        Mời tỷ thí
                      </button>
                    </div>
                  ))}
                {state && state.fighters.length < 2 ? (
                  <p>
                    Chưa có đối thủ ở đây. Bạn có thể học chiêu và luyện mộc nhân trong lúc chờ bạn bè đến.
                  </p>
                ) : null}
                <h3>Võ lâm bảng · toàn server</h3>
                <p>Hạng đầu là đương kim vô địch. Cùng một cặp chỉ tính điểm một trận mỗi 10 phút.</p>
                {state?.rankings.length ? (
                  <ol className="martial-ranks">
                    {state.rankings.map((r) => (
                      <li key={r.userId}>
                        <strong>{r.name}</strong>
                        <span>
                          {r.rating} Elo · {r.wins} thắng
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>Trận thắng đầu tiên sẽ mở bảng xếp hạng.</p>
                )}
                {state?.result ? <p role="status">{state.result}</p> : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
