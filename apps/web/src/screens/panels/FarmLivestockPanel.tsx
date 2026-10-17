import {
  ANIMALS,
  computeAnimalGrowthStage,
  computeAnimalHunger,
  FEED_TROUGHS,
  STARVATION_WARNING_THRESHOLD_SEC,
  BREEDING_MIN_HAPPINESS,
  BREEDING_HAPPINESS_COST,
  BASE_LIVESTOCK_CAPACITY,
  POND_FISHES,
  type PondFishSpecies,
  type PondFishDef,
  type LivestockCapacityTier,
  getAnimalBreedingStatus,
  canBreedAnimals,
  type AnimalGrowthStage,
  type AnimalType,
  type LivestockFacilityKey,
  type StarvationSeverity,
  type AnimalBreedingStatus,
  type BreedingCandidate,
} from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpCircle,
  Fish,
  Heart,
  Plus,
  ShieldAlert,
  Skull,
  Sparkles,
  Store,
  Utensils,
  Wheat,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { farmItemIcon } from '../../art/farm-icons';
import { api, ApiError, num, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon, Panel } from '../../ui/primitives';

export interface FarmAnimal {
  id: string;
  type: string;
  name: string;
  facility?: LivestockFacilityKey;
  createdAt?: string;
  fedAt?: string | null;
  growthAccumSec?: number;
  happiness: number;
  lastYieldAt?: string | null;
  bredAt?: string | null;
  breedingStatus?: AnimalBreedingStatus;
  stage?: AnimalGrowthStage;
  progressPercent?: number;
  remainingSec?: number;
  sellPrice?: number;
  displayName?: string;
  isDead?: boolean;
  starvationRemainingSec?: number;
  severity?: StarvationSeverity;
}

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  tab: string;
}

interface FeedTroughInfo {
  facility: LivestockFacilityKey;
  label: string;
  penName: string;
  icon: string;
  feedItemId: string;
  feedName: string;
  amount: number;
  capacity: number;
  upgradeLevel?: number;
  nextUpgrade?: { level: number; capacity: number; costCoins: number } | null;
}

export interface FarmPondFish {
  id: string;
  species: string;
  weightKg: number;
  stage: string;
  fedAt?: string | null;
  stockedAt?: string;
}

interface FarmMeResponse {
  farm: { ownerId: string };
  warehouse: { capacity: number; items: WarehouseItem[] };
  animals: FarmAnimal[];
  pondFishes?: FarmPondFish[];
  livestockCapacity?: number;
  nextCapacityUpgrade?: LivestockCapacityTier | null;
  troughs?: Record<LivestockFacilityKey, FeedTroughInfo>;
  starvationAlerts?: {
    criticalCount: number;
    deadCount: number;
    hungryCount: number;
    criticalAnimals: Array<{
      id: string;
      name: string;
      type: string;
      facility: string;
      starvationRemainingSec: number;
    }>;
  };
}

type FacilityTab = 'all' | 'poultry' | 'cattle' | 'pig' | 'goat' | 'pond';

const FACILITY_CONFIG: Record<
  FacilityTab,
  { label: string; icon: string; animalTypes: AnimalType[]; desc: string }
> = {
  all: {
    label: 'Tất Cả',
    icon: '🏡',
    animalTypes: ['chicken', 'duck', 'cow', 'pig', 'goat', 'sheep'],
    desc: 'Tổng quan toàn bộ đàn gia súc gia cầm trong trang trại.',
  },
  poultry: {
    label: 'Chuồng Gia Cầm',
    icon: '🐓',
    animalTypes: ['chicken', 'duck'],
    desc: 'Nơi nuôi Gà Ri và Vịt Xiêm đẻ trứng thơm ngon.',
  },
  cattle: {
    label: 'Đồng Cỏ Bò Sữa',
    icon: '🐄',
    animalTypes: ['cow'],
    desc: 'Đồng cỏ xanh tươi nơi đàn bò sữa Hà Lan nhai cỏ cho sữa béo.',
  },
  pig: {
    label: 'Chuồng Heo Mọi',
    icon: '🐖',
    animalTypes: ['pig'],
    desc: 'Bãi bùn râm mát của bầy heo mọi sọc dưa háu ăn.',
  },
  goat: {
    label: 'Đồi Dê & Cừu',
    icon: '🐐',
    animalTypes: ['goat', 'sheep'],
    desc: 'Đồi cỏ dốc đứng nơi Dê Bách Thảo và Cừu Phan Rang leo trèo.',
  },
  pond: {
    label: 'Ao Thủy Sản',
    icon: '🐟',
    animalTypes: [],
    desc: 'Ao sen nuôi cá nước ngọt: Cá tra, Basa, Cá lóc, Tôm càng xanh và Cá bống tượng.',
  },
};

function getPondStageBadge(stage: string) {
  switch (stage) {
    case 'specialty':
      return {
        label: 'Thượng Hạng',
        color: '#c084fc',
        bg: 'rgba(192, 132, 252, 0.18)',
        border: 'rgba(192, 132, 252, 0.4)',
      };
    case 'adult':
      return {
        label: 'Xuất Bán (Trưởng Thành)',
        color: '#34d399',
        bg: 'rgba(16, 185, 129, 0.18)',
        border: 'rgba(16, 185, 129, 0.4)',
      };
    case 'juvenile':
      return {
        label: 'Đang Lớn',
        color: '#38bdf8',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: 'rgba(56, 189, 248, 0.4)',
      };
    case 'fingerling':
    default:
      return {
        label: 'Cá Giống',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.18)',
        border: 'rgba(245, 158, 11, 0.4)',
      };
  }
}

