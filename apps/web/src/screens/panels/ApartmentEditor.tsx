import { APARTMENT_COLS, APARTMENT_ROWS, APARTMENT_THEMES } from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Hammer, Redo2, RotateCw, Trash2, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { itemIcon } from '../../art/items';
import { game } from '../../game/GameCanvas';
import type { EditorObject } from '../../game/scenes';
import { api, type Apartment, type Me, type ShopItem } from '../../lib/api';
import { qk } from '../../lib/queries';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, ConfirmDialog, Switch, toastError } from '../../ui/primitives';
import { Guestbook } from './Guestbook';

type Rot = 0 | 90 | 180 | 270;
interface Layout {
  name: string;
  themeId: string;
  published: boolean;
  objects: EditorObject[];
}

const footprint = (o: { rotation: Rot; size: { w: number; h: number } }) =>
  o.rotation === 90 || o.rotation === 270 ? { w: o.size.h, h: o.size.w } : o.size;

function fits(objects: EditorObject[], cand: EditorObject, ignore = -1): boolean {
  const fp = footprint(cand);
  if (cand.x < 0 || cand.y < 1 || cand.x + fp.w > APARTMENT_COLS || cand.y + fp.h > APARTMENT_ROWS)
    return false;
  if (cand.itemId.includes('rug')) return true;
  return objects.every((o, i) => {
    if (i === ignore || o.itemId.includes('rug')) return true;
    const ofp = footprint(o);
    return cand.x + fp.w <= o.x || o.x + ofp.w <= cand.x || cand.y + fp.h <= o.y || o.y + ofp.h <= cand.y;
  });
}

