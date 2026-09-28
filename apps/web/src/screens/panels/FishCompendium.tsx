import { FISH, type FishHabitat, type FishSpecies } from '@cozy/game-data';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, HelpCircle, Lock, Search, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fishIcon, fishRenderDimensions, FISH_EFFECT_CLASS } from '../../art/fish';
import { api, formatDateSafe, type FishJournalEntry } from '../../lib/api';
import { play } from '../../lib/sound';
import { Button, CoinIcon, EmptyState, Modal, Panel, Progress } from '../../ui/primitives';

type FishRarity = 'common' | 'rare' | 'epic' | 'legendary';

const HABITAT_LABELS: Record<FishHabitat, string> = {
  ocean: 'Biển Cả',
  freshwater: 'Nước Ngọt',
  mythic: 'Huyền Bí',
};

const DEFAULT_RARITY = { label: 'Phổ biến', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };

const RARITY_LABELS: Record<FishRarity, { label: string; color: string; bg: string }> = {
  common: { label: 'Phổ biến', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  rare: { label: 'Hiếm có', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  epic: { label: 'Sử thi', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)' },
  legendary: { label: 'Huyền thoại', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)' },
};

export function FishCompendium({ onClose }: { onClose: () => void }) {
  const [habitat, setHabitat] = useState<FishHabitat | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'caught' | 'uncaught'>('all');
  const [search, setSearch] = useState('');
  const [inspectFish, setInspectFish] = useState<{ fish: FishSpecies; entry?: FishJournalEntry } | null>(
    null,
  );

  const journalQuery = useQuery({
    queryKey: ['fish-journal'],
    queryFn: () => api<FishJournalEntry[]>('/activities/fishing/journal'),
    staleTime: 5000,
  });

  const journalMap = useMemo(() => {
    const map = new Map<string, FishJournalEntry>();
    for (const entry of journalQuery.data ?? []) {
      map.set(entry.speciesId, entry);
    }
    return map;
  }, [journalQuery.data]);

  const speciesQuery = useQuery({
    queryKey: ['fish-species'],
    queryFn: () => api<FishSpecies[]>('/activities/fishing/species').catch(() => FISH),
    staleTime: 60000,
  });

  const allSpecies = speciesQuery.data ?? FISH;

  const totalSpecies = allSpecies.length;
  const caughtSpeciesCount = journalMap.size;
  const progressPercent = Math.round((caughtSpeciesCount / totalSpecies) * 100);

  const filteredFish = useMemo(() => {
    return allSpecies.filter((f) => {
      if (habitat !== 'all' && f.habitat !== habitat) return false;
      const isCaught = journalMap.has(f.id);
      if (statusFilter === 'caught' && !isCaught) return false;
      if (statusFilter === 'uncaught' && isCaught) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        // If uncaught, search matches only if they search habitat or ???
        if (isCaught) {
          return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
        } else {
          return HABITAT_LABELS[f.habitat].toLowerCase().includes(q);
        }
      }
      return true;
    });
  }, [allSpecies, habitat, statusFilter, search, journalMap]);

  return (
    <Panel
      icon={<BookOpen size={20} />}
      eyebrow="Bách Khoa Toàn Thư"
      title="Từ Điển Cá & Sinh Vật Thủy Cung"
      onClose={onClose}
    >
      <div className="stack" style={{ gap: 16 }}>
        {/* Progress header banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(99, 102, 241, 0.15))',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: 14,
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 15, color: '#38bdf8' }}>
              <Trophy size={18} style={{ color: '#f59e0b' }} />
              Tiến Độ Khai Phá Thủy Cung
            </span>
            <span className="pill pill-primary" style={{ fontWeight: 700 }}>
              {caughtSpeciesCount} / {totalSpecies} loài ({progressPercent}%)
            </span>
          </div>
          <Progress value={caughtSpeciesCount} max={totalSpecies} />
          <div className="muted" style={{ fontSize: 12 }}>
            Khám phá trọn bộ 55 loài cá bí ẩn nước mặn, nước ngọt và huyền tích cổ xưa tại Wobbly Pier!
          </div>
        </div>

        {/* Filter controls */}
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          <div className="tabs" role="tablist">
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'all'}
              onClick={() => {
                setHabitat('all');
                play('click');
              }}
            >
              Tất cả ({totalSpecies})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'ocean'}
              onClick={() => {
                setHabitat('ocean');
                play('click');
              }}
            >
              Biển Cả ({allSpecies.filter((f) => f.habitat === 'ocean').length})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'freshwater'}
              onClick={() => {
                setHabitat('freshwater');
                play('click');
              }}
            >
              Nước Ngọt ({allSpecies.filter((f) => f.habitat === 'freshwater').length})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'mythic'}
              onClick={() => {
                setHabitat('mythic');
                play('click');
              }}
            >
              Huyền Bí ({allSpecies.filter((f) => f.habitat === 'mythic').length})
            </button>
          </div>

          <div className="row" style={{ gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm loài cá…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '6px 12px 6px 28px',
                  fontSize: 13,
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
              <Search
                size={14}
                style={{ position: 'absolute', left: 8, top: 9, color: 'var(--text-muted)' }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'caught' | 'uncaught')}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <option value="all">Mọi trạng thái</option>
              <option value="caught">Đã bắt</option>
              <option value="uncaught">Chưa bắt</option>
            </select>
          </div>
        </div>

        {/* Fish Card Grid */}
        {filteredFish.length === 0 ? (
          <EmptyState
            icon={<HelpCircle size={28} />}
            title="Không tìm thấy sinh vật phù hợp"
            body="Hãy thử thay đổi từ khóa hoặc bộ lọc môi trường sinh thái."
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: 12,
              maxHeight: '62vh',
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {filteredFish.map((fish) => {
              const entry = journalMap.get(fish.id);
              const isCaught = Boolean(entry);
              const rarityMeta = RARITY_LABELS[fish.rarity as FishRarity] ?? DEFAULT_RARITY;

              return (
                <div
                  key={fish.id}
                  className={isCaught ? (FISH_EFFECT_CLASS[fish.id] ?? '') : ''}
                  onClick={() => {
                    play('click');
                    setInspectFish({ fish, entry });
                  }}
                  style={{
                    background: isCaught ? 'var(--surface-1)' : 'rgba(15, 23, 42, 0.45)',
                    border: isCaught
                      ? `1px solid ${rarityMeta.color}44`
                      : '1px dashed rgba(148, 163, 184, 0.25)',
                    borderRadius: 12,
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    boxShadow: isCaught ? `0 4px 12px ${rarityMeta.color}15` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = isCaught ? rarityMeta.color : 'var(--primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = isCaught
                      ? `${rarityMeta.color}44`
                      : 'rgba(148, 163, 184, 0.25)';
                  }}
                >
                  {/* Habitat badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 6,
                      background: 'rgba(15, 23, 42, 0.7)',
                      color: '#94a3b8',
                    }}
                  >
                    {HABITAT_LABELS[fish.habitat]}
                  </div>

                  {/* Catch count badge */}
                  {isCaught ? (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: rarityMeta.bg,
                        color: rarityMeta.color,
                        border: `1px solid ${rarityMeta.color}55`,
                      }}
                    >
                      x{entry?.count}
                    </div>
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        color: '#64748b',
                      }}
                    >
                      <Lock size={12} />
                    </div>
                  )}

                  {/* Pixel Art Sprite */}
                  <div
                    style={{
                      height: 80,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 10,
                    }}
                  >
                    <img
                      src={fishIcon(fish.id, 3, !isCaught)}
                      alt={isCaught ? fish.name : 'Chưa khám phá'}
                      className={isCaught ? 'fish-3d-float' : ''}
                      style={{
                        maxWidth: '90%',
                        maxHeight: '90%',
                        objectFit: 'contain',
                        imageRendering: 'pixelated',
                      }}
                    />
                  </div>

                  {/* Name and stats */}
                  <div className="stack" style={{ gap: 2, textAlign: 'center', width: '100%' }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: isCaught ? 'var(--text)' : '#64748b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={isCaught ? fish.name : '???'}
                    >
                      {isCaught ? fish.name : '???'}
                    </div>

                    <div className="row" style={{ justifyContent: 'center', gap: 6, fontSize: 11 }}>
                      <span style={{ color: rarityMeta.color, fontWeight: 600 }}>{rarityMeta.label}</span>
                    </div>

                    {isCaught && entry ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#38bdf8',
                          fontWeight: 600,
                          marginTop: 2,
                          background: 'rgba(56, 189, 248, 0.1)',
                          borderRadius: 4,
                          padding: '2px 4px',
                        }}
                      >
                        Kỷ lục: {entry.maxSizeCm} cm
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: '#475569', fontStyle: 'italic' }}>Chưa thu phục</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail inspection modal */}
      {inspectFish ? (
        <FishDetailModal
          fish={inspectFish.fish}
          entry={inspectFish.entry}
          onClose={() => setInspectFish(null)}
        />
      ) : null}
    </Panel>
  );
}