export function FarmLivestockPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const initialFacility = useUi((s) => s.livestockFacility) as FacilityTab | null;
  const setLivestockFacility = useUi((s) => s.setLivestockFacility);
  const [activeTab, setActiveTab] = useState<FacilityTab>(initialFacility || 'all');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);
  const [selectedBreedingParent, setSelectedBreedingParent] = useState<FarmAnimal | null>(null);

  // Real-time ticking every second for growth timers
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
  });

  const animals = data?.animals ?? [];
  const pondFishes = data?.pondFishes ?? [];
  const livestockCapacity = data?.livestockCapacity ?? BASE_LIVESTOCK_CAPACITY;
  const nextCapacityUpgrade = data?.nextCapacityUpgrade;
  const troughs = data?.troughs;
  const warehouseItems = data?.warehouse.items ?? [];
  const getStockQty = (stockId: string) => warehouseItems.find((i) => i.itemId === stockId)?.quantity ?? 0;
  const aquaticFeedQty = getStockQty('feed_aquatic');

  const currentConfig = FACILITY_CONFIG[activeTab];
  const filteredAnimals = animals.filter((a) => currentConfig.animalTypes.includes(a.type as AnimalType));

  // Available stock items in warehouse for current tab
  const availableStockTypes = (Object.values(ANIMALS) as Array<(typeof ANIMALS)[AnimalType]>).filter(
    (def) => currentConfig.animalTypes.includes(def.type) && getStockQty(def.stockItemId) > 0,
  );
  const availableFingerlings = (Object.values(POND_FISHES) as PondFishDef[]).filter(
    (def) => getStockQty(def.fingerlingItemId) > 0,
  );

  // 1. Raise animal from warehouse into pen
  const handleRaise = async (def: (typeof ANIMALS)[AnimalType]) => {
    if (animals.length >= livestockCapacity) {
      setErrorMsg(
        `Chuồng trại đã đạt giới hạn tối đa ${livestockCapacity} con. Hãy cơi nới mở rộng chuồng trại hoặc bán bớt vật nuôi trước!`,
      );
      play('error');
      return;
    }
    setLoadingAction(`raise_${def.type}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/animals/raise', {
        method: 'POST',
        body: { stockItemId: def.stockItemId },
      });
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Thả nuôi thành công!',
        body: `Đã đưa ${def.babyName} vào chuồng nuôi dưỡng. Hãy chăm sóc cho ăn đều đặn nhé!`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Thả vật nuôi thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Feed animal
  const handleFeed = async (animal: FarmAnimal, def: (typeof ANIMALS)[AnimalType]) => {
    const feedStock = getStockQty(def.feedItemId);
    if (feedStock <= 0) {
      setErrorMsg(`Hết ${def.feedName} trong kho! Hãy mua thêm tại Tiệm Bác Sáu.`);
      play('error');
      return;
    }
    setLoadingAction(`feed_${animal.id}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/animals/feed', {
        method: 'POST',
        body: { animalId: animal.id, feedItemId: def.feedItemId },
      });
      play('pop');
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã cho ăn!',
        body: `${animal.name} đã được cho ăn ${def.feedName} thơm ngon. (+20 Hạnh phúc)`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Cho ăn thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Collect produce yield
  const handleCollect = async (animal: FarmAnimal, def: (typeof ANIMALS)[AnimalType]) => {
    setLoadingAction(`collect_${animal.id}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/care', {
        method: 'POST',
        body: { kind: 'collect', id: animal.id },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Thu hoạch sản phẩm!',
        body: `Đã thu hoạch 1x ${def.yieldName} chuyển vào kho Silo.`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Thu hoạch thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Sell animal / Clean up carcass
  const handleSell = async (animal: FarmAnimal, sellPrice: number, displayName: string) => {
    setLoadingAction(`sell_${animal.id}`);
    setErrorMsg(null);
    setConfirmSellId(null);
    try {
      const res = await api<{ ok: boolean; coinEarned: number }>('/api/farm/animals/sell', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { animalId: animal.id },
      });
      if (sellPrice > 0) {
        play('coin');
        useUi.getState().toast({
          kind: 'reward',
          title: 'Xuất bán thành công!',
          body: `Đã bán ${displayName} thu về +${num(res.coinEarned || sellPrice)} Xu!`,
        });
      } else {
        play('pop');
        useUi.getState().toast({
          kind: 'info',
          title: 'Đã dọn dẹp xác!',
          body: `Đã dọn dẹp xác ${displayName} để giải phóng vị trí trong chuồng trại.`,
        });
      }
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Dọn dẹp/xuất bán thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Clean all dead animals
  const handleCleanAllDead = async (deadList: FarmAnimal[]) => {
    if (deadList.length === 0) return;
    setLoadingAction('clean_all_dead');
    setErrorMsg(null);
    try {
      for (const a of deadList) {
        await api('/api/farm/animals/sell', {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: { animalId: a.id },
        });
      }
      play('pop');
      useUi.getState().toast({
        kind: 'info',
        title: 'Đã dọn sạch chuồng trại!',
        body: `Đã dọn dẹp ${deadList.length} xác động vật, giải phóng chỗ nuôi cho đàn mới.`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Dọn dẹp xác động vật thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 6. Fill Feed Trough
  const handleFillTrough = async (facility: LivestockFacilityKey, quantity: number) => {
    setLoadingAction(`fill_trough_${facility}`);
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        addedQuantity: number;
        trough: { amount: number; capacity: number; feedName: string; label: string };
      }>('/api/farm/troughs/fill', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { facility, quantity },
      });
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Đã nạp máng ăn!',
        body: `Đã nạp +${res.addedQuantity} ${res.trough.feedName} vào ${res.trough.label} (${res.trough.amount}/${res.trough.capacity}).`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Nạp máng ăn thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 7. Breed Animals (Ghép đôi nhân giống)
  const handleBreed = async (parentA: FarmAnimal, parentB: FarmAnimal) => {
    if (animals.length >= livestockCapacity) {
      setErrorMsg(
        `Trang trại đã đạt giới hạn tối đa ${livestockCapacity} con. Hãy cơi nới mở rộng chuồng trại hoặc xuất chuồng bớt trước!`,
      );
      play('error');
      return;
    }
    setLoadingAction(`breed_${parentA.id}_${parentB.id}`);
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        baby: { id: string; type: string; displayName: string };
        parentA: { id: string; displayName: string; happiness: number };
        parentB: { id: string; displayName: string; happiness: number };
      }>('/api/farm/animals/breed', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { parentAId: parentA.id, parentBId: parentB.id },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🎉 Nhân giống thành công!',
        body: `Cặp đôi đã sinh ra một bé ${res.baby.displayName} siêu đáng yêu! Đàn vật nuôi đã có thêm thành viên mới.`,
      });
      setSelectedBreedingParent(null);
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Ghép đôi sinh sản thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 8. Upgrade Livestock Pen Capacity (Cơi nới mở rộng chuồng trại)
  const handleUpgradeCapacity = async () => {
    if (!nextCapacityUpgrade) return;
    if (me.balances.coin < nextCapacityUpgrade.costCoins) {
      setErrorMsg(`Không đủ Xu! Cần ${num(nextCapacityUpgrade.costCoins)} Xu để nâng cấp chuồng trại.`);
      play('error');
      return;
    }
    setLoadingAction('upgrade_capacity');
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        tier: number;
        name: string;
        capacity: number;
        coinBalance: number;
      }>('/api/farm/facility/capacity/upgrade', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🎉 Cơi nới chuồng trại thành công!',
        body: `Đã nâng cấp lên ${res.name}. Sức chứa tối đa tăng lên ${res.capacity} con!`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Nâng cấp chuồng trại thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 9. Upgrade Feed Trough (Nâng cấp máng ăn tự động)
  const handleUpgradeTrough = async (facility: LivestockFacilityKey) => {
    const trough = troughs?.[facility];
    if (!trough || !trough.nextUpgrade) return;
    if (me.balances.coin < trough.nextUpgrade.costCoins) {
      setErrorMsg(`Không đủ Xu! Cần ${num(trough.nextUpgrade.costCoins)} Xu để nâng cấp máng ăn.`);
      play('error');
      return;
    }
    setLoadingAction(`upgrade_trough_${facility}`);
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        trough: {
          facility: string;
          upgradeLevel: number;
          capacity: number;
          label: string;
        };
        coinBalance: number;
      }>('/api/farm/troughs/upgrade', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { facility },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: '🎉 Nâng cấp máng ăn thành công!',
        body: `Đã nâng cấp ${res.trough.label} lên Cấp ${res.trough.upgradeLevel}. Sức chứa tăng lên ${res.trough.capacity} phần!`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Nâng cấp máng ăn thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 10. Feed All Facility Animals in 1 click (Cho cả chuồng ăn cùng lúc)
  const handleFeedAll = async (facility: LivestockFacilityKey) => {
    setLoadingAction(`feed_all_${facility}`);
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        fedCount: number;
        totalHungry: number;
        feedName: string;
        message?: string;
      }>('/api/farm/facility/feed-all', {
        method: 'POST',
        body: { facility },
      });
      if (res.fedCount > 0) {
        play('pop');
        useUi.getState().toast({
          kind: 'success',
          title: '🌾 Cho cả chuồng ăn thành công!',
          body: `Đã cho ${res.fedCount} con vật no bụng bằng ${res.feedName} từ kho Silo!`,
        });
      } else {
        useUi.getState().toast({
          kind: 'info',
          title: 'Chuồng trại đã no!',
          body: res.message || 'Tất cả vật nuôi trong khu vực này đều đã no bụng.',
        });
      }
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Cho cả chuồng ăn thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 11. Pond: Stock Fingerling
  const handleStockPond = async (def: PondFishDef) => {
    if (pondFishes.length >= 12) {
      setErrorMsg('Ao thủy sản đã đạt giới hạn tối đa 12 con cá! Hãy kéo lưới thu hoạch cá lớn trước.');
      play('error');
      return;
    }
    setLoadingAction(`stock_pond_${def.species}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/pond/stock', {
        method: 'POST',
        body: { fishSpecies: def.species },
      });
      play('pop');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Thả cá thành công!',
        body: `Đã thả cá giống ${def.name} vào ao nuôi. Nhớ rải cám nổi chăm sóc nhé!`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Thả cá vào ao thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 12. Pond: Feed Single Fish
  const handleFeedPondFish = async (fish: FarmPondFish, def: PondFishDef) => {
    if (aquaticFeedQty <= 0) {
      setErrorMsg('Hết Thức Ăn Thủy Sản (Cám nổi) trong kho Silo! Hãy mua thêm tại Tiệm Bác Sáu.');
      play('error');
      return;
    }
    setLoadingAction(`feed_pond_${fish.id}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/care', {
        method: 'POST',
        body: { kind: 'pond-feed', id: fish.id },
      });
      play('pop');
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã rải cám nổi!',
        body: `${def.name} đã được cho ăn cám nổi thơm ngon, đang phát triển tăng trọng.`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Cho cá ăn thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 13. Pond: Harvest Single Fish
  const handleHarvestPondFish = async (fish: FarmPondFish, def: PondFishDef) => {
    setLoadingAction(`harvest_pond_${fish.id}`);
    setErrorMsg(null);
    try {
      await api('/api/farm/care', {
        method: 'POST',
        body: { kind: 'pond-harvest', id: fish.id },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Kéo lưới thu hoạch!',
        body: `Đã kéo lưới thu hoạch 1x ${def.name} (${fish.weightKg.toFixed(1)} kg) chuyển về kho Silo!`,
      });
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Thu hoạch cá thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 14. Pond: Feed All Pond Fishes in 1 Click
  const handleFeedAllPond = async () => {
    setLoadingAction('feed_all_pond');
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        fedCount: number;
        totalUnfed?: number;
        remainingStock?: number;
        message?: string;
      }>('/api/farm/pond/feed-all', {
        method: 'POST',
      });
      if (res.fedCount > 0) {
        play('pop');
        useUi.getState().toast({
          kind: 'success',
          title: '🌊 Rải cám nổi toàn ao!',
          body: `Đã cho ${res.fedCount} con cá trong ao ăn cám nổi no nê!`,
        });
      } else {
        useUi.getState().toast({
          kind: 'info',
          title: 'Ao cá đã no!',
          body: res.message || 'Tất cả cá trong ao đều đã được cho ăn.',
        });
      }
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Rải cám toàn ao thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 15. Pond: Harvest All Ready Fishes in 1 Click
  const handleHarvestAllPond = async () => {
    setLoadingAction('harvest_all_pond');
    setErrorMsg(null);
    try {
      const res = await api<{
        ok: boolean;
        harvestedCount: number;
        harvestedItems?: Record<string, number>;
        message?: string;
      }>('/api/farm/pond/harvest-all', {
        method: 'POST',
      });
      if (res.harvestedCount > 0) {
        play('coin');
        useUi.getState().toast({
          kind: 'reward',
          title: '🎣 Kéo lưới đại thắng!',
          body: `Đã thu hoạch mẻ cá lớn gồm ${res.harvestedCount} con cá các loại về kho Silo!`,
        });
      } else {
        useUi.getState().toast({
          kind: 'info',
          title: 'Chưa tới kỳ kéo lưới',
          body: res.message || 'Chưa có cá nào trong ao đạt tiêu chuẩn xuất bán.',
        });
      }
      await refetch();
      window.dispatchEvent(new CustomEvent('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['farm'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Kéo lưới toàn ao thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Panel
      title="Trại Chăn Nuôi Cozy"
      icon={<Sparkles size={20} color="#f59e0b" />}
      onClose={() => {
        setLivestockFacility(null);
        onClose();
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          minWidth: 700,
          maxWidth: 960,
          color: '#e2e8f0',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.65)',
            borderRadius: 10,
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{activeTab === 'pond' ? '🐟' : '🌾'}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc' }}>
                {activeTab === 'pond'
                  ? `Đàn Cá Ao Thủy Sản: ${pondFishes.length} / 12 con`
                  : `Đàn Vật Nuôi: ${animals.length} / ${livestockCapacity} con`}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>{currentConfig.desc}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {nextCapacityUpgrade && activeTab !== 'pond' && (
              <button
                type="button"
                disabled={loadingAction !== null || me.balances.coin < nextCapacityUpgrade.costCoins}
                onClick={() => void handleUpgradeCapacity()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background:
                    me.balances.coin >= nextCapacityUpgrade.costCoins
                      ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                      : 'rgba(71, 85, 105, 0.4)',
                  color: me.balances.coin >= nextCapacityUpgrade.costCoins ? '#ffffff' : '#94a3b8',
                  border:
                    me.balances.coin >= nextCapacityUpgrade.costCoins
                      ? '1px solid #34d399'
                      : '1px solid rgba(148, 163, 184, 0.2)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor:
                    loadingAction !== null || me.balances.coin < nextCapacityUpgrade.costCoins
                      ? 'not-allowed'
                      : 'pointer',
                  boxShadow:
                    me.balances.coin >= nextCapacityUpgrade.costCoins
                      ? '0 2px 6px rgba(16, 185, 129, 0.3)'
                      : 'none',
                }}
                title={`Mở rộng sức chứa lên ${nextCapacityUpgrade.capacity} con (${num(nextCapacityUpgrade.costCoins)} Xu)`}
              >
                <ArrowUpCircle size={14} />
                <span>
                  {loadingAction === 'upgrade_capacity'
                    ? 'Đang nâng...'
                    : `Cơi Nới Chuồng (${nextCapacityUpgrade.capacity} con · ${num(nextCapacityUpgrade.costCoins)} Xu)`}
                </span>
              </button>
            )}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fef3c7',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <CoinIcon />
              <span>{num(me.balances.coin)} Xu</span>
            </div>
            <button
              type="button"
              onClick={() => {
                play('click');
                useUi.getState().setPanel('farm-shop');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Store size={14} />
              <span>Tiệm Bác Sáu</span>
            </button>
          </div>
        </div>

        {/* Facility Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
            paddingBottom: 8,
          }}
        >
          {(Object.keys(FACILITY_CONFIG) as FacilityTab[]).map((tabKey) => {
            const conf = FACILITY_CONFIG[tabKey];
            const isSelected = activeTab === tabKey;
            const count =
              tabKey === 'pond'
                ? pondFishes.length
                : tabKey === 'all'
                  ? animals.length
                  : animals.filter((a) => conf.animalTypes.includes(a.type as AnimalType)).length;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => {
                  play('click');
                  setActiveTab(tabKey);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                  color: isSelected ? '#fbbf24' : '#94a3b8',
                  border: isSelected ? '1px solid #f59e0b' : '1px solid rgba(148, 163, 184, 0.15)',
                  cursor: 'pointer',
                }}
              >
                <span>{conf.icon}</span>
                <span>{conf.label}</span>
                <span
                  style={{
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    background: isSelected ? '#f59e0b' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? '#000' : '#cbd5e1',
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* EMERGENCY STARVATION ALERT BANNER */}
        {(() => {
          if (activeTab === 'pond') return null;
          const criticalAnimals = animals.filter((a) => {
            const hunger = computeAnimalHunger(
              a.type,
              a.fedAt || null,
              a.lastYieldAt || null,
              nowMs,
              a.stage === 'adult',
              a.createdAt || null,
            );
            return (
              !hunger.isDead &&
              hunger.isHungry &&
              hunger.starvationRemainingSec <= STARVATION_WARNING_THRESHOLD_SEC
            );
          });

          if (criticalAnimals.length === 0) return null;

          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.35) 0%, rgba(185, 28, 28, 0.2) 100%)',
                border: '1px solid #ef4444',
                color: '#fee2e2',
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={22} color="#f87171" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#fca5a5' }}>
                    🚨 BÁO ĐỘNG ĐÓI KHẨN CẤP: Có {criticalAnimals.length} con vật đang sắp chết đói (&lt; 15
                    phút)!
                  </div>
                  <div style={{ fontSize: 11, color: '#fecaca' }}>
                    Hãy nạp đầy máng ăn tự động bên dưới hoặc cho ăn thủ công ngay để cứu sống đàn vật nuôi.
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* SECTION: FEED TROUGH AUTOMATION (MÁNG ĂN TỰ ĐỘNG) */}
        {(() => {
          if (activeTab === 'pond') return null;
          const facilitiesToShow: LivestockFacilityKey[] =
            activeTab === 'all' ? ['poultry', 'cattle', 'pig', 'goat'] : [activeTab as LivestockFacilityKey];

          return (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wheat size={16} color="#f59e0b" />
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                    Máng Ăn Tự Động (Tự Động Nuôi Khi Offline &amp; Bận Rộn)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Vật nuôi tự động ăn từ máng đúng giờ khi đói
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: activeTab === 'all' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
                  gap: 10,
                }}
              >
                {facilitiesToShow.map((fac) => {
                  const def = FEED_TROUGHS[fac];
                  const trough = data?.troughs?.[fac] ?? {
                    ...def,
                    amount: 0,
                  };
                  const stockQty = getStockQty(def.feedItemId);
                  const isFull = trough.amount >= trough.capacity;
                  const percent = Math.min(100, Math.round((trough.amount / trough.capacity) * 100));
                  const isBusyTrough = loadingAction === `fill_trough_${fac}`;

                  const barColor = percent > 50 ? '#10b981' : percent > 20 ? '#f59e0b' : '#ef4444';

                  return (
                    <div
                      key={fac}
                      style={{
                        background: 'rgba(30, 41, 59, 0.6)',
                        borderRadius: 8,
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{def.icon}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                                {def.label}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  color: '#93c5fd',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                }}
                              >
                                Cấp {trough.upgradeLevel ?? 1}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                              Cần: {def.feedName} (Kho có: {stockQty})
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                            {trough.amount} / {trough.capacity} phần
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{percent}% đầy</div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          background: 'rgba(15, 23, 42, 0.8)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            background: barColor,
                            borderRadius: 3,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>

                      {/* Deposit & Facility Actions */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          justifyContent: 'flex-end',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        {/* Feed all hungry animals in facility in 1 click */}
                        <Button
                          disabled={loadingAction !== null || stockQty < 1}
                          onClick={() => void handleFeedAll(fac)}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            background: 'rgba(245, 158, 11, 0.2)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontWeight: 600,
                            cursor: loadingAction !== null || stockQty < 1 ? 'not-allowed' : 'pointer',
                          }}
                          title={`Cho toàn bộ động vật đói trong ${def.penName} ăn ngay lập tức bằng thức ăn từ kho Silo`}
                        >
                          {loadingAction === `feed_all_${fac}` ? 'Đang cho ăn...' : '🌾 Cho Cả Chuồng Ăn'}
                        </Button>

                        {/* Upgrade Trough Button */}
                        {trough.nextUpgrade && (
                          <Button
                            disabled={
                              loadingAction !== null || me.balances.coin < trough.nextUpgrade.costCoins
                            }
                            onClick={() => void handleUpgradeTrough(fac)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              background:
                                me.balances.coin >= trough.nextUpgrade.costCoins
                                  ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                                  : 'rgba(71, 85, 105, 0.3)',
                              color: me.balances.coin >= trough.nextUpgrade.costCoins ? '#ffffff' : '#94a3b8',
                              fontWeight: 600,
                              border: 'none',
                              cursor:
                                loadingAction !== null || me.balances.coin < trough.nextUpgrade.costCoins
                                  ? 'not-allowed'
                                  : 'pointer',
                            }}
                            title={`Nâng cấp máng lên Cấp ${trough.nextUpgrade.level} (${trough.nextUpgrade.capacity} phần, tốn ${num(trough.nextUpgrade.costCoins)} Xu)`}
                          >
                            {loadingAction === `upgrade_trough_${fac}`
                              ? 'Đang nâng...'
                              : `⬆️ Cấp ${trough.nextUpgrade.level} (${trough.nextUpgrade.capacity}p · ${num(trough.nextUpgrade.costCoins)} Xu)`}
                          </Button>
                        )}

                        <Button
                          disabled={isBusyTrough || isFull || stockQty < 1}
                          onClick={() => void handleFillTrough(fac, Math.min(10, stockQty))}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            background: 'rgba(59, 130, 246, 0.25)',
                            border: '1px solid rgba(59, 130, 246, 0.5)',
                            color: '#93c5fd',
                            fontWeight: 600,
                            cursor: isFull || stockQty < 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          +10 Thức Ăn
                        </Button>
                        <Button
                          disabled={isBusyTrough || isFull || stockQty < 1}
                          onClick={() =>
                            void handleFillTrough(fac, Math.min(trough.capacity - trough.amount, stockQty))
                          }
                          style={{
                            padding: '4px 12px',
                            fontSize: 11,
                            borderRadius: 6,
                            background: isFull ? 'rgba(71, 85, 105, 0.4)' : '#2563eb',
                            color: '#ffffff',
                            fontWeight: 700,
                            border: 'none',
                            cursor: isFull || stockQty < 1 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isBusyTrough
                            ? 'Đang nạp...'
                            : isFull
                              ? 'Đã Đầy Máng'
                              : stockQty < 1
                                ? 'Hết Thức Ăn'
                                : 'Nạp Đầy Máng'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* SECTION: POND BATCH ACTIONS & FEED OVERVIEW */}
        {activeTab === 'pond' &&
          (() => {
            const unfedFishes = pondFishes.filter((f) => !f.fedAt);
            const readyFishes = pondFishes.filter((f) => {
              if (!f.fedAt) return false;
              const def = POND_FISHES[f.species as PondFishSpecies];
              if (!def) return false;
              const elapsed = (nowMs - new Date(f.fedAt).getTime()) / 1000;
              return elapsed >= def.growthDurationSec;
            });

            return (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  borderRadius: 10,
                  border: '1px solid rgba(14, 165, 233, 0.25)',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Fish size={18} color="#38bdf8" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#f8fafc' }}>
                      Quản Lý Ao Thủy Sản &amp; Chăm Sóc Đàn Cá (Tối đa 12 con)
                    </span>
                  </div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8' }}
                  >
                    <span>Kho Silo có:</span>
                    <span style={{ fontWeight: 700, color: aquaticFeedQty > 0 ? '#38bdf8' : '#ef4444' }}>
                      {aquaticFeedQty} Thức Ăn Thủy Sản (Cám nổi)
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Tổng số cá trong ao</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>
                        {pondFishes.length} / 12 con
                      </div>
                    </div>
                    <div style={{ width: 1, height: 28, background: 'rgba(148, 163, 184, 0.2)' }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Cá chưa ăn cám</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: unfedFishes.length > 0 ? '#fbbf24' : '#94a3b8',
                        }}
                      >
                        {unfedFishes.length} con
                      </div>
                    </div>
                    <div style={{ width: 1, height: 28, background: 'rgba(148, 163, 184, 0.2)' }} />
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Sẵn sàng thu hoạch</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: readyFishes.length > 0 ? '#34d399' : '#94a3b8',
                        }}
                      >
                        {readyFishes.length} con
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      disabled={loadingAction !== null || unfedFishes.length === 0 || aquaticFeedQty <= 0}
                      onClick={() => void handleFeedAllPond()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        borderRadius: 6,
                        background:
                          unfedFishes.length > 0 && aquaticFeedQty > 0 ? '#0284c7' : 'rgba(71, 85, 105, 0.3)',
                        color: unfedFishes.length > 0 && aquaticFeedQty > 0 ? '#ffffff' : '#94a3b8',
                        fontWeight: 700,
                        cursor:
                          loadingAction !== null || unfedFishes.length === 0 || aquaticFeedQty <= 0
                            ? 'not-allowed'
                            : 'pointer',
                        border: 'none',
                      }}
                      title="Rải cám nổi cho tất cả cá chưa được cho ăn trong ao"
                    >
                      <Wheat size={14} />
                      <span>
                        {loadingAction === 'feed_all_pond'
                          ? 'Đang rải...'
                          : `Cho Cả Ao Ăn (${unfedFishes.length})`}
                      </span>
                    </Button>

                    <Button
                      disabled={loadingAction !== null || readyFishes.length === 0}
                      onClick={() => void handleHarvestAllPond()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 14px',
                        fontSize: 12,
                        borderRadius: 6,
                        background:
                          readyFishes.length > 0
                            ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                            : 'rgba(71, 85, 105, 0.3)',
                        color: readyFishes.length > 0 ? '#ffffff' : '#94a3b8',
                        fontWeight: 700,
                        cursor:
                          loadingAction !== null || readyFishes.length === 0 ? 'not-allowed' : 'pointer',
                        border: 'none',
                        boxShadow: readyFishes.length > 0 ? '0 2px 6px rgba(16, 185, 129, 0.3)' : 'none',
                      }}
                      title="Kéo lưới thu hoạch toàn bộ cá đã đạt tiêu chuẩn xuất bán về kho Silo"
                    >
                      <Sparkles size={14} />
                      <span>
                        {loadingAction === 'harvest_all_pond'
                          ? 'Đang kéo lưới...'
                          : `Kéo Lưới Hết (${readyFishes.length})`}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* SECTION 1: Con Giống / Cá Giống Chờ Thả Nuôi (From Silo Warehouse) */}
        {activeTab === 'pond'
          ? availableFingerlings.length > 0 && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px dashed rgba(14, 165, 233, 0.35)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#38bdf8',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={14} />
                  <span>Cá Giống Trong Kho Silo Sẵn Sàng Thả Vào Ao:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {availableFingerlings.map((def) => {
                    const stockQty = getStockQty(def.fingerlingItemId);
                    const isStocking = loadingAction === `stock_pond_${def.species}`;
                    return (
                      <div
                        key={def.species}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                        }}
                      >
                        <img
                          src={farmItemIcon(def.fingerlingItemId, 36)}
                          alt={def.name}
                          style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{def.name}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Còn: {stockQty} con giống</div>
                        </div>
                        <Button
                          disabled={isStocking || pondFishes.length >= 12}
                          onClick={() => void handleStockPond(def)}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 6,
                            background: pondFishes.length >= 12 ? 'rgba(71, 85, 105, 0.4)' : '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            cursor: pondFishes.length >= 12 ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {isStocking
                            ? 'Đang thả...'
                            : pondFishes.length >= 12
                              ? 'Ao Đã Đầy (12/12)'
                              : 'Thả Vào Ao'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          : availableStockTypes.length > 0 && (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: 10,
                  padding: 12,
                  border: '1px dashed rgba(245, 158, 11, 0.35)',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fbbf24',
                    marginBottom: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Plus size={14} />
                  <span>Con Giống Trong Kho Silo Sẵn Sàng Thả Nuôi:</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {availableStockTypes.map((def) => {
                    const stockQty = getStockQty(def.stockItemId);
                    const isRaising = loadingAction === `raise_${def.type}`;
                    return (
                      <div
                        key={def.type}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'rgba(30, 41, 59, 0.7)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                        }}
                      >
                        <img
                          src={farmItemIcon(def.type, 36)}
                          alt={def.name}
                          style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                            {def.babyName}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Còn: {stockQty} con giống</div>
                        </div>
                        <Button
                          disabled={isRaising}
                          onClick={() => void handleRaise(def)}
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 6,
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {isRaising ? 'Đang thả...' : 'Thả Vào Chuồng'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

        {/* SECTION 2: Active Animals List or Pond Fishes List */}
        {activeTab === 'pond' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                Đang tải dữ liệu ao thủy sản...
              </div>
            ) : pondFishes.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>🐟</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Chưa có cá nào trong Ao Thủy Sản Cozy
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 460, margin: '0 auto 16px auto' }}>
                  Hãy ghé Tiệm Bác Sáu để chọn mua cá giống (Cá tra, Basa, Cá lóc, Tôm càng xanh, Cá bống
                  tượng) và cám nổi để nuôi dưỡng phát triển kinh tế thủy sản!
                </div>
                <Button
                  onClick={() => {
                    play('click');
                    useUi.getState().setPanel('farm-shop');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <Store size={15} />
                  <span>Mua Cá Giống Tại Tiệm Bác Sáu</span>
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 12,
                  maxHeight: 460,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {pondFishes.map((fish) => {
                  const def = POND_FISHES[fish.species as PondFishSpecies];
                  if (!def) return null;

                  const elapsedSec = fish.fedAt
                    ? Math.max(0, (nowMs - new Date(fish.fedAt).getTime()) / 1000)
                    : 0;
                  const isReady = !!fish.fedAt && elapsedSec >= def.growthDurationSec;
                  const progressPercent = !fish.fedAt
                    ? 0
                    : Math.min(100, Math.round((elapsedSec / def.growthDurationSec) * 100));
                  const currentWeightKg = fish.fedAt
                    ? Number(
                        (
                          0.2 +
                          Math.min(1, elapsedSec / def.growthDurationSec) * (def.marketWeightMaxKg - 0.2)
                        ).toFixed(2),
                      )
                    : fish.weightKg || 0.2;

                  const stageBadge = getPondStageBadge(fish.stage);
                  const isBusy = loadingAction !== null;
                  const estValue = Math.round(currentWeightKg * def.pricePerKg);

                  return (
                    <div
                      key={fish.id}
                      style={{
                        background: 'rgba(30, 41, 59, 0.75)',
                        borderRadius: 10,
                        border: isReady
                          ? '1px solid rgba(16, 185, 129, 0.5)'
                          : fish.fedAt
                            ? '1px solid rgba(56, 189, 248, 0.35)'
                            : '1px solid rgba(245, 158, 11, 0.3)',
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: isReady
                          ? '0 0 14px rgba(16, 185, 129, 0.25)'
                          : '0 4px 12px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      {/* Fish Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            src={farmItemIcon(def.fingerlingItemId, 40)}
                            alt={def.name}
                            style={{
                              width: 36,
                              height: 36,
                              imageRendering: 'pixelated',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{def.name}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                              Thả nuôi:{' '}
                              {fish.stockedAt
                                ? new Date(fish.stockedAt).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '--:--'}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 10,
                            fontWeight: 700,
                            background: stageBadge.bg,
                            color: stageBadge.color,
                            border: `1px solid ${stageBadge.border}`,
                          }}
                        >
                          {stageBadge.label}
                        </span>
                      </div>

                      {/* Weight and Growth Progress */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                          }}
                        >
                          <span style={{ color: '#94a3b8' }}>Trọng lượng hiện tại:</span>
                          <span style={{ fontWeight: 700, color: '#38bdf8' }}>
                            {currentWeightKg.toFixed(2)} / {def.marketWeightMaxKg} kg
                          </span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 6,
                            background: 'rgba(15, 23, 42, 0.8)',
                            borderRadius: 3,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPercent}%`,
                              height: '100%',
                              background: isReady ? '#10b981' : '#0284c7',
                              borderRadius: 3,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 10,
                            color: '#94a3b8',
                          }}
                        >
                          <span>{progressPercent}% tăng trọng</span>
                          <span>Giá trị: ~{num(estValue)} Xu</span>
                        </div>
                      </div>

                      {/* Status row */}
                      <div
                        style={{
                          fontSize: 11,
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: 'rgba(15, 23, 42, 0.5)',
                        }}
                      >
                        {!fish.fedAt ? (
                          <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                            ⚠️ Cần rải cám nổi để cá lớn
                          </span>
                        ) : isReady ? (
                          <span style={{ color: '#34d399', fontWeight: 700 }}>
                            ✨ Sẵn sàng kéo lưới xuất bán!
                          </span>
                        ) : (
                          <span style={{ color: '#38bdf8' }}>
                            ⏳ Đang lớn, còn {Math.ceil((def.growthDurationSec - elapsedSec) / 60)} phút
                          </span>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                        {!fish.fedAt ? (
                          <Button
                            disabled={isBusy || aquaticFeedQty <= 0}
                            onClick={() => void handleFeedPondFish(fish, def)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              background: aquaticFeedQty > 0 ? '#0284c7' : 'rgba(71, 85, 105, 0.3)',
                              color: aquaticFeedQty > 0 ? '#ffffff' : '#94a3b8',
                              fontWeight: 700,
                              cursor: isBusy || aquaticFeedQty <= 0 ? 'not-allowed' : 'pointer',
                              border: 'none',
                            }}
                          >
                            <Wheat size={12} />
                            <span>
                              {aquaticFeedQty > 0
                                ? `Cho Ăn Cám Nổi (${aquaticFeedQty})`
                                : 'Hết Cám Nổi Trong Kho'}
                            </span>
                          </Button>
                        ) : isReady ? (
                          <Button
                            disabled={isBusy}
                            onClick={() => void handleHarvestPondFish(fish, def)}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                              color: '#ffffff',
                              fontWeight: 700,
                              cursor: isBusy ? 'not-allowed' : 'pointer',
                              border: 'none',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            <Sparkles size={12} />
                            <span>Kéo Lưới Thu Hoạch (~{num(estValue)} Xu)</span>
                          </Button>
                        ) : (
                          <Button
                            disabled
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              padding: '6px 10px',
                              fontSize: 11,
                              borderRadius: 6,
                              background: 'rgba(71, 85, 105, 0.3)',
                              color: '#94a3b8',
                              fontWeight: 600,
                              cursor: 'not-allowed',
                              border: 'none',
                            }}
                          >
                            <span>Đang Phát Triển ({progressPercent}%)</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
                Đang tải dữ liệu trang trại...
              </div>
            ) : filteredAnimals.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 10,
                  border: '1px solid rgba(148, 163, 184, 0.1)',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>{currentConfig.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  Chưa có con vật nào trong {currentConfig.label}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', maxWidth: 420, margin: '0 auto 16px auto' }}>
                  Hãy ghé Tiệm Bác Sáu để chọn mua con giống khỏe mạnh, nuôi lớn từng ngày và xuất bán thu về
                  lợi nhuận cao!
                </div>
                <Button
                  onClick={() => {
                    play('click');
                    useUi.getState().setPanel('farm-shop');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#f59e0b',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <Store size={15} />
                  <span>Mua Con Giống Tại Tiệm Bác Sáu</span>
                </Button>
              </div>
            ) : (
              <>
                {(() => {
                  const deadInCurrentFacility = filteredAnimals.filter((a) => {
                    const hunger = computeAnimalHunger(
                      a.type,
                      a.fedAt || null,
                      a.lastYieldAt || null,
                      nowMs,
                      a.stage === 'adult',
                      a.createdAt || null,
                    );
                    const growth = computeAnimalGrowthStage(
                      a.type,
                      a.createdAt || null,
                      nowMs,
                      a.fedAt || null,
                      a.growthAccumSec || 0,
                    );
                    return hunger.isDead || growth.isDead;
                  });

                  if (deadInCurrentFacility.length === 0) return null;

                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: 8,
                        color: '#fca5a5',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💀</span>
                        <span>
                          Có <b>{deadInCurrentFacility.length}</b> con vật đã chết vì bị đói trong khu vực
                          này.
                        </span>
                      </div>
                      <Button
                        disabled={loadingAction !== null}
                        onClick={() => void handleCleanAllDead(deadInCurrentFacility)}
                        style={{
                          padding: '4px 12px',
                          fontSize: 12,
                          borderRadius: 6,
                          background: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {loadingAction === 'clean_all_dead'
                          ? 'Đang dọn...'
                          : `Dọn Sạch Tất Cả Xác (${deadInCurrentFacility.length})`}
                      </Button>
                    </div>
                  );
                })()}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: 12,
                    maxHeight: 460,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {filteredAnimals.map((animal) => {
                    const def = (ANIMALS as Record<string, (typeof ANIMALS)[AnimalType]>)[animal.type];
                    if (!def) return null;

                    // Compute real-time dynamic hunger & growth based on feeding status
                    const hunger = computeAnimalHunger(
                      animal.type,
                      animal.fedAt || null,
                      animal.lastYieldAt || null,
                      nowMs,
                      animal.stage === 'adult',
                      animal.createdAt || null,
                    );
                    const growth = computeAnimalGrowthStage(
                      animal.type,
                      animal.createdAt || null,
                      nowMs,
                      animal.fedAt || null,
                      animal.growthAccumSec || 0,
                    );

                    const isDead = hunger.isDead || growth.isDead;
                    const isAdult = !isDead && growth.stage === 'adult';
                    const isGrowing = !isDead && growth.stage === 'growing';
                    const isBaby = !isDead && growth.stage === 'baby';

                    // Check feed & produce state
                    const pending =
                      !isDead &&
                      !!animal.fedAt &&
                      (!animal.lastYieldAt ||
                        new Date(animal.lastYieldAt).getTime() < new Date(animal.fedAt).getTime());

                    const fedTimeMs = animal.fedAt ? new Date(animal.fedAt).getTime() : 0;
                    const digestionElapsedSec = fedTimeMs ? (nowMs - fedTimeMs) / 1000 : 0;
                    const canCollect =
                      !isDead && pending && digestionElapsedSec >= def.feedIntervalSec && isAdult;
                    const isDigesting = !isDead && pending && !canCollect;

                    const feedStock = getStockQty(def.feedItemId);
                    const isBusy = loadingAction !== null;
                    const isConfirmingSell = confirmSellId === animal.id;

                    const starveMins = Math.floor(hunger.starvationRemainingSec / 60);
                    const starveSecs = hunger.starvationRemainingSec % 60;
                    const isCritical =
                      !isDead &&
                      hunger.isHungry &&
                      hunger.starvationRemainingSec <= STARVATION_WARNING_THRESHOLD_SEC;

                    const breedingCandidate: BreedingCandidate = {
                      id: animal.id,
                      type: animal.type as AnimalType,
                      displayName: growth.displayName,
                      stage: growth.stage,
                      happiness: isDead ? 0 : animal.happiness,
                      isDead,
                      isHungry: hunger.isHungry,
                      bredAt: animal.bredAt ? new Date(animal.bredAt).getTime() : null,
                    };
                    const breedingStatus = getAnimalBreedingStatus(breedingCandidate, nowMs);

                    return (
                      <div
                        key={animal.id}
                        style={{
                          background: isDead
                            ? 'rgba(30, 15, 20, 0.85)'
                            : isCritical
                              ? 'rgba(45, 15, 20, 0.85)'
                              : 'rgba(30, 41, 59, 0.75)',
                          borderRadius: 10,
                          border: isDead
                            ? '1px solid rgba(239, 68, 68, 0.6)'
                            : isCritical
                              ? '1px solid #ef4444'
                              : isAdult
                                ? '1px solid rgba(16, 185, 129, 0.4)'
                                : isGrowing
                                  ? '1px solid rgba(56, 189, 248, 0.35)'
                                  : '1px solid rgba(245, 158, 11, 0.3)',
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          boxShadow: isCritical
                            ? '0 0 16px rgba(239, 68, 68, 0.55)'
                            : '0 4px 12px rgba(0, 0, 0, 0.25)',
                        }}
                      >
                        {/* Animal Card Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img
                              src={farmItemIcon(animal.type, 44)}
                              alt={growth.displayName}
                              style={{
                                width: isBaby ? 32 : isGrowing ? 38 : 44,
                                height: isBaby ? 32 : isGrowing ? 38 : 44,
                                imageRendering: 'pixelated',
                                filter: isDead ? 'grayscale(100%) opacity(45%)' : 'none',
                                transition: 'all 0.3s ease',
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: isDead ? '#f87171' : isCritical ? '#fca5a5' : '#f8fafc',
                                }}
                              >
                                {growth.displayName}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{def.name}</div>
                            </div>
                          </div>

                          {/* Growth Stage Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {isCritical && (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 12,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  background: '#ef4444',
                                  color: '#ffffff',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                }}
                              >
                                <AlertTriangle size={11} />
                                <span>{starveMins}m còn lại!</span>
                              </span>
                            )}
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: 12,
                                fontSize: 10,
                                fontWeight: 700,
                                background: isDead
                                  ? 'rgba(239, 68, 68, 0.22)'
                                  : isAdult
                                    ? 'rgba(16, 185, 129, 0.18)'
                                    : isGrowing
                                      ? 'rgba(56, 189, 248, 0.18)'
                                      : 'rgba(245, 158, 11, 0.18)',
                                color: isDead
                                  ? '#ef4444'
                                  : isAdult
                                    ? '#34d399'
                                    : isGrowing
                                      ? '#38bdf8'
                                      : '#fbbf24',
                                border: isDead
                                  ? '1px solid rgba(239, 68, 68, 0.5)'
                                  : isAdult
                                    ? '1px solid rgba(16, 185, 129, 0.4)'
                                    : isGrowing
                                      ? '1px solid rgba(56, 189, 248, 0.4)'
                                      : '1px solid rgba(245, 158, 11, 0.4)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isDead ? <Skull size={11} /> : isAdult ? <Sparkles size={11} /> : null}
                              {isDead
                                ? 'Đã Chết (Đói)'
                                : isAdult
                                  ? 'Trưởng Thành'
                                  : isGrowing
                                    ? 'Đang Lớn'
                                    : 'Con Non'}
                            </span>
                          </div>
                        </div>

                        {/* Growth Progress Bar */}
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 11,
                              marginBottom: 4,
                            }}
                          >
                            <span style={{ color: '#94a3b8' }}>
                              {isDead
                                ? 'Sinh trưởng: Ngừng'
                                : !animal.fedAt && !animal.growthAccumSec
                                  ? 'Cần cho ăn để lớn'
                                  : `Độ tuổi: ${growth.progressPercent}%`}
                            </span>
                            <span
                              style={{
                                color: isDead ? '#ef4444' : isAdult ? '#34d399' : '#fbbf24',
                                fontWeight: 600,
                              }}
                            >
                              {isDead
                                ? 'Vật nuôi đã chết'
                                : isAdult
                                  ? 'Đạt độ lớn tối đa ✨'
                                  : !animal.fedAt && !animal.growthAccumSec
                                    ? `Chưa lớn (cần ăn)`
                                    : `Còn ${Math.floor(growth.remainingSec / 60)}p ${growth.remainingSec % 60}s`}
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: 6,
                              borderRadius: 3,
                              background: 'rgba(15, 23, 42, 0.6)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${isDead ? 0 : growth.progressPercent}%`,
                                height: '100%',
                                borderRadius: 3,
                                background: isDead
                                  ? '#64748b'
                                  : isAdult
                                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                                    : isGrowing
                                      ? 'linear-gradient(90deg, #0284c7, #38bdf8)'
                                      : 'linear-gradient(90deg, #d97706, #f59e0b)',
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Stats & Happiness Indicator */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: isDead ? 'rgba(69, 10, 10, 0.4)' : 'rgba(15, 23, 42, 0.4)',
                            fontSize: 11,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              color: isDead ? '#94a3b8' : '#f43f5e',
                            }}
                          >
                            {isDead ? (
                              <Skull size={12} color="#ef4444" />
                            ) : (
                              <Heart size={12} fill="#f43f5e" />
                            )}
                            <span style={{ fontWeight: 600 }}>
                              {isDead ? '0/100' : `${animal.happiness}/100`}
                            </span>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            {isDead ? (
                              <span style={{ color: '#ef4444', fontWeight: 700 }}>Chết vì bị bỏ đói</span>
                            ) : canCollect ? (
                              <span style={{ color: '#34d399', fontWeight: 700 }}>Có {def.yieldName}!</span>
                            ) : isDigesting ? (
                              <span style={{ color: '#fbbf24' }}>Đang tiêu hóa...</span>
                            ) : hunger.isHungry ? (
                              <span style={{ color: '#f87171', fontWeight: 700 }}>
                                ⚠️ Đói (Chết: {starveMins}p {starveSecs}s)
                              </span>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>Đang no bụng</span>
                            )}
                          </div>
                        </div>

                        {/* Card Actions: Feed / Collect / Sell */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {/* Feed Button */}
                            <Button
                              disabled={isBusy || pending || isDead}
                              onClick={() => void handleFeed(animal, def)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                padding: '6px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                background: isDead
                                  ? 'rgba(71, 85, 105, 0.3)'
                                  : pending
                                    ? 'rgba(71, 85, 105, 0.4)'
                                    : '#d97706',
                                color: isDead ? '#64748b' : '#ffffff',
                                fontWeight: 600,
                                cursor: isDead || pending ? 'not-allowed' : 'pointer',
                                border: 'none',
                              }}
                            >
                              <Utensils size={12} />
                              <span>
                                {isDead ? 'Đã Chết' : pending ? 'Đã Ăn No' : `Cho Ăn (${feedStock})`}
                              </span>
                            </Button>

                            {/* Collect Button */}
                            <Button
                              disabled={isBusy || !canCollect || isDead}
                              onClick={() => void handleCollect(animal, def)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 4,
                                padding: '6px 8px',
                                fontSize: 11,
                                borderRadius: 6,
                                background: canCollect ? '#10b981' : 'rgba(71, 85, 105, 0.3)',
                                color: canCollect ? '#ffffff' : '#94a3b8',
                                fontWeight: 600,
                                cursor: canCollect ? 'pointer' : 'not-allowed',
                                border: 'none',
                              }}
                            >
                              <Sparkles size={12} />
                              <span>Thu Hoạch</span>
                            </Button>
                          </div>

                          {/* Breeding Action Row (Adult Living Animals) */}
                          {isAdult && !isDead && (
                            <div>
                              {breedingStatus.canBreed ? (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    play('click');
                                    setSelectedBreedingParent(animal);
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '6px 10px',
                                    fontSize: 11,
                                    borderRadius: 6,
                                    background: 'linear-gradient(90deg, #ec4899 0%, #db2777 100%)',
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    cursor: isBusy ? 'not-allowed' : 'pointer',
                                    border: '1px solid #f472b6',
                                    boxShadow: '0 2px 6px rgba(236, 72, 153, 0.3)',
                                    transition: 'all 0.2s ease',
                                  }}
                                  title="Chọn ghép đôi với con vật cùng loài để sinh sản ra con non mới"
                                >
                                  <span>💕 Ghép Đôi Sinh Sản</span>
                                </button>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '5px 8px',
                                    fontSize: 10,
                                    borderRadius: 6,
                                    background: 'rgba(244, 114, 182, 0.08)',
                                    border: '1px dashed rgba(244, 114, 182, 0.3)',
                                    color: '#f472b6',
                                    textAlign: 'center',
                                  }}
                                >
                                  <span>
                                    {breedingStatus.cooldownRemainingSec > 0
                                      ? `⏳ Nghỉ sinh sản (còn ${Math.ceil(breedingStatus.cooldownRemainingSec / 60)}p)`
                                      : animal.happiness < BREEDING_MIN_HAPPINESS
                                        ? `💕 Cần ≥${BREEDING_MIN_HAPPINESS}% hạnh phúc (${animal.happiness}%)`
                                        : hunger.isHungry
                                          ? '🌾 Cần ăn no để ghép đôi'
                                          : (breedingStatus.reason ?? 'Chưa sẵn sàng ghép đôi')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Sell / Clean Animal Button */}
                          {!isConfirmingSell ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                if (isDead) {
                                  void handleSell(animal, 0, growth.displayName);
                                } else {
                                  play('click');
                                  setConfirmSellId(animal.id);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 10px',
                                borderRadius: 6,
                                background: isDead ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                                border: isDead
                                  ? '1px solid rgba(239, 68, 68, 0.6)'
                                  : '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#fca5a5',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                            >
                              <span>{isDead ? '💀 Dọn dẹp xác chết (Bấm dọn ngay)' : 'Bán con vật'}</span>
                              <span style={{ fontWeight: 700, color: isDead ? '#f87171' : '#fef08a' }}>
                                {num(growth.sellPrice)} Xu
                                {isAdult && !isDead ? (
                                  <span style={{ color: '#34d399', marginLeft: 4 }}>
                                    (+{num(growth.sellPrice - def.stockPrice)} Lãi)
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          ) : (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: 6,
                                background: 'rgba(239, 68, 68, 0.25)',
                                borderRadius: 6,
                                border: '1px solid #ef4444',
                              }}
                            >
                              <span style={{ fontSize: 11, color: '#ffffff', flex: 1 }}>
                                {isDead
                                  ? `Dọn xác ${def.name} để giải phóng chuồng?`
                                  : `Bán ${growth.displayName} lấy ${num(growth.sellPrice)} Xu?`}
                              </span>
                              <Button
                                disabled={isBusy}
                                onClick={() => void handleSell(animal, growth.sellPrice, growth.displayName)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: 11,
                                  borderRadius: 4,
                                  background: '#ef4444',
                                  color: '#fff',
                                  fontWeight: 700,
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                {isDead ? 'Dọn' : 'Bán'}
                              </Button>
                              <Button
                                onClick={() => setConfirmSellId(null)}
                                style={{
                                  padding: '3px 8px',
                                  fontSize: 11,
                                  borderRadius: 4,
                                  background: 'rgba(71, 85, 105, 0.8)',
                                  color: '#cbd5e1',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                Hủy
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Breeding Partner Selection Modal Overlay */}
      {selectedBreedingParent &&
        (() => {
          const parentDef = (ANIMALS as Record<string, (typeof ANIMALS)[AnimalType]>)[
            selectedBreedingParent.type
          ];
          const parentGrowth = computeAnimalGrowthStage(
            selectedBreedingParent.type,
            selectedBreedingParent.createdAt || new Date().toISOString(),
            nowMs,
            selectedBreedingParent.fedAt ?? null,
            selectedBreedingParent.growthAccumSec || 0,
          );
          const parentHunger = computeAnimalHunger(
            selectedBreedingParent.type,
            selectedBreedingParent.fedAt ?? null,
            selectedBreedingParent.lastYieldAt ?? null,
            nowMs,
            parentGrowth.stage === 'adult',
            selectedBreedingParent.createdAt || new Date().toISOString(),
          );
          const parentCand: BreedingCandidate = {
            id: selectedBreedingParent.id,
            type: selectedBreedingParent.type as AnimalType,
            displayName: parentGrowth.displayName,
            stage: parentGrowth.stage,
            happiness: selectedBreedingParent.happiness,
            isDead: false,
            isHungry: parentHunger.isHungry,
            bredAt: selectedBreedingParent.bredAt ? new Date(selectedBreedingParent.bredAt).getTime() : null,
          };

          const candidatePartners = animals.filter(
            (a) => a.type === selectedBreedingParent.type && a.id !== selectedBreedingParent.id && !a.isDead,
          );

          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.72)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 16,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedBreedingParent(null);
                }
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 620,
                  maxHeight: '88vh',
                  background: '#0f172a',
                  border: '1px solid rgba(244, 114, 182, 0.45)',
                  borderRadius: 14,
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(236, 72, 153, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Modal Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderBottom: '1px solid rgba(244, 114, 182, 0.2)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>💕</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                        Ghép Đôi Nhân Giống: {parentDef?.name ?? selectedBreedingParent.type}
                      </div>
                      <div style={{ fontSize: 11, color: '#f472b6' }}>
                        Sinh sản con non tự nhiên mà không cần mua con giống!
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBreedingParent(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body */}
                <div
                  style={{
                    padding: 18,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14,
                  }}
                >
                  {/* Rules Banner */}
                  <div
                    style={{
                      background: 'rgba(236, 72, 153, 0.1)',
                      border: '1px solid rgba(244, 114, 182, 0.3)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 12,
                      color: '#fbcfe8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: '#f472b6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>✨ Quy tắc phối giống:</span>
                    </div>
                    <div>
                      • Cả 2 con vật phải cùng loài, trưởng thành, no bụng và đạt{' '}
                      <strong>≥{BREEDING_MIN_HAPPINESS}%</strong> hạnh phúc.
                    </div>
                    <div>
                      • Sau khi ghép đôi: sinh ra 1 con non <strong>{parentDef?.babyName}</strong> (100% hạnh
                      phúc).
                    </div>
                    <div>
                      • Bố và Mẹ bị giảm <strong>-{BREEDING_HAPPINESS_COST}%</strong> hạnh phúc và cần nghỉ
                      ngơi <strong>{Math.round((parentDef?.breedingCooldownSec ?? 600) / 60)} phút</strong>.
                    </div>
                  </div>

                  {/* Primary Selected Parent Card */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(244, 114, 182, 0.35)',
                      borderRadius: 10,
                      padding: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img
                        src={farmItemIcon(selectedBreedingParent.type, 44)}
                        alt={parentGrowth.displayName}
                        style={{ width: 44, height: 44, imageRendering: 'pixelated' }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            color: '#f472b6',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          Con Bố / Mẹ 1
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                          {selectedBreedingParent.name || parentGrowth.displayName}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{parentDef?.name} · Trưởng Thành</div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#f43f5e',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      <Heart size={14} fill="#f43f5e" />
                      <span>{selectedBreedingParent.happiness}% Hạnh phúc</span>
                    </div>
                  </div>

                  {/* Partner Candidate List */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>
                      Chọn Bạn Ghép Đôi ({candidatePartners.length} con trong chuồng):
                    </div>

                    {candidatePartners.length === 0 ? (
                      <div
                        style={{
                          padding: '24px 16px',
                          textAlign: 'center',
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px dashed rgba(148, 163, 184, 0.3)',
                          borderRadius: 10,
                          color: '#94a3b8',
                          fontSize: 13,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 28 }}>🏠</span>
                        <div>
                          Trang trại chưa có thêm con <strong>{parentDef?.name}</strong> nào khác để ghép đôi!
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Hãy vào Cửa Hàng Bác Sáu mua thêm con giống để nuôi lớn rồi ghép đôi nhé.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {candidatePartners.map((partner) => {
                          const partnerGrowth = computeAnimalGrowthStage(
                            partner.type,
                            partner.createdAt || new Date().toISOString(),
                            nowMs,
                            partner.fedAt ?? null,
                            partner.growthAccumSec || 0,
                          );
                          const partnerHunger = computeAnimalHunger(
                            partner.type,
                            partner.fedAt ?? null,
                            partner.lastYieldAt ?? null,
                            nowMs,
                            partnerGrowth.stage === 'adult',
                            partner.createdAt || new Date().toISOString(),
                          );
                          const partnerCand: BreedingCandidate = {
                            id: partner.id,
                            type: partner.type as AnimalType,
                            displayName: partnerGrowth.displayName,
                            stage: partnerGrowth.stage,
                            happiness: partner.happiness,
                            isDead: false,
                            isHungry: partnerHunger.isHungry,
                            bredAt: partner.bredAt ? new Date(partner.bredAt).getTime() : null,
                          };

                          const check = canBreedAnimals(
                            parentCand,
                            partnerCand,
                            nowMs,
                            animals.length,
                            livestockCapacity,
                          );

                          const isBreedingThis =
                            loadingAction === `breed_${selectedBreedingParent.id}_${partner.id}`;

                          return (
                            <div
                              key={partner.id}
                              style={{
                                background: check.ok ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.5)',
                                border: check.ok
                                  ? '1px solid rgba(244, 114, 182, 0.4)'
                                  : '1px solid rgba(71, 85, 105, 0.3)',
                                borderRadius: 10,
                                padding: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                  src={farmItemIcon(partner.type, 38)}
                                  alt={partnerGrowth.displayName}
                                  style={{ width: 38, height: 38, imageRendering: 'pixelated' }}
                                />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                                    {partner.name || partnerGrowth.displayName}
                                  </div>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      fontSize: 11,
                                      color: '#94a3b8',
                                      marginTop: 2,
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: partnerGrowth.stage === 'adult' ? '#34d399' : '#fbbf24',
                                      }}
                                    >
                                      {partnerGrowth.stage === 'adult' ? 'Trưởng thành' : 'Đang lớn'}
                                    </span>
                                    <span>·</span>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        color: '#f43f5e',
                                      }}
                                    >
                                      <Heart size={11} fill="#f43f5e" /> {partner.happiness}%
                                    </span>
                                    <span>·</span>
                                    <span style={{ color: partnerHunger.isHungry ? '#f87171' : '#cbd5e1' }}>
                                      {partnerHunger.isHungry ? 'Đang đói' : 'No bụng'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {check.ok ? (
                                  <Button
                                    disabled={loadingAction !== null}
                                    onClick={() => void handleBreed(selectedBreedingParent, partner)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '6px 14px',
                                      fontSize: 11,
                                      borderRadius: 6,
                                      background: 'linear-gradient(90deg, #ec4899 0%, #db2777 100%)',
                                      color: '#ffffff',
                                      fontWeight: 700,
                                      cursor: loadingAction !== null ? 'not-allowed' : 'pointer',
                                      border: 'none',
                                      boxShadow: '0 2px 6px rgba(236, 72, 153, 0.4)',
                                    }}
                                  >
                                    {isBreedingThis ? 'Đang ghép đôi...' : '💕 Ghép Đôi Ngay'}
                                  </Button>
                                ) : (
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: '#94a3b8',
                                      background: 'rgba(51, 65, 85, 0.5)',
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      maxWidth: 200,
                                      textAlign: 'right',
                                    }}
                                    title={check.reason}
                                  >
                                    {check.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '12px 18px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderTop: '1px solid rgba(71, 85, 105, 0.3)',
                  }}
                >
                  <Button
                    onClick={() => setSelectedBreedingParent(null)}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      borderRadius: 6,
                      background: 'rgba(71, 85, 105, 0.6)',
                      color: '#e2e8f0',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
    </Panel>
  );
}
