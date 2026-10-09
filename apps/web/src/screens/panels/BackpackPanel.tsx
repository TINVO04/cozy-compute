import {
  FISHING_RODS,
  FISH,
  HAIR_COLORS,
  HAIR_STYLES,
  RARITY_LABELS,
  SKIN_TONES,
  SWORDS,
  TOP_COLORS,
  normalizeRodId,
  normalizeSwordId,
  type Appearance,
  type HairStyle,
  type Rarity,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  CircleDollarSign,
  Hand,
  Package,
  RotateCcw,
  Shirt,
  Sparkles,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { setLocalAppearance, setLocalHeldFish } from '../../game/scenes';
import { avatarPortrait } from '../../art/avatar';
import { chibiAvatarFull, chibiAvatarPortrait, chibiItemIcon } from '../../art/chibi';
import { fishIcon, FISH_EFFECT_CLASS, ROD_EFFECT_CLASS } from '../../art/fish';
import { itemIcon } from '../../art/items';
import {
  api,
  formatDateSafe,
  num,
  type BackpackFish,
  type FishJournalEntry,
  type Me,
  type ShopItem,
} from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { useFishArt } from '../../lib/use-fish-art';
import {
  Button,
  CoinIcon,
  ConfirmDialog,
  EmptyState,
  LoadingState,
  Panel,
  toastError,
} from '../../ui/primitives';

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
  back: 'Cánh & Lưng',
  rod: 'Cần câu',
  sword: 'Kiếm',
  boat: 'Thuyền',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#38bdf8',
  epic: '#c084fc',
  legendary: '#fbbf24',
  defiant: '#fb7185',
  sovereign: '#67e8f9',
};