function FishDetailModal({
  fish,
  entry,
  onClose,
}: {
  fish: FishSpecies;
  entry?: FishJournalEntry;
  onClose: () => void;
}) {
  const isCaught = Boolean(entry);
  const rarity = RARITY_LABELS[fish.rarity as FishRarity] ?? DEFAULT_RARITY;
  const { displayScale } = fishRenderDimensions(fish.id, entry?.maxSizeCm);

  return (
    <Modal
      title={isCaught ? fish.name : 'Sinh Vật Chưa Khám Phá (???)'}
      onClose={onClose}
      width={480}
      footer={
        <Button variant="primary" block onClick={onClose}>
          Đóng
        </Button>
      }
    >
      <div className="stack" style={{ gap: 18, alignItems: 'center' }}>
        {/* Big 3D Render Studio Showcase Display */}
        <div
          className={`fish-3d-pedestal ${isCaught ? (FISH_EFFECT_CLASS[fish.id] ?? '') : ''}`}
          style={{
            width: '100%',
            height: 190,
            border: `1.5px solid ${isCaught ? rarity.color : 'rgba(148, 163, 184, 0.2)'}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {isCaught ? (
            <div
              style={{
                position: 'absolute',
                top: 10,
                left: 12,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.5,
                color: rarity.color,
                background: 'rgba(15, 23, 42, 0.75)',
                border: `1px solid ${rarity.color}44`,
                padding: '2px 8px',
                borderRadius: 6,
                backdropFilter: 'blur(4px)',
                zIndex: 2,
              }}
            >
              ✨ PHÒNG TRƯNG BÀY PIXEL ART
            </div>
          ) : null}

          <img
            src={fishIcon(fish.id, displayScale, !isCaught)}
            alt={isCaught ? fish.name : '???'}
            className={isCaught ? 'fish-3d-float' : ''}
            style={{
              maxWidth: '85%',
              maxHeight: '85%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
              cursor: isCaught ? 'grab' : 'default',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 12,
              fontSize: 11,
              color: '#94a3b8',
              background: 'rgba(0,0,0,0.6)',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            Môi trường: {HABITAT_LABELS[fish.habitat]}
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span
            className="pill"
            style={{
              background: rarity.bg,
              color: rarity.color,
              borderColor: rarity.color,
              fontWeight: 700,
            }}
          >
            {rarity.label}
          </span>
          <span className="pill pill-primary">Khu vực: {HABITAT_LABELS[fish.habitat]}</span>
          {isCaught ? (
            <span className="pill" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
              Đã bắt: {entry?.count} lần
            </span>
          ) : (
            <span className="pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              Chưa bắt được
            </span>
          )}
        </div>

        {/* Lore Description */}
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            textAlign: 'center',
            color: isCaught ? 'var(--text)' : 'var(--text-muted)',
            fontStyle: isCaught ? 'normal' : 'italic',
            padding: '0 12px',
          }}
        >
          {isCaught
            ? fish.description
            : 'Loài cá bí ẩn mang hình dáng kỳ lạ này vẫn đang bơi lội dưới đáy sâu. Hãy thả cần câu thật chuẩn xác tại bến Wobbly Pier để khai phá nó!'}
        </div>

        {/* Personal Best Catch Record */}
        {isCaught && entry ? (
          <div
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            <div className="stack" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 11 }}>
                Chiều dài kỷ lục
              </span>
              <strong style={{ fontSize: 16, color: '#38bdf8' }}>{entry.maxSizeCm} cm</strong>
              <span className="muted" style={{ fontSize: 10 }}>
                (Khoảng size: {fish.minSizeCm} - {fish.maxSizeCm} cm)
              </span>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 11 }}>
                Cân nặng kỷ lục
              </span>
              <strong style={{ fontSize: 16, color: '#f59e0b' }}>{entry.maxWeightKg} kg</strong>
              <span className="muted" style={{ fontSize: 10 }}>
                Thước đo tỷ lệ thực tế
              </span>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 11 }}>
                Lần đầu bắt được
              </span>
              <span style={{ fontSize: 12 }}>{formatDateSafe(entry.firstCaughtAt)}</span>
            </div>
            <div className="stack" style={{ gap: 2 }}>
              <span className="muted" style={{ fontSize: 11 }}>
                Giá trị giao dịch
              </span>
              <span className="row" style={{ gap: 4, fontSize: 13, fontWeight: 700 }}>
                <CoinIcon size={14} /> +{fish.coin} Xu
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
