import { APARTMENT_COLS, APARTMENT_ROWS, APARTMENT_THEMES, GEN_Z_FURNITURE_IDS } from '@cozy/game-data';
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
import { Button, ConfirmDialog, ErrorState, LoadingState, Switch, toastError } from '../../ui/primitives';
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
  const [collection, setCollection] = useState<'all' | 'genz'>('all');
  const placementCursor = useRef({ x: 5, y: 4 });
  const editorBar = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!editing || !editorBar.current) return;
    const bar = editorBar.current;
    const measure = () =>
      game?.events.emit('apartment:editor-height', bar.getBoundingClientRect().height + 24);
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    measure();
    game?.events.on('apartment:ready', measure);
    return () => {
      observer.disconnect();
      game?.events.off('apartment:ready', measure);
    };
  }, [editing]);

  // Pointer interactions from the scene.
  useEffect(() => {
    if (!editing || !game || !layout) return;
    const onHover = (p: { x: number; y: number }) => {
      placementCursor.current = p;
      game?.events.emit(
        'apartment:cursor',
        p.x >= 0 && p.x < APARTMENT_COLS && p.y >= 1 && p.y < APARTMENT_ROWS ? p : null,
      );
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
      // Prefer solid furniture above a rug when picking an object up.
      const hits = layout.objects
        .map((o, i) => ({ o, i }))
        .filter(({ o }) => {
          const fp = footprint(o);
          return p.x >= o.x && p.x < o.x + fp.w && p.y >= o.y && p.y < o.y + fp.h;
        });
      const hitIndex = hits.reverse().find(({ o }) => !o.itemId.includes('rug'))?.i ?? hits[0]?.i ?? -1;
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
        useUi.getState().toast({
          kind: 'info',
          title: 'Chưa đặt được ở đây',
          body: 'Chọn ô trong phòng còn trống; thảm có thể nằm dưới bàn và ghế.',
        });
        return;
      }
      play('pop');
      commit({ ...layout, objects: [...layout.objects, obj] });
      if (selectedItem.placed + 1 >= selectedItem.item.owned) setSelected(null);
    };
    game.events.on('apartment:hover', onHover);
    game.events.on('apartment:click', onClick);
    onHover(placementCursor.current);
    return () => {
      game?.events.off('apartment:hover', onHover);
      game?.events.off('apartment:click', onClick);
      game?.events.emit('apartment:ghost', null);
      game?.events.emit('apartment:cursor', null);
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
      const el = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return;
      if (document.querySelector('.backdrop')) return;
      const directions: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      const direction = directions[e.key];
      if (direction) {
        e.preventDefault();
        const fp = footprint({ rotation, size: selectedItem?.item.size ?? { w: 1, h: 1 } });
        const next = {
          x: Math.max(0, Math.min(APARTMENT_COLS - fp.w, placementCursor.current.x + direction.x)),
          y: Math.max(1, Math.min(APARTMENT_ROWS - fp.h, placementCursor.current.y + direction.y)),
        };
        game?.events.emit('apartment:hover', next);
      }
      if (e.key === 'e' || e.key === 'E' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        game?.events.emit('apartment:click', {
          ...placementCursor.current,
          right: e.key === 'Delete' || e.key === 'Backspace',
        });
      }
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
  }, [editing, history.length, selectedItem, rotation]);

  useEffect(() => () => setEditing(false), [setEditing]);

  if (apt.isError)
    return (
      <div className="hud-bottom">
        <ErrorState error={apt.error} onRetry={() => void apt.refetch()} />
      </div>
    );
  if (!layout)
    return (
      <div className="hud-bottom">
        <LoadingState rows={1} />
      </div>
    );

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
    <div ref={editorBar} className="editor-bar" role="region" aria-label="Chỉnh sửa căn hộ">
      <div className="stack" style={{ gap: 10, minWidth: 0 }}>
        <div className="row between wrap">
          <strong>Góc chill của bạn</strong>
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
        <span className="muted" style={{ fontSize: 12 }}>
          Chọn đồ, bấm sàn để đặt. Mũi tên chọn ô · <span className="kbd">E</span> đặt/thu ·{' '}
          <span className="kbd">R</span> xoay · <span className="kbd">Delete</span> cất
        </span>
        <div className="row between wrap">
          <div className="tabs" role="tablist" aria-label="Bộ sưu tập nội thất">
            <button
              className="tab"
              role="tab"
              aria-selected={collection === 'all'}
              onClick={() => setCollection('all')}
            >
              Tất cả đồ của bạn
            </button>
            <button
              className="tab"
              role="tab"
              aria-selected={collection === 'genz'}
              onClick={() => setCollection('genz')}
            >
              Góc Gen Z
            </button>
          </div>
          <span className="muted editor-selection" role="status">
            {selectedItem
              ? `${selectedItem.item.name} · ${selectedItem.item.size.w}×${selectedItem.item.size.h} ô`
              : 'Chọn một món để bắt đầu'}
          </span>
        </div>
        <div className="editor-inv">
          {inventory.filter(({ item }) => collection === 'all' || GEN_Z_FURNITURE_IDS.has(item.id)).length ===
          0 ? (
            <span className="muted" style={{ fontSize: 13, padding: 12 }}>
              {collection === 'genz'
                ? 'Chưa có món Gen Z nào. Ghé Sofa So Good và chọn Góc Gen Z để sắm nhé.'
                : 'Bạn chưa sở hữu nội thất nào. Hãy ghé tiệm Sofa So Good trong thị trấn.'}
            </span>
          ) : (
            inventory
              .filter(({ item }) => collection === 'all' || GEN_Z_FURNITURE_IDS.has(item.id))
              .map(({ item, placed }) => (
                <button
                  key={item.id}
                  className="inv-slot"
                  aria-pressed={selected === item.id}
                  aria-label={`${item.name}, còn ${item.owned - placed} trên ${item.owned}`}
                  disabled={placed >= item.owned && selected !== item.id}
                  title={`${item.name} (còn ${item.owned - placed})`}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                >
                  <img src={itemIcon(item.sprite, 'furniture', item.size, 2)} alt="" />
                  <span className="inv-name">{item.name}</span>
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