/** Owner-only apartment tools: guestbook, and an editor with placement grid, rotate, undo/redo, theme and publish. */
export function ApartmentEditor() {
  const me = useQuery<Me>({ queryKey: qk.me, enabled: false }).data!;
  const room = useUi((s) => s.room);
  const editing = useUi((s) => s.editingApartment);
  const setEditing = useUi((s) => s.setEditingApartment);
  const qc = useQueryClient();
  const apt = useQuery({
    queryKey: qk.apartment(me.id),
    queryFn: () => api<Apartment>(`/apartments/${me.id}`),
  });
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });
  const [history, setHistory] = useState<Layout[]>([]);
  const [cursor, setCursor] = useState(-1);
  const [selected, setSelected] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rot>(0);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [guestbook, setGuestbook] = useState(false);
  const layout = history[cursor];
  const saved = useRef<string>('');

  const fromServer = useCallback((a: Apartment): Layout => {
    return {
      name: a.name,
      themeId: a.themeId,
      published: a.published,
      objects: a.objects.map((o) => ({
        itemId: o.itemId,
        x: o.x,
        y: o.y,
        rotation: o.rotation,
        sprite: o.sprite,
        size: o.size,
      })),
    };
  }, []);

  // Initialize from server and keep the scene in sync.
  useEffect(() => {
    if (!apt.data || editing) return;
    const l = fromServer(apt.data);
    setHistory([l]);
    setCursor(0);
    saved.current = JSON.stringify(l);
  }, [apt.data, editing, fromServer]);

  useEffect(() => {
    if (!layout || !game) return;
    const push = () =>
      game?.events.emit('apartment:render', { themeId: layout.themeId, objects: layout.objects, editing });
    push();
    game.events.on('apartment:ready', push);
    return () => void game?.events.off('apartment:ready', push);
  }, [layout, editing, room.ownerId]);

  const commit = useCallback(
    (next: Layout) => {
      setHistory((h) => [...h.slice(0, cursor + 1), next].slice(-50));
      setCursor((c) => Math.min(c + 1, 49));
    },
    [cursor],
  );

  const inventory = useMemo(() => {
    const furniture = (shop.data ?? []).filter((i) => i.type === 'furniture' && i.owned > 0);
    return furniture.map((i) => ({
      item: i,
      placed: layout?.objects.filter((o) => o.itemId === i.id).length ?? 0,
    }));
  }, [shop.data, layout]);

  const selectedItem = inventory.find((x) => x.item.id === selected);

  // Pointer interactions from the scene.
  useEffect(() => {
    if (!editing || !game || !layout) return;
    const onHover = (p: { x: number; y: number }) => {
      if (!selectedItem) return game?.events.emit('apartment:ghost', null);
      const obj: EditorObject = {
        itemId: selectedItem.item.id,
        x: p.x,
        y: p.y,
        rotation,
        sprite: selectedItem.item.sprite,
        size: selectedItem.item.size,
      };
      game?.events.emit('apartment:ghost', {
        obj,
        valid: fits(layout.objects, obj) && selectedItem.placed < selectedItem.item.owned,
      });
    };
    const onClick = (p: { x: number; y: number; right: boolean }) => {
      const hitIndex = layout.objects.findIndex((o) => {
        const fp = footprint(o);
        return p.x >= o.x && p.x < o.x + fp.w && p.y >= o.y && p.y < o.y + fp.h;
      });
      if (p.right || (!selectedItem && hitIndex >= 0)) {
        // pick up: remove from room and select it for re-placement
        if (hitIndex < 0) return;
        const o = layout.objects[hitIndex]!;
        commit({ ...layout, objects: layout.objects.filter((_, i) => i !== hitIndex) });
        if (!p.right) {
          setSelected(o.itemId);
          setRotation(o.rotation);
        }
        play('click');
        return;
      }
      if (!selectedItem) return;
      if (selectedItem.placed >= selectedItem.item.owned) {
        useUi.getState().toast({
          kind: 'info',
          title: `Đã đặt hết ${selectedItem.item.name}`,
          body: 'Hãy mua thêm tại cửa hàng nội thất.',
        });
        return;
      }
      const obj: EditorObject = {
        itemId: selectedItem.item.id,
        x: p.x,
        y: p.y,
        rotation,
        sprite: selectedItem.item.sprite,
        size: selectedItem.item.size,
      };
      if (!fits(layout.objects, obj)) {
        play('error');
        return;
      }
      play('pop');
      commit({ ...layout, objects: [...layout.objects, obj] });
      if (selectedItem.placed + 1 >= selectedItem.item.owned) setSelected(null);
    };
    game.events.on('apartment:hover', onHover);
    game.events.on('apartment:click', onClick);
    return () => {
      game?.events.off('apartment:hover', onHover);
      game?.events.off('apartment:click', onClick);
      game?.events.emit('apartment:ghost', null);
    };
  }, [editing, layout, selectedItem, rotation, commit]);

  const save = useMutation({
    mutationFn: (l: Layout) =>
      api<{ score: number }>('/apartments/me', {
        method: 'PUT',
        body: {
          name: l.name,
          themeId: l.themeId,
          published: l.published,
          objects: l.objects.map(({ itemId, x, y, rotation }) => ({ itemId, x, y, rotation })),
        },
      }),
    onSuccess: (r, l) => {
      saved.current = JSON.stringify(l);
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lưu căn hộ',
        body: `Điểm phòng: ${r.score}${l.published ? ' · Khách có thể ghé thăm' : ' · Riêng tư'}`,
      });
      void qc.invalidateQueries({ queryKey: qk.apartment(me.id) });
      void qc.invalidateQueries({ queryKey: qk.me });
      setEditing(false);
    },
    onError: (err) => toastError(err, 'Không thể lưu'),
  });

  const dirty = layout ? JSON.stringify(layout) !== saved.current : false;

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') setRotation((r) => ((r + 90) % 360) as Rot);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) setCursor((c) => Math.min(history.length - 1, c + 1));
        else setCursor((c) => Math.max(0, c - 1));
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, history.length]);

  useEffect(() => () => setEditing(false), [setEditing]);

  if (!layout) return null;

  if (!editing) {
    return (
      <>
        <div className="hud-bottom" style={{ flexDirection: 'row' }}>
          <Button variant="primary" onClick={() => setEditing(true)}>
            <Hammer size={16} /> Trang trí
          </Button>
          <Button onClick={() => setGuestbook(true)}>
            <BookOpen size={16} /> Lưu bút
          </Button>
          <span className="pill" style={{ background: '#fff', height: 38, padding: '0 12px' }}>
            Điểm {apt.data?.score ?? 0} · {apt.data?.visits ?? 0} lượt ghé ·{' '}
            {layout.published ? 'Công khai' : 'Riêng tư'}
          </span>
        </div>
        {guestbook && apt.data ? (
          <Guestbook apartment={apt.data} onClose={() => setGuestbook(false)} />
        ) : null}
      </>
    );
  }

  return (
    <div className="editor-bar" role="region" aria-label="Chỉnh sửa căn hộ">
      <div className="stack" style={{ gap: 10, minWidth: 0 }}>
        <div className="row between wrap">
          <div className="row">
            <strong>Nội thất</strong>
            <span className="muted" style={{ fontSize: 12 }}>
              Bấm chọn món đồ, rồi bấm sàn nhà để đặt. Bấm đồ đã đặt để thu lại.{' '}
              <span className="kbd">R</span> xoay
            </span>
          </div>
          <div className="row">
            <Button
              size="sm"
              variant="ghost"
              aria-label="Hoàn tác"
              disabled={cursor <= 0}
              onClick={() => setCursor(cursor - 1)}
            >
              <Undo2 size={15} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Làm lại"
              disabled={cursor >= history.length - 1}
              onClick={() => setCursor(cursor + 1)}
            >
              <Redo2 size={15} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRotation((r) => ((r + 90) % 360) as Rot)}>
              <RotateCw size={15} /> {rotation}°
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!layout.objects.length}
              onClick={() => commit({ ...layout, objects: [] })}
            >
              <Trash2 size={15} /> Dọn phòng
            </Button>
          </div>
        </div>
        <div className="editor-inv">
          {inventory.length === 0 ? (
            <span className="muted" style={{ fontSize: 13, padding: 12 }}>
              Bạn chưa sở hữu nội thất nào. Hãy ghé tiệm Sofa So Good trong thị trấn.
            </span>
          ) : (
            inventory.map(({ item, placed }) => (
              <button
                key={item.id}
                className="inv-slot"
                aria-pressed={selected === item.id}
                disabled={placed >= item.owned && selected !== item.id}
                title={`${item.name} (còn ${item.owned - placed})`}
                onClick={() => setSelected(selected === item.id ? null : item.id)}
              >
                <img src={itemIcon(item.sprite, 'furniture', item.size, 2)} alt={item.name} />
                <span className="inv-count">
                  {item.owned - placed}/{item.owned}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
      <div className="editor-actions">
        <input
          className="input"
          aria-label="Tên căn hộ"
          maxLength={40}
          value={layout.name}
          onChange={(e) =>
            setHistory((h) => h.map((l, i) => (i === cursor ? { ...l, name: e.target.value } : l)))
          }
        />
        <select
          className="select"
          aria-label="Chủ đề căn hộ"
          value={layout.themeId}
          onChange={(e) => commit({ ...layout, themeId: e.target.value })}
        >
          {APARTMENT_THEMES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <Switch
          checked={layout.published}
          onChange={(v) => commit({ ...layout, published: v })}
          label="Mở cửa đón khách"
        />
        <div className="row">
          <Button variant="ghost" onClick={() => (dirty ? setConfirmLeave(true) : setEditing(false))}>
            Hủy
          </Button>
          <Button
            variant="primary"
            style={{ flex: 1 }}
            loading={save.isPending}
            disabled={!layout.name.trim()}
            onClick={() => save.mutate(layout)}
          >
            Lưu
          </Button>
        </div>
      </div>
      {confirmLeave ? (
        <ConfirmDialog
          title="Hủy bỏ thay đổi?"
          body="Các sắp xếp nội thất chưa lưu sẽ bị mất."
          confirmLabel="Bỏ thay đổi"
          danger
          onConfirm={() => {
            setConfirmLeave(false);
            setEditing(false);
          }}
          onClose={() => setConfirmLeave(false)}
        />
      ) : null}
    </div>
  );
}
