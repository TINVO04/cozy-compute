import {
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  TOP_COLORS,
  type Appearance,
  type HairStyle,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shirt } from 'lucide-react';
import { useState } from 'react';
import { avatarPortrait } from '../../art/avatar';
import { itemIcon } from '../../art/items';
import { api, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { Button, EmptyState, ErrorState, LoadingState, Panel, toastError } from '../../ui/primitives';

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
    mutationFn: (v: { itemId: string | null; slot: 'hat' | 'top' | 'face' | 'rod' }) =>
      api('/inventory/equip', { body: v }),
    onSuccess: () => refresh(),
    onError: (err) => toastError(err, 'Không thể thay đổi trang bị'),
  });

  const owned = (shop.data ?? []).filter((i) => (i.type === 'clothing' || i.type === 'rod') && i.owned > 0);

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
              <h3>Trang phục & Cần câu của bạn</h3>
              <div className="row" style={{ gap: 6 }}>
                <Button size="sm" variant="ghost" onClick={() => setPanel('shop-rods')}>
                  🎣 Tiệm ngư cụ
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
                title="Chưa có trang phục hay cần câu nào"
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
                        {item.type === 'rod' ? 'Đang cầm' : 'Đang mặc'}
                      </span>
                    ) : null}
                    <div className={`item-art r-${item.rarity}`} style={{ height: 104 }}>
                      <img
                        src={itemIcon(item.sprite, item.type === 'rod' ? 'rod' : 'clothing', item.size, 4)}
                        alt=""
                      />
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
                          ? item.type === 'rod'
                            ? 'Cất cần'
                            : 'Tháo ra'
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
    </Panel>
  );
}
