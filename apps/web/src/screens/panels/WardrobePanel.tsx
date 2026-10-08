import {
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  TOP_COLORS,
  type Appearance,
  type ClothingSlot,
  type HairStyle,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shirt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { avatarPortrait } from '../../art/avatar';
import { itemIcon } from '../../art/items';
import { api, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { Button, EmptyState, ErrorState, LoadingState, Modal, Panel, toastError } from '../../ui/primitives';

const HAIR_STYLE_NAMES: Record<HairStyle, string> = {
  short: 'Tóc ngắn',
  long: 'Tóc dài',
  bun: 'Búi tóc',
  spiky: 'Gai nhọn',
  bald: 'Đầu trọc',
};

const SLOT_NAMES: Record<string, string> = {
  hat: 'Mũ',
  top: 'Áo',
  face: 'Phụ kiện',
  rod: 'Cần câu',
  sword: 'Kiếm',
};

export function WardrobePanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = useRefreshEconomy();
  const setPanel = useUi((s) => s.setPanel);
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });
  const [draft, setDraft] = useState({
    skin: me.appearance.skin,
    hairStyle: me.appearance.hairStyle,
    hairColor: me.appearance.hairColor,
    baseTop: me.appearance.baseTop,
  });
  const [status, setStatus] = useState(me.statusText);
  const [verifyModal, setVerifyModal] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const toast = useUi((s) => s.toast);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSendInGameOtp() {
    setSendingOtp(true);
    try {
      const res = await api<{ ok: boolean; message: string }>('/player/send-verification-otp', {
        method: 'POST',
      });
      setCooldown(60);
      toast({ kind: 'info', title: res.message || 'Mã OTP đã được gửi về email của bạn.' });
    } catch (err) {
      toastError(err, 'Không thể gửi mã OTP');
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleConfirmInGameOtp() {
    if (!verifyOtp.trim()) return;
    setVerifying(true);
    try {
      const res = await api<{ ok: boolean; user: Me }>('/player/verify-email', {
        method: 'POST',
        body: { otp: verifyOtp.trim() },
      });
      qc.setQueryData(qk.me, res.user);
      toast({ kind: 'success', title: 'Xác thực email thành công!' });
      setVerifyModal(false);
      setVerifyOtp('');
    } catch (err) {
      toastError(err, 'Xác thực OTP thất bại');
    } finally {
      setVerifying(false);
    }
  }

  const preview: Appearance = { ...me.appearance, ...draft };
  const dirty =
    draft.skin !== me.appearance.skin ||
    draft.hairStyle !== me.appearance.hairStyle ||
    draft.hairColor !== me.appearance.hairColor ||
    draft.baseTop !== me.appearance.baseTop ||
    status !== me.statusText;

  const save = useMutation({
    mutationFn: () =>
      api<Me>('/me/profile', { method: 'PUT', body: { appearance: draft, statusText: status } }),
    onSuccess: (data) => {
      qc.setQueryData(qk.me, data);
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lưu diện mạo',
        body: 'Mọi người trong thị trấn đều thấy bạn đổi mới.',
      });
    },
    onError: (err) => toastError(err, 'Không thể lưu'),
  });

  const equip = useMutation({
    mutationFn: (v: { itemId: string | null; slot: ClothingSlot }) => api('/inventory/equip', { body: v }),
    onSuccess: () => refresh(),
    onError: (err) => toastError(err, 'Không thể thay đổi trang bị'),
  });

  const owned = (shop.data ?? []).filter(
    (i) => (i.type === 'clothing' || i.type === 'rod' || i.type === 'sword') && i.owned > 0,
  );

  return (
    <Panel icon={<Shirt size={18} />} eyebrow="Phong cách" title="Tủ đồ & Hồ sơ" onClose={onClose}>
      <div className="split">
        <div className="sticky stack">
          <div className="preview-stage">
            <img src={avatarPortrait(preview, 7)} alt="Xem trước nhân vật" />
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{me.displayName}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {me.title}
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="status">Dòng trạng thái</label>
              <input
                id="status"
                className="input"
                maxLength={60}
                placeholder="ví dụ: Đang tìm vịt vàng..."
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
              <span className="field-hint">
                Hiển thị trên đầu nhân vật. Còn lại {60 - status.length} ký tự.
              </span>
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>Email tài khoản:</span>
                <span
                  className={me.emailVerified ? 'pill pill-primary' : 'pill pill-warning'}
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  {me.emailVerified ? '✓ Đã xác thực' : '⚠️ Chưa xác thực'}
                </span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, wordBreak: 'break-all' }}>{me.email}</div>
              {!me.emailVerified ? (
                <div style={{ marginTop: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    block
                    onClick={() => {
                      setVerifyModal(true);
                      void handleSendInGameOtp();
                    }}
                  >
                    Xác thực lại email ngay
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <Button
            variant="primary"
            block
            disabled={!dirty}
            loading={save.isPending}
            onClick={() => save.mutate()}
          >
            {dirty ? 'Lưu diện mạo' : 'Đã lưu'}
          </Button>
        </div>
        <div className="stack-lg">
          <section>
            <div className="section-title">
              <h3>Màu da</h3>
            </div>
            <div className="swatches" role="radiogroup" aria-label="Màu da">
              {SKIN_TONES.map((c, i) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c }}
                  aria-pressed={draft.skin === i}
                  aria-label={`Màu da ${i + 1}`}
                  onClick={() => setDraft({ ...draft, skin: i })}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="section-title">
              <h3>Kiểu & màu tóc</h3>
            </div>
            <div
              className="tabs"
              role="radiogroup"
              aria-label="Kiểu tóc"
              style={{ display: 'inline-flex', marginBottom: 12 }}
            >
              {HAIR_STYLES.map((h) => (
                <button
                  key={h}
                  className="tab"
                  aria-selected={draft.hairStyle === h}
                  onClick={() => setDraft({ ...draft, hairStyle: h as HairStyle })}
                >
                  {HAIR_STYLE_NAMES[h as HairStyle] ?? h}
                </button>
              ))}
            </div>
            <div className="swatches" role="radiogroup" aria-label="Màu tóc">
              {HAIR_COLORS.map((c, i) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c }}
                  aria-pressed={draft.hairColor === i}
                  aria-label={`Màu tóc ${i + 1}`}
                  onClick={() => setDraft({ ...draft, hairColor: i })}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="section-title">
              <h3>Màu áo cơ bản</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                Áp dụng khi không mặc áo ngoài
              </span>
            </div>
            <div className="swatches" role="radiogroup" aria-label="Màu áo">
              {TOP_COLORS.map((c, i) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c }}
                  aria-pressed={draft.baseTop === i}
                  aria-label={`Màu áo ${i + 1}`}
                  onClick={() => setDraft({ ...draft, baseTop: i })}
                />
              ))}
            </div>
          </section>
          <section>
            <div className="section-title">
              <h3>Trang phục, Cần câu & Kiếm của bạn</h3>
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setPanel('shop-rods')}>
                  🎣 Tiệm ngư cụ
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel('shop-swords')}>
                  ⚔ Tiệm vũ khí
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPanel('shop-fashion')}>
                  👗 Tiệm thời trang
                </Button>
              </div>
            </div>
            {shop.isPending ? (
              <LoadingState rows={2} />
            ) : shop.isError ? (
              <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />
            ) : owned.length === 0 ? (
              <EmptyState
                icon={<Shirt size={22} />}
                title="Chưa có trang phục, cần câu hay kiếm nào"
                body="Kiếm Xu từ các hoạt động rồi ghé cửa hàng thời trang hoặc tiệm ngư cụ nhé."
              />
            ) : (
              <div
                className="grid-cards"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
              >
                {owned.map((item) => (
                  <article key={item.id} className="card item-card">
                    {item.equipped ? (
                      <span className="pill pill-primary owned-tag">
                        {item.type === 'sword'
                          ? 'Đang vác kiếm'
                          : item.type === 'rod'
                            ? 'Đang cầm'
                            : 'Đang mặc'}
                      </span>
                    ) : null}
                    <div className={`item-art r-${item.rarity}`} style={{ height: 104 }}>
                      <img src={itemIcon(item.sprite, item.type, item.size, 4)} alt="" />
                    </div>
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {item.slot ? (SLOT_NAMES[item.slot] ?? item.slot) : ''}
                      </span>
                    </div>
                    <div className="item-foot">
                      <Button
                        size="sm"
                        block
                        variant={item.equipped ? 'secondary' : 'primary'}
                        loading={equip.isPending && equip.variables?.slot === item.slot}
                        onClick={() =>
                          equip.mutate({ itemId: item.equipped ? null : item.id, slot: item.slot! })
                        }
                      >
                        {item.equipped
                          ? item.type === 'sword'
                            ? 'Hạ kiếm'
                            : item.type === 'rod'
                              ? 'Cất cần'
                              : 'Tháo ra'
                          : item.type === 'sword'
                            ? 'Vác kiếm'
                            : item.type === 'rod'
                              ? 'Trang bị'
                              : 'Mặc vào'}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      {verifyModal ? (
        <Modal
          title="Xác thực Email tài khoản"
          description={`Mã OTP xác thực sẽ được gửi đến hộp thư: ${me.email}`}
          onClose={() => setVerifyModal(false)}
          footer={
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="ghost" onClick={() => setVerifyModal(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                loading={verifying}
                disabled={!verifyOtp.trim()}
                onClick={() => void handleConfirmInGameOtp()}
              >
                Xác nhận OTP
              </Button>
            </div>
          }
        >
          <div className="stack" style={{ gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                type="text"
                maxLength={6}
                autoFocus
                placeholder="Nhập 6 số OTP"
                value={verifyOtp}
                onChange={(e) => setVerifyOtp(e.target.value)}
                style={{ fontSize: 18, letterSpacing: 4, fontWeight: 700, textAlign: 'center', flex: 1 }}
              />
              <Button
                variant="secondary"
                disabled={sendingOtp || cooldown > 0}
                loading={sendingOtp}
                onClick={() => void handleSendInGameOtp()}
              >
                {cooldown > 0 ? `${cooldown}s` : 'Gửi lại OTP'}
              </Button>
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Vui lòng kiểm tra hòm thư đến và thư mục Spam. Mã OTP có hiệu lực trong 5 phút.
            </p>
          </div>
        </Modal>
      ) : null}
    </Panel>
  );
}