export function BackpackPanel({
  me,
  initialTab = 'backpack',
  onClose,
}: {
  me: Me;
  initialTab?: 'backpack' | 'tackle' | 'wardrobe' | 'profile';
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'backpack' | 'tackle' | 'wardrobe' | 'profile'>(initialTab);
  useFishArt();
  const qc = useQueryClient();
  const refresh = useRefreshEconomy();
  const setPanel = useUi((s) => s.setPanel);
  const room = useUi((s) => s.room);

  // Backpack fish query
  const fishQuery = useQuery({
    queryKey: ['backpack-fish'],
    queryFn: () => api<BackpackFish[]>('/backpack/fish'),
  });

  // Shop inventory query
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });

  // Fish journal query for compendium stats
  const journalQuery = useQuery({
    queryKey: ['fish-journal'],
    queryFn: () => api<FishJournalEntry[]>('/activities/fishing/journal'),
  });

  // Wardrobe draft state
  const [draft, setDraft] = useState({
    skin: me.appearance.skin,
    hairStyle: me.appearance.hairStyle,
    hairColor: me.appearance.hairColor,
    baseTop: me.appearance.baseTop,
  });
  const [status, setStatus] = useState(me.statusText);
  const [avatarStyle, setAvatarStyle] = useState<'chibi' | 'pixel'>('chibi');
  const [confirmSellAll, setConfirmSellAll] = useState(false);

  const preview: Appearance = { ...me.appearance, ...draft };
  const dirty =
    draft.skin !== me.appearance.skin ||
    draft.hairStyle !== me.appearance.hairStyle ||
    draft.hairColor !== me.appearance.hairColor ||
    draft.baseTop !== me.appearance.baseTop ||
    status !== me.statusText;

  // Hold fish mutation
  const holdFishMutation = useMutation({
    mutationFn: (fishId: string) =>
      api<{ ok: boolean; appearance: Appearance }>(`/backpack/fish/${fishId}/hold`, { method: 'POST' }),
    onSuccess: (data) => {
      play('click');
      setLocalAppearance(data.appearance);
      qc.invalidateQueries({ queryKey: ['backpack-fish'] });
      qc.setQueryData(qk.me, (old: Me | undefined) => (old ? { ...old, appearance: data.appearance } : old));
      useUi.getState().toast({
        kind: 'success',
        title: 'Đang cầm cá trên tay',
        body: 'Mọi người trong thị trấn sẽ nhìn thấy chú cá chiến lợi phẩm của bạn!',
      });
    },
    onError: (err) => toastError(err, 'Không thể cầm cá'),
  });

  // Unhold fish mutation
  const unholdFishMutation = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; appearance: Appearance }>('/backpack/fish/unhold', { method: 'POST' }),
    onSuccess: (data) => {
      play('click');
      setLocalHeldFish(null);
      setLocalAppearance(data.appearance);
      qc.invalidateQueries({ queryKey: ['backpack-fish'] });
      qc.setQueryData(qk.me, (old: Me | undefined) => (old ? { ...old, appearance: data.appearance } : old));
      useUi.getState().toast({
        kind: 'info',
        title: 'Đã cất cá vào balo (Phím F)',
        body: 'Bạn đã cất cá vào túi đồ.',
      });
    },
    onError: (err) => toastError(err, 'Không thể cất cá'),
  });

  // Sell individual fish mutation
  const sellFishMutation = useMutation({
    mutationFn: (fishId: string) =>
      api<{ ok: boolean; coinEarned: number; appearance?: Appearance }>(`/backpack/fish/${fishId}/sell`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      play('coin');
      qc.invalidateQueries({ queryKey: ['backpack-fish'] });
      refresh();
      if (data.appearance) {
        qc.setQueryData(qk.me, (old: Me | undefined) =>
          old ? { ...old, appearance: data.appearance! } : old,
        );
      }
      useUi.getState().toast({
        kind: 'reward',
        title: 'Bán cá thành công!',
        body: `+${num(data.coinEarned)} Xu đã được cộng vào tài khoản.`,
      });
    },
    onError: (err) => toastError(err, 'Không thể bán cá'),
  });

  // Sell all fish mutation
  const sellAllFishMutation = useMutation({
    mutationFn: () =>
      api<{ ok: boolean; totalCoin: number; count: number; appearance?: Appearance }>(
        '/backpack/fish/sell-all',
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      play('coin');
      setConfirmSellAll(false);
      qc.invalidateQueries({ queryKey: ['backpack-fish'] });
      refresh();
      if (data.appearance) {
        qc.setQueryData(qk.me, (old: Me | undefined) =>
          old ? { ...old, appearance: data.appearance! } : old,
        );
      }
      useUi.getState().toast({
        kind: 'reward',
        title: `Đã bán toàn bộ ${data.count} con cá!`,
        body: `+${num(data.totalCoin)} Xu đã được chuyển vào ví của bạn.`,
      });
    },
    onError: (err) => toastError(err, 'Không thể bán toàn bộ cá'),
  });

  // Save profile & appearance mutation
  const saveProfile = useMutation({
    mutationFn: () =>
      api<Me>('/me/profile', { method: 'PUT', body: { appearance: draft, statusText: status } }),
    onSuccess: (data) => {
      qc.setQueryData(qk.me, data);
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lưu diện mạo & hồ sơ',
        body: 'Thông tin nhân vật của bạn đã được cập nhật.',
      });
    },
    onError: (err) => toastError(err, 'Không thể lưu'),
  });

  // Equip clothing mutation
  const equipItem = useMutation({
    mutationFn: (v: {
      itemId: string | null;
      slot: 'hat' | 'top' | 'face' | 'back' | 'rod' | 'boat' | 'sword';
    }) => api<{ appearance: Appearance }>('/inventory/equip', { body: v }),
    onSuccess: (data, variables) => {
      refresh();
      if (data?.appearance) {
        setLocalAppearance(data.appearance);
      } else if (variables.slot === 'rod' && variables.itemId === null) {
        setLocalAppearance({ ...me.appearance, rod: null });
      }
    },
    onError: (err) => toastError(err, 'Không thể thay đổi trang bị'),
  });

  const fishList = useMemo(() => fishQuery.data ?? [], [fishQuery.data]);
  const heldFishInfo = useMemo(() => {
    if (!me.appearance.heldFish) return null;
    return fishList.find((f) => f.speciesId === me.appearance.heldFish?.speciesId);
  }, [me.appearance.heldFish, fishList]);
  const sellableFish = useMemo(
    () => fishList.filter((f) => !f.favorite && f.aquariumSlot === null && !f.isHeld),
    [fishList],
  );
  const totalBackpackCoin = useMemo(
    () => sellableFish.reduce((acc, f) => acc + f.coinValue, 0),
    [sellableFish],
  );
  const ownedClothing = (shop.data ?? []).filter(
    (i) =>
      (i.type === 'clothing' || i.type === 'rod' || i.type === 'boat' || i.type === 'sword') && i.owned > 0,
  );
  const [wardrobeFilter, setWardrobeFilter] = useState<
    'all' | 'hat' | 'top' | 'face' | 'back' | 'rod' | 'sword' | 'boat'
  >('all');
  const filteredOwnedClothing = useMemo(() => {
    if (wardrobeFilter === 'all') return ownedClothing;
    return ownedClothing.filter((i) => i.slot === wardrobeFilter);
  }, [ownedClothing, wardrobeFilter]);
  const equippedRodId = me.appearance.rod ? normalizeRodId(me.appearance.rod) : null;
  const allRodsList = useMemo(() => Object.values(FISHING_RODS), []);
  const ownedRodIds = useMemo(() => {
    const set = new Set<string>(['rod_twig']);
    for (const it of ownedClothing) {
      if (it.slot === 'rod' || it.type === 'rod') {
        set.add(normalizeRodId(it.id));
        if (it.sprite) set.add(normalizeRodId(it.sprite));
      }
    }
    return set;
  }, [ownedClothing]);
  const ownedRodsList = useMemo(() => {
    return allRodsList.filter((rod) => ownedRodIds.has(rod.id));
  }, [allRodsList, ownedRodIds]);
  const discoveredCount = journalQuery.data?.length ?? 0;

  return (
    <Panel
      icon={<Package size={20} />}
      eyebrow="Túi Đồ Cá Nhân"
      title="Balo, Tủ Đồ & Hồ Sơ"
      onClose={onClose}
    >
      <div className="stack" style={{ gap: 16 }}>
        {/* Navigation Tabs */}
        <div className="tabs" role="tablist">
          <button
            role="tab"
            className="tab"
            aria-selected={activeTab === 'backpack'}
            onClick={() => {
              setActiveTab('backpack');
              play('click');
            }}
          >
            <Package size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Balo & Ngư Sản ({fishList.length})
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={activeTab === 'tackle'}
            onClick={() => {
              setActiveTab('tackle');
              play('click');
            }}
          >
            <span style={{ marginRight: 6 }}>🎣</span>
            Tủ Dụng Cụ Câu Cá ({ownedRodIds.size})
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={activeTab === 'wardrobe'}
            onClick={() => {
              setActiveTab('wardrobe');
              play('click');
            }}
          >
            <Shirt size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Tủ Đồ Thời Trang
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={activeTab === 'profile'}
            onClick={() => {
              setActiveTab('profile');
              play('click');
            }}
          >
            <User size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
            Hồ Sơ & Danh Hiệu
          </button>
        </div>

        {/* TAB 1: BACKPACK & FISH */}
        {activeTab === 'backpack' ? (
          <div className="stack" style={{ gap: 16 }}>
            {/* Summary Bar */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.12))',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div className="stack" style={{ gap: 2 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#38bdf8' }}>
                  Kho Cá Trong Balo: {fishList.length} con
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  Tổng giá trị giao dịch ước tính: ~{num(totalBackpackCoin)} Xu
                </div>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => setPanel('fishdex')}>
                  <BookOpen size={14} /> Từ Điển Cá ({discoveredCount}/{FISH.length})
                </Button>
                {sellableFish.length > 0 ? (
                  <Button
                    variant="reward"
                    size="sm"
                    loading={sellAllFishMutation.isPending}
                    onClick={() => setConfirmSellAll(true)}
                  >
                    <CircleDollarSign size={14} /> Bán tất cả (+{num(totalBackpackCoin)} Xu)
                  </Button>
                ) : null}
              </div>
            </div>

            {/* Active Held Fish Showcase */}
            {me.appearance.heldFish ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(99, 102, 241, 0.18))',
                  border: '2px solid #38bdf8',
                  borderRadius: 14,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 68,
                      height: 78,
                      borderRadius: 10,
                      background: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <img
                      src={
                        avatarStyle === 'chibi'
                          ? chibiAvatarFull(me.appearance, 90, 110, { scale: 0.8, showFish: true })
                          : avatarPortrait(me.appearance, 3)
                      }
                      alt="Nhân vật cầm cá"
                      style={{
                        maxHeight: '100%',
                        imageRendering: avatarStyle === 'chibi' ? 'auto' : 'pixelated',
                      }}
                    />
                  </div>
                  <div className="stack" style={{ gap: 2 }}>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <span className="pill pill-primary" style={{ fontSize: 11, fontWeight: 700 }}>
                        ĐANG CẦM TRÊN TAY
                      </span>
                      <strong style={{ fontSize: 14, color: '#38bdf8' }}>
                        {heldFishInfo?.name ?? me.appearance.heldFish.speciesId}
                      </strong>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      Kích thước: <strong>{me.appearance.heldFish.sizeCm} cm</strong> · Mọi người trên phố đều
                      nhìn thấy!
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <div className="row" style={{ gap: 4 }}>
                    <button
                      type="button"
                      className={`btn btn-xs ${avatarStyle === 'chibi' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11 }}
                      onClick={() => setAvatarStyle('chibi')}
                    >
                      ✨ HD Chibi
                    </button>
                    <button
                      type="button"
                      className={`btn btn-xs ${avatarStyle === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 11 }}
                      onClick={() => setAvatarStyle('pixel')}
                    >
                      👾 Pixel
                    </button>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={unholdFishMutation.isPending}
                    onClick={() => unholdFishMutation.mutate()}
                    title="Cất cá vào túi đồ (Phím tắt F)"
                  >
                    <Package size={13} /> Cất vào balo (F)
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Fish List */}
            {fishQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : fishList.length === 0 ? (
              <EmptyState
                icon={<Package size={28} />}
                title="Balo hiện chưa có cá"
                body="Hãy ghé Cầu Tàu (Wobbly Pier) để thả cần câu! Cá bắt được sẽ nằm an toàn trong balo, bạn có thể chọn cầm trên tay khoe người chơi khác hoặc mang tới cửa hàng bán lấy Xu."
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 12,
                  maxHeight: '56vh',
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {fishList.map((fish) => {
                  const rarityColor = RARITY_COLORS[fish.rarity] ?? '#94a3b8';
                  return (
                    <div
                      key={fish.id}
                      style={{
                        background: fish.isHeld
                          ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.15))'
                          : 'var(--surface-1)',
                        border: fish.isHeld ? '2px solid #38bdf8' : `1px solid ${rarityColor}44`,
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        position: 'relative',
                        boxShadow: fish.isHeld ? '0 0 16px rgba(56, 189, 248, 0.3)' : undefined,
                      }}
                    >
                      {/* Held Badge */}
                      {fish.isHeld ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: '#38bdf8',
                            color: '#0f172a',
                          }}
                        >
                          Đang Cầm Trên Tay ✨
                        </div>
                      ) : null}

                      {/* Header with icon and info */}
                      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                        <div
                          className={`fish-3d-pedestal ${FISH_EFFECT_CLASS[fish.speciesId] ?? ''}`}
                          style={{
                            width: 68,
                            height: 54,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 10,
                            padding: 3,
                          }}
                        >
                          <img
                            src={fishIcon(fish.speciesId, 3)}
                            alt={fish.name}
                            className="fish-3d-float"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                            }}
                          />
                        </div>

                        <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                          <strong
                            style={{
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {fish.name}
                          </strong>
                          <div className="row" style={{ gap: 6, fontSize: 11 }}>
                            <span style={{ color: rarityColor, fontWeight: 700 }}>
                              {RARITY_LABELS[fish.rarity as Rarity] ?? fish.rarity}
                            </span>
                            <span className="muted">·</span>
                            <span style={{ color: '#38bdf8' }}>{fish.sizeCm} cm</span>
                          </div>
                          <div className="muted" style={{ fontSize: 11 }}>
                            Nặng: {fish.weightKg} kg
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
                        {fish.isHeld ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            style={{ flex: 1 }}
                            loading={unholdFishMutation.isPending}
                            onClick={() => unholdFishMutation.mutate()}
                            title="Cất cá vào túi đồ (Phím tắt F)"
                          >
                            Cất vào balo (F)
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            style={{ flex: 1 }}
                            loading={holdFishMutation.isPending}
                            onClick={() => holdFishMutation.mutate(fish.id)}
                          >
                            <Hand size={13} /> Cầm trên tay
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="reward"
                          disabled={fish.favorite || fish.aquariumSlot !== null || fish.isHeld}
                          loading={sellFishMutation.isPending}
                          onClick={() => sellFishMutation.mutate(fish.id)}
                        >
                          <CoinIcon size={12} /> Bán (+{fish.coinValue})
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* TAB 2: FISHING TACKLE CLOSET (TỦ DỤNG CỤ CÂU CÁ) */}
        {activeTab === 'tackle' ? (
          <div className="stack" style={{ gap: 16 }}>
            {/* Guide & Tip Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(59, 130, 246, 0.12))',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'rgba(6, 182, 212, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  🎣
                </div>
                <div className="stack" style={{ gap: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8' }}>
                    Tủ Cần Câu Cá Của Bạn ({ownedRodsList.length} chiếc)
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Chỉ hiển thị các cần câu bạn đã sở hữu. Cầm cần trên tay để tự do di chuyển (WASD) khắp
                    thị trấn tới hồ câu!
                  </div>
                </div>
              </div>

              <div className="row" style={{ gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => setPanel('fishdex')}>
                  <BookOpen size={14} /> Từ Điển Cá
                </Button>
              </div>
            </div>

            {/* Currently Equipped Rod Showcase */}
            {equippedRodId && FISHING_RODS[equippedRodId] ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(168, 85, 247, 0.15))',
                  border: '2px solid #38bdf8',
                  borderRadius: 14,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                <div className="row" style={{ gap: 14, alignItems: 'center' }}>
                  <div
                    className={ROD_EFFECT_CLASS[equippedRodId] ?? ''}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 10,
                      background: 'rgba(0, 0, 0, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <img
                      src={itemIcon(equippedRodId, 'rod', { w: 1, h: 1 }, 4)}
                      alt={FISHING_RODS[equippedRodId].name}
                      style={{ maxHeight: '85%', maxWidth: '85%', objectFit: 'contain' }}
                    />
                  </div>
                  <div className="stack" style={{ gap: 3 }}>
                    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                      <span className="pill pill-primary" style={{ fontSize: 11, fontWeight: 700 }}>
                        ĐANG CẦM TRÊN TAY
                      </span>
                      <strong style={{ fontSize: 14, color: '#38bdf8' }}>
                        {FISHING_RODS[equippedRodId].name}
                      </strong>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {FISHING_RODS[equippedRodId].description}
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  loading={equipItem.isPending && equipItem.variables?.slot === 'rod'}
                  onClick={() => equipItem.mutate({ itemId: null, slot: 'rod' })}
                  title="Cất cần câu vào tủ/túi đồ (Phím tắt F)"
                >
                  Cất cần vào tủ (F)
                </Button>
              </div>
            ) : null}

            {/* Owned Rods Grid */}
            {ownedRodsList.length === 0 ? (
              <EmptyState
                icon={<Package size={26} />}
                title="Chưa có cần câu nào trong tủ đồ"
                body="Hãy di chuyển đến Tiệm Ngư Cụ ở khu vực phía đông thị trấn để trang bị chiếc cần câu đầu tiên nhé!"
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 14,
                }}
              >
                {ownedRodsList.map((rod) => {
                  const isEquipped = equippedRodId === rod.id;
                  const rarityColor = RARITY_COLORS[rod.rarity] ?? '#94a3b8';
                  const fxClass = ROD_EFFECT_CLASS[rod.id] ?? '';

                  return (
                    <div
                      key={rod.id}
                      className={`card ${fxClass}`}
                      style={{
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        position: 'relative',
                        border: isEquipped ? '2px solid #38bdf8' : `1px solid ${rarityColor}44`,
                        background: isEquipped
                          ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, var(--surface-1) 100%)'
                          : 'var(--surface-1)',
                        boxShadow: isEquipped ? '0 0 16px rgba(56, 189, 248, 0.25)' : undefined,
                      }}
                    >
                      {isEquipped ? (
                        <span
                          className="pill pill-primary"
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            fontSize: 10,
                            fontWeight: 700,
                            zIndex: 2,
                          }}
                        >
                          ✓ Đang Cầm
                        </span>
                      ) : null}

                      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(0, 0, 0, 0.28)',
                            borderRadius: 10,
                            padding: 4,
                            border: `1px solid ${rarityColor}33`,
                          }}
                        >
                          <img
                            src={itemIcon(rod.id, 'rod', { w: 1, h: 1 }, 4)}
                            alt={rod.name}
                            style={{
                              maxWidth: '90%',
                              maxHeight: '90%',
                              objectFit: 'contain',
                              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                            }}
                          />
                        </div>

                        <div className="stack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                          <strong
                            style={{
                              fontSize: 14,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {rod.name}
                          </strong>
                          <div className="row" style={{ gap: 6, fontSize: 11 }}>
                            <span style={{ color: rarityColor, fontWeight: 700 }}>
                              {RARITY_LABELS[rod.rarity]}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p
                        className="muted"
                        style={{
                          margin: 0,
                          fontSize: 12,
                          lineHeight: 1.45,
                          minHeight: 34,
                        }}
                      >
                        {rod.description}
                      </p>

                      {/* Stat Badges */}
                      <div className="row wrap" style={{ gap: 6, fontSize: 11 }}>
                        <span
                          className="pill"
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            fontSize: 11,
                            padding: '2px 8px',
                          }}
                        >
                          <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                          Cá hiếm/bóng lớn: +{(rod.shadowBonus * 100).toFixed(0)}%
                        </span>
                        <span
                          className="pill"
                          style={{
                            background: 'rgba(251, 191, 36, 0.12)',
                            color: '#fbbf24',
                            fontSize: 11,
                            padding: '2px 8px',
                          }}
                        >
                          <Zap size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                          Phản xạ: +{rod.reactionBonusMs}ms
                        </span>
                        <span
                          className="pill"
                          style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            color: '#c084fc',
                            fontSize: 11,
                            padding: '2px 8px',
                          }}
                        >
                          Cắn mồi: +{(rod.biteSpeedBonus * 100).toFixed(0)}%
                        </span>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                        {isEquipped ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            block
                            loading={equipItem.isPending && equipItem.variables?.slot === 'rod'}
                            onClick={() => equipItem.mutate({ itemId: null, slot: 'rod' })}
                          >
                            Cất cần vào tủ
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            block
                            loading={equipItem.isPending && equipItem.variables?.itemId === rod.id}
                            onClick={() => equipItem.mutate({ itemId: rod.id, slot: 'rod' })}
                          >
                            🎣 Cầm cần trên tay
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* TAB 3: WARDROBE & APPEARANCE */}
        {activeTab === 'wardrobe' ? (
          <div className="split">
            <div className="sticky stack">
              <div className="preview-stage" style={{ position: 'relative' }}>
                <img
                  src={
                    avatarStyle === 'chibi' ? chibiAvatarPortrait(preview, 160) : avatarPortrait(preview, 6)
                  }
                  alt="Xem trước diện mạo"
                  style={{
                    imageRendering: avatarStyle === 'chibi' ? 'auto' : 'pixelated',
                    filter: avatarStyle === 'chibi' ? 'drop-shadow(0 8px 18px rgba(0,0,0,0.35))' : 'none',
                  }}
                />
              </div>
              <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
                <button
                  type="button"
                  className={`btn btn-xs ${avatarStyle === 'chibi' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setAvatarStyle('chibi')}
                >
                  ✨ 2D HD Chibi
                </button>
                <button
                  type="button"
                  className={`btn btn-xs ${avatarStyle === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => setAvatarStyle('pixel')}
                >
                  👾 Pixel Cổ Điển
                </button>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pill pill-primary">{me.title}</span>
                {dirty ? (
                  <Button variant="ghost" size="sm" onClick={() => setDraft(me.appearance)}>
                    <RotateCcw size={14} /> Hoàn tác
                  </Button>
                ) : null}
              </div>
              <Button
                variant="primary"
                disabled={!dirty}
                loading={saveProfile.isPending}
                onClick={() => saveProfile.mutate()}
              >
                <Check size={16} /> Lưu diện mạo
              </Button>
            </div>

            <div className="stack" style={{ gap: 20 }}>
              {/* Currently Equipped Slots */}
              <section className="stack" style={{ gap: 8 }}>
                <div className="row between" style={{ alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Đang trang bị</h3>
                  <div className="row" style={{ gap: 6 }}>
                    <Button size="sm" variant="ghost" onClick={() => setPanel('shop-fashion')}>
                      👗 Cửa hàng thời trang
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPanel('shop-rods')}>
                      🎣 Tiệm cần câu
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPanel('shop-swords')}>
                      ⚔ Tiệm vũ khí
                    </Button>
                  </div>
                </div>
                <div className="wardrobe-slots">
                  {(['hat', 'top', 'face', 'back', 'rod', 'sword'] as const).map((slot) => {
                    const currentSprite = me.appearance[slot];
                    const normalized =
                      slot === 'rod' && currentSprite
                        ? normalizeRodId(currentSprite)
                        : slot === 'sword' && currentSprite
                          ? normalizeSwordId(currentSprite)
                          : currentSprite;
                    const currentItem = ownedClothing.find(
                      (i) =>
                        i.slot === slot &&
                        (slot === 'rod'
                          ? normalizeRodId(i.id) === normalized || normalizeRodId(i.sprite) === normalized
                          : slot === 'sword'
                            ? normalizeSwordId(i.id) === normalized ||
                              normalizeSwordId(i.sprite) === normalized
                            : i.sprite === currentSprite || i.id === currentSprite),
                    );
                    const displayName =
                      currentItem?.name ??
                      (slot === 'rod' && normalized
                        ? (FISHING_RODS[normalized]?.name ?? 'Cần Cành Cây')
                        : slot === 'sword' && normalized
                          ? (SWORDS[normalized]?.name ?? 'Kiếm Tập Sự')
                          : currentSprite
                            ? 'Mặc định'
                            : 'Chưa trang bị');
                    return (
                      <div key={slot} className="wardrobe-slot-card">
                        <div className="wardrobe-slot-header">
                          <span>{SLOT_NAMES[slot]}</span>
                          {currentSprite ? (
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => equipItem.mutate({ itemId: null, slot })}
                            >
                              Gỡ bỏ
                            </button>
                          ) : null}
                        </div>
                        <div className="wardrobe-slot-current">
                          {currentSprite ? (
                            <img
                              src={
                                slot === 'rod'
                                  ? itemIcon(normalized ?? 'rod_twig', 'rod', { w: 1, h: 1 }, 3)
                                  : slot === 'sword'
                                    ? itemIcon(normalized ?? 'sword_training', 'sword', { w: 1, h: 1 }, 3)
                                    : chibiItemIcon(currentSprite, slot, 48)
                              }
                              alt=""
                              style={{ width: 44, height: 44, objectFit: 'contain' }}
                            />
                          ) : (
                            <span className="muted" style={{ fontSize: 12 }}>
                              Trống
                            </span>
                          )}
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Owned Clothing & Equipment Wardrobe */}
              <section className="stack" style={{ gap: 10 }}>
                <div className="row between wrap" style={{ alignItems: 'center', gap: 8 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Kho Trang Phục & Cần Câu Của Bạn</h3>
                    <span className="pill pill-primary" style={{ fontWeight: 700 }}>
                      {ownedClothing.length} món
                    </span>
                  </div>

                  {/* Filter tabs */}
                  <div className="tabs" role="tablist" style={{ margin: 0, fontSize: 12 }}>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'all'}
                      onClick={() => setWardrobeFilter('all')}
                    >
                      Tất cả ({ownedClothing.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'hat'}
                      onClick={() => setWardrobeFilter('hat')}
                    >
                      Mũ nón
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'top'}
                      onClick={() => setWardrobeFilter('top')}
                    >
                      Trang phục
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'face'}
                      onClick={() => setWardrobeFilter('face')}
                    >
                      Phụ kiện mặt
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'back'}
                      onClick={() => setWardrobeFilter('back')}
                    >
                      Cánh & Lưng
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'rod'}
                      onClick={() => setWardrobeFilter('rod')}
                    >
                      Cần câu
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'sword'}
                      onClick={() => setWardrobeFilter('sword')}
                    >
                      Kiếm
                    </button>
                    <button
                      type="button"
                      role="tab"
                      className="tab"
                      aria-selected={wardrobeFilter === 'boat'}
                      onClick={() => setWardrobeFilter('boat')}
                    >
                      Thuyền bè
                    </button>
                  </div>
                </div>

                {ownedClothing.length === 0 ? (
                  <EmptyState
                    icon={<Shirt size={26} />}
                    title="Chưa có món đồ thời trang nào trong tủ đồ"
                    body="Hãy di chuyển đến Cửa hàng Thời trang hoặc Tiệm Ngư cụ trong thị trấn để sắm thêm trang phục và cần câu nhé!"
                  />
                ) : filteredOwnedClothing.length === 0 ? (
                  <div className="muted" style={{ padding: '16px 0', textAlign: 'center', fontSize: 13 }}>
                    Không có món đồ nào thuộc danh mục này trong tủ đồ.
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {filteredOwnedClothing.map((item) => {
                      const isEquipped = item.equipped;
                      const rarityColor = RARITY_COLORS[item.rarity] ?? '#94a3b8';
                      return (
                        <div
                          key={item.id}
                          className="card"
                          style={{
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            position: 'relative',
                            border: isEquipped ? '1.5px solid #38bdf8' : '1px solid var(--border)',
                            background: isEquipped
                              ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, var(--surface-1) 100%)'
                              : 'var(--surface-1)',
                          }}
                        >
                          {isEquipped ? (
                            <span
                              className="pill pill-primary"
                              style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 6px',
                                zIndex: 2,
                              }}
                            >
                              ✓{' '}
                              {item.type === 'sword'
                                ? 'Đang vác kiếm'
                                : item.type === 'rod'
                                  ? 'Đang cầm'
                                  : item.type === 'boat'
                                    ? 'Đang trang bị'
                                    : item.slot === 'back'
                                      ? 'Đang đeo cánh'
                                      : 'Đang mặc'}
                            </span>
                          ) : null}

                          <div
                            style={{
                              height: 90,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0, 0, 0, 0.25)',
                              borderRadius: 8,
                              overflow: 'hidden',
                            }}
                          >
                            <img
                              src={
                                item.slot === 'rod'
                                  ? itemIcon(item.sprite, 'rod', item.size, 4)
                                  : item.slot === 'sword'
                                    ? itemIcon(item.sprite, 'sword', item.size, 4)
                                    : item.slot === 'boat'
                                      ? itemIcon(item.id, 'boat')
                                      : chibiItemIcon(
                                          item.sprite,
                                          (item.slot as 'hat' | 'top' | 'face' | 'back') ?? 'top',
                                          72,
                                        )
                              }
                              alt={item.name}
                              style={{
                                maxHeight: '82%',
                                maxWidth: '82%',
                                objectFit: 'contain',
                                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.4))',
                              }}
                            />
                          </div>

                          <div className="stack" style={{ gap: 2 }}>
                            <strong
                              style={{
                                fontSize: 13,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.name}
                            </strong>
                            <div className="row" style={{ gap: 6, fontSize: 11 }}>
                              <span style={{ color: rarityColor, fontWeight: 700 }}>
                                {RARITY_LABELS[item.rarity as Rarity] ?? item.rarity}
                              </span>
                              <span className="muted">·</span>
                              <span className="muted">{SLOT_NAMES[item.slot ?? ''] ?? item.slot}</span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant={isEquipped ? 'secondary' : 'primary'}
                            block
                            style={{ marginTop: 'auto' }}
                            loading={equipItem.isPending && equipItem.variables?.slot === item.slot}
                            onClick={() => {
                              if (item.slot === 'boat' && isEquipped && room?.kind === 'ocean') {
                                play('pop');
                                useUi.getState().toast({
                                  kind: 'info',
                                  title: 'Không thể cất thuyền',
                                  body: 'Bạn đang lái thuyền trên sông, hãy cập bến cảng trước khi cất thuyền vào ba lô nhé!',
                                });
                                return;
                              }
                              equipItem.mutate({
                                itemId: isEquipped ? null : item.id,
                                slot: item.slot as 'hat' | 'top' | 'face' | 'back' | 'rod' | 'boat' | 'sword',
                              });
                            }}
                          >
                            {isEquipped
                              ? item.type === 'sword'
                                ? 'Hạ kiếm'
                                : item.type === 'rod'
                                  ? 'Cất cần'
                                  : item.type === 'boat'
                                    ? 'Tháo thuyền'
                                    : item.slot === 'back'
                                      ? 'Tháo cánh'
                                      : 'Tháo ra'
                              : item.type === 'sword'
                                ? 'Vác kiếm'
                                : item.type === 'rod'
                                  ? 'Trang bị'
                                  : item.type === 'boat'
                                    ? 'Trang bị'
                                    : item.slot === 'back'
                                      ? 'Đeo cánh'
                                      : 'Mặc vào'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Skin Tone */}
              <section className="stack" style={{ gap: 8 }}>
                <h3>Màu da</h3>
                <div className="palette" role="radiogroup" aria-label="Màu da">
                  {SKIN_TONES.map((hex, idx) => (
                    <button
                      key={hex}
                      type="button"
                      role="radio"
                      aria-checked={draft.skin === idx}
                      className="swatch"
                      style={{ background: hex }}
                      onClick={() => setDraft({ ...draft, skin: idx })}
                    />
                  ))}
                </div>
              </section>

              {/* Hair Style & Color */}
              <section className="stack" style={{ gap: 8 }}>
                <h3>Kiểu tóc</h3>
                <div className="radio-grid">
                  {HAIR_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      className={`btn btn-${draft.hairStyle === style ? 'primary' : 'secondary'} btn-sm`}
                      onClick={() => setDraft({ ...draft, hairStyle: style })}
                    >
                      {HAIR_STYLE_NAMES[style]}
                    </button>
                  ))}
                </div>
                <div className="palette" role="radiogroup" aria-label="Màu tóc" style={{ marginTop: 8 }}>
                  {HAIR_COLORS.map((hex, idx) => (
                    <button
                      key={hex}
                      type="button"
                      role="radio"
                      aria-checked={draft.hairColor === idx}
                      className="swatch"
                      style={{ background: hex }}
                      onClick={() => setDraft({ ...draft, hairColor: idx })}
                    />
                  ))}
                </div>
              </section>

              {/* Base Top Color */}
              <section className="stack" style={{ gap: 8 }}>
                <h3>Màu áo mặc định</h3>
                <div className="palette" role="radiogroup" aria-label="Màu áo mặc định">
                  {TOP_COLORS.map((hex, idx) => (
                    <button
                      key={hex}
                      type="button"
                      role="radio"
                      aria-checked={draft.baseTop === idx}
                      className="swatch"
                      style={{ background: hex }}
                      onClick={() => setDraft({ ...draft, baseTop: idx })}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}

        {/* TAB 3: PROFILE & RECORDS */}
        {activeTab === 'profile' ? (
          <div className="stack" style={{ gap: 16 }}>
            <div
              style={{
                display: 'flex',
                gap: 18,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 18,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 104,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={
                    avatarStyle === 'chibi'
                      ? chibiAvatarPortrait(me.appearance, 120)
                      : avatarPortrait(me.appearance, 4)
                  }
                  alt={me.displayName}
                  style={{
                    maxHeight: '92%',
                    imageRendering: avatarStyle === 'chibi' ? 'auto' : 'pixelated',
                  }}
                />
              </div>

              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>{me.displayName}</h2>
                  <span className="pill pill-primary">{me.title}</span>
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Gia nhập Cozy Town: {formatDateSafe(me.createdAt)}
                </div>
                <div className="row" style={{ gap: 16, marginTop: 4 }}>
                  <span className="row" style={{ gap: 6, fontSize: 14, fontWeight: 700 }}>
                    <CoinIcon size={16} /> {num(me.balances.coin)} Xu
                  </span>
                  <span
                    className="row"
                    style={{ gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--reward)' }}
                  >
                    <Trophy size={16} /> {num(me.balances.fame)} Danh tiếng
                  </span>
                </div>
              </div>
            </div>

            {/* Custom Status Text */}
            <section className="stack" style={{ gap: 6 }}>
              <label htmlFor="profile-status" style={{ fontWeight: 600, fontSize: 14 }}>
                Trạng thái hoạt động
              </label>
              <div className="row" style={{ gap: 8 }}>
                <input
                  id="profile-status"
                  type="text"
                  maxLength={60}
                  placeholder="Ví dụ: Đang đi câu cá ngoài bến tàu…"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                />
                <Button
                  variant="primary"
                  disabled={status === me.statusText}
                  loading={saveProfile.isPending}
                  onClick={() => saveProfile.mutate()}
                >
                  Cập nhật
                </Button>
              </div>
            </section>

            {/* Fish Compendium Card */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.15))',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div className="stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 16, color: '#38bdf8' }}>
                  <BookOpen size={20} style={{ color: '#f59e0b' }} />
                  Bách Khoa Thủy Cung
                </span>
                <span className="muted" style={{ fontSize: 13 }}>
                  Bạn đã thu phục {discoveredCount} / 55 loài cá bí ẩn!
                </span>
              </div>
              <Button
                variant="primary"
                onClick={() => {
                  onClose();
                  setPanel('fishdex');
                }}
              >
                Mở Từ Điển Cá Chi Tiết
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Confirm Sell All Dialog */}
      {confirmSellAll ? (
        <ConfirmDialog
          title="Bán tất cả cá trong balo?"
          body={`Bán ${sellableFish.length} con cá chưa được giữ hoặc trưng bày để nhận +${num(totalBackpackCoin)} Xu? Cá yêu thích, cá trong bể và cá đang cầm được giữ lại.`}
          confirmLabel={`Bán tất cả (+${num(totalBackpackCoin)} Xu)`}
          loading={sellAllFishMutation.isPending}
          onConfirm={() => sellAllFishMutation.mutate()}
          onClose={() => setConfirmSellAll(false)}
        />
      ) : null}
    </Panel>
  );
}
