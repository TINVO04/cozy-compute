import { VEHICLES } from './vehicles.js';
import { GEN_Z_FURNITURE } from './furniture.js';
export { GEN_Z_FURNITURE, GEN_Z_FURNITURE_IDS } from './furniture.js';

export type ItemType = 'clothing' | 'furniture' | 'rod' | 'boat' | 'vehicle';
export type ClothingSlot = 'hat' | 'top' | 'face' | 'rod' | 'boat' | 'vehicle';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'defiant' | 'sovereign';

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Phổ thông',
  rare: 'Hiếm có',
  epic: 'Sử thi',
  legendary: 'Huyền thoại',
  defiant: 'Nghịch Thiên',
  sovereign: 'Chí Tôn',
};

export interface RodConfig {
  id: string;
  name: string;
  description: string;
  coinPrice: number;
  rarity: Rarity;
  sprite: string;
  shadowBonus: number; // Boost weight for large shadows & rare/epic/legendary fish
  reactionBonusMs: number; // Widens reaction window (ms)
  biteSpeedBonus: number; // Reduces wait time until bite (0 to 0.5)
}

export const FISHING_RODS: Record<string, RodConfig> = {
  rod_twig: {
    id: 'rod_twig',
    name: 'Cần Cành Cây',
    description: 'Cần câu mộc mạc uốn từ nhánh cây khô nhặt ven hồ. Phù hợp câu các loài cá nhỏ bóng 1-2.',
    coinPrice: 60,
    rarity: 'common',
    sprite: 'rod:twig:#8b5a2b',
    shadowBonus: 0,
    reactionBonusMs: 0,
    biteSpeedBonus: 0,
  },
  rod_wooden: {
    id: 'rod_wooden',
    name: 'Cần Gỗ Mộc',
    description: 'Thân gỗ thông đánh bóng kèm dây cước bền chắc, tăng tỷ lệ bóng 2-3 và phản xạ ổn định.',
    coinPrice: 350,
    rarity: 'common',
    sprite: 'rod:wooden:#b47547',
    shadowBonus: 0.25,
    reactionBonusMs: 60,
    biteSpeedBonus: 0.08,
  },
  rod_fiberglass: {
    id: 'rod_fiberglass',
    name: 'Cần Sợi Thủy Tinh',
    description: 'Sợi thủy tinh cao cấp dẻo dai đàn hồi. Tăng mạnh cơ hội chạm trán các loài cá bóng 3-4.',
    coinPrice: 1200,
    rarity: 'rare',
    sprite: 'rod:fiberglass:#06b6d4',
    shadowBonus: 0.6,
    reactionBonusMs: 140,
    biteSpeedBonus: 0.15,
  },
  rod_pro_carbon: {
    id: 'rod_pro_carbon',
    name: 'Cần Carbon Chuyên Nghiệp',
    description:
      'Sợi carbon đúc nhiệt siêu nhẹ, độ nhạy cao. Nới rộng thời gian phản xạ +250ms, săn cá bóng 4-5.',
    coinPrice: 3800,
    rarity: 'epic',
    sprite: 'rod:carbon:#334155',
    shadowBonus: 1.0,
    reactionBonusMs: 250,
    biteSpeedBonus: 0.25,
  },
  rod_golden_legend: {
    id: 'rod_golden_legend',
    name: 'Cần Vàng Thần Thoại',
    description:
      'Mạ vàng hoàng gia 24K nạm ngọc trai lấp lánh. Thu hút đặc biệt các loài thủy quái bóng 5 và bóng 6 vương miện!',
    coinPrice: 12500,
    rarity: 'legendary',
    sprite: 'rod:golden:#f59e0b',
    shadowBonus: 1.6,
    reactionBonusMs: 400,
    biteSpeedBonus: 0.35,
  },
  rod_abyssal: {
    id: 'rod_abyssal',
    name: 'Cần Biển Sâu Ma Thuật',
    description:
      'Chế tác từ xương cổ long ngàn năm phát quang lân tinh tím. Cá cắn mồi siêu nhanh, tối đa cơ hội bắt Leviathan!',
    coinPrice: 28000,
    rarity: 'legendary',
    sprite: 'rod:abyssal:#8b5cf6',
    shadowBonus: 2.2,
    reactionBonusMs: 550,
    biteSpeedBonus: 0.5,
  },
};

/** Normalizes any rod identifier or sprite string into a valid canonical RodConfig id */
export function normalizeRodId(rod?: string | null): string {
  if (!rod) return 'rod_twig';
  if (FISHING_RODS[rod]) return rod;
  if (rod.includes('fiberglass')) return 'rod_fiberglass';
  if (rod.includes('wooden')) return 'rod_wooden';
  if (rod.includes('carbon')) return 'rod_pro_carbon';
  if (rod.includes('golden')) return 'rod_golden_legend';
  if (rod.includes('abyssal')) return 'rod_abyssal';
  if (rod.includes('twig')) return 'rod_twig';
  const match = Object.values(FISHING_RODS).find((r) => r.sprite === rod);
  if (match) return match.id;
  return 'rod_twig';
}

export type SeaZoneAccess = 'shallows' | 'coastal' | 'open_sea' | 'abyss';

export interface BoatConfig {
  id: string;
  name: string;
  description: string;
  coinPrice: number;
  rarity: Rarity;
  sprite: string;
  speed: number; // movement speed (pixels/sec) when mounted on water
  seaZoneAccess: SeaZoneAccess;
  wakeColor?: string;
}

export const BOATS: Record<string, BoatConfig> = {
  boat_coracle: {
    id: 'boat_coracle',
    name: 'Thuyền Thúng Nan Tre',
    description:
      'Thuyền thúng đan từ nan tre trét dầu rái truyền thống Nam Bộ. Nhẹ nhàng, bền bỉ, dạo êm ả vùng đầm lầy và cửa sông ven bờ.',
    coinPrice: 1500,
    rarity: 'common',
    sprite: 'boat:coracle:#8b5a2b',
    speed: 130,
    seaZoneAccess: 'shallows',
    wakeColor: '#bae6fd',
  },
  boat_sampan: {
    id: 'boat_sampan',
    name: 'Thuyền Gỗ Tam Bản',
    description:
      'Thuyền gỗ ba lá vững chãi lướt sóng êm ái, có mui lá dừa che nắng mưa. Đủ chắc chắn để vượt sóng ra các rạn san hô ven biển.',
    coinPrice: 6000,
    rarity: 'rare',
    sprite: 'boat:sampan:#b47547',
    speed: 170,
    seaZoneAccess: 'coastal',
    wakeColor: '#38bdf8',
  },
  boat_cutter: {
    id: 'boat_cutter',
    name: 'Ca Nô Composite Cao Tốc',
    description:
      'Ca nô thân sợi composite gắn động cơ công suất cao, lướt sóng xé gió với vệt bọt tuyết trắng xóa. Thoải mái vươn ra toàn bộ vịnh biển khơi.',
    coinPrice: 22000,
    rarity: 'epic',
    sprite: 'boat:cutter:#0284c7',
    speed: 230,
    seaZoneAccess: 'open_sea',
    wakeColor: '#e0f2fe',
  },
  boat_trawler: {
    id: 'boat_trawler',
    name: 'Tàu Viễn Dương Hoàng Kim',
    description:
      'Tàu đánh cá đại dương kiên cố bọc đồng, trang bị đèn cao áp rọi biển đêm và radar định vị. Khắc tinh bão tố, tiến thẳng vào Rãnh Biển Sâu săn cá Thần Thoại!',
    coinPrice: 65000,
    rarity: 'legendary',
    sprite: 'boat:trawler:#f59e0b',
    speed: 270,
    seaZoneAccess: 'abyss',
    wakeColor: '#fef08a',
  },
};

/** Normalizes any boat identifier or sprite string into a valid canonical BoatConfig id */
export function normalizeBoatId(boat?: string | null): string | null {
  if (!boat) return null;
  if (BOATS[boat]) return boat;
  if (boat.includes('coracle')) return 'boat_coracle';
  if (boat.includes('sampan')) return 'boat_sampan';
  if (boat.includes('cutter')) return 'boat_cutter';
  if (boat.includes('trawler')) return 'boat_trawler';
  const match = Object.values(BOATS).find((b) => b.sprite === boat);
  if (match) return match.id;
  return null;
}

export interface ItemDefinitionSeed {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  rarity: Rarity;
  coinPrice: number;
  /** Sprite key used by the client renderer. */
  sprite: string;
  slot?: ClothingSlot;
  /** Furniture footprint in apartment tiles. */
  size?: { w: number; h: number };
  /** Apartment score contribution for furniture. */
  decor?: number;
}

export const ITEM_SEEDS: ItemDefinitionSeed[] = [
  // fishing rods
  ...Object.values(FISHING_RODS).map((r) => ({
    id: r.id,
    type: 'rod' as const,
    slot: 'rod' as const,
    name: r.name,
    description: r.description,
    rarity: r.rarity,
    coinPrice: r.coinPrice,
    sprite: r.sprite,
  })),
  // fishing boats
  ...Object.values(VEHICLES).map((v) => ({
    id: v.id,
    type: 'vehicle' as const,
    slot: 'vehicle' as const,
    name: v.name,
    description: `Chạy nhanh gấp ${(v.speed / 150).toFixed(1)} lần đi bộ trên đường. V để lên / xuống xe.`,
    rarity: 'common' as const,
    coinPrice: v.price,
    sprite: v.id,
  })),
  ...Object.values(BOATS).map((b) => ({
    id: b.id,
    type: 'boat' as const,
    slot: 'boat' as const,
    name: b.name,
    description: b.description,
    rarity: b.rarity,
    coinPrice: b.coinPrice,
    sprite: b.sprite,
  })),
  // clothing: hats
  {
    id: 'hat_beanie_plum',
    type: 'clothing',
    slot: 'hat',
    sprite: 'beanie:#7a4b8c',
    name: 'Mũ Len Mận Chín',
    rarity: 'common',
    coinPrice: 120,
    description: 'Mũ len ấm áp cho những ngày trời trở gió bên bờ hồ.',
  },
  {
    id: 'hat_cap_mint',
    type: 'clothing',
    slot: 'hat',
    sprite: 'cap:#3e9b7a',
    name: 'Mũ Lưỡi Trai Bạc Hà',
    rarity: 'common',
    coinPrice: 150,
    description: 'Chiếc mũ lưỡi trai năng động che nắng khi đi câu cá.',
  },
  {
    id: 'hat_chef',
    type: 'clothing',
    slot: 'hat',
    sprite: 'chef:#f7f4ee',
    name: 'Mũ Đầu Bếp Đáng Ngờ',
    rarity: 'rare',
    coinPrice: 420,
    description: 'Bạn chưa từng nấu ăn, nhưng chiếc mũ này lại tạo cảm giác đầu bếp thượng hạng.',
  },
  {
    id: 'hat_cone',
    type: 'clothing',
    slot: 'hat',
    sprite: 'cone:#ef7a3a',
    name: 'Nón Giao Thông Tinh Nghịch',
    rarity: 'epic',
    coinPrice: 1200,
    description: 'Một chiếc nón hình chóp giao thông nổi bật giữa đám đông.',
  },
  {
    id: 'hat_crown',
    type: 'clothing',
    slot: 'hat',
    sprite: 'crown:#e6b84a',
    name: 'Vương Miện Quý Phái',
    rarity: 'legendary',
    coinPrice: 4800,
    description: 'Tác phẩm hoàng gia bằng vàng nguyên chất khẳng định đẳng cấp quý tộc.',
  },
  {
    id: 'hat_cat_ears',
    type: 'clothing',
    slot: 'hat',
    sprite: 'cat_ears:#ec4899',
    name: 'Tai Mèo Anime Neon',
    rarity: 'rare',
    coinPrice: 650,
    description: 'Tai mèo Chibi 2 màu hồng phấn phát sáng cực dễ thương.',
  },
  {
    id: 'hat_straw_summer',
    type: 'clothing',
    slot: 'hat',
    sprite: 'straw_summer:#f59e0b',
    name: 'Mũ Cói Mùa Hè Thủy Thủ',
    rarity: 'common',
    coinPrice: 190,
    description: 'Chiếc mũ cói thắt ruy băng đỏ lý tưởng cho những chuyến câu bến tàu.',
  },
  {
    id: 'hat_witch_cosmic',
    type: 'clothing',
    slot: 'hat',
    sprite: 'witch_cosmic:#7c3aed',
    name: 'Mũ Phù Thủy Ngân Hà',
    rarity: 'epic',
    coinPrice: 1600,
    description: 'Mũ chóp tím huyền bí đính dải ngân hà và ngôi sao hoàng kim.',
  },
  {
    id: 'hat_beret_artist',
    type: 'clothing',
    slot: 'hat',
    sprite: 'beret_artist:#e11d48',
    name: 'Mũ Nồi Nghệ Sĩ Paris',
    rarity: 'rare',
    coinPrice: 480,
    description: 'Mũ beret dạ lãng mạn mang đậm chất thi vị đường phố.',
  },
  {
    id: 'hat_halo_angel',
    type: 'clothing',
    slot: 'hat',
    sprite: 'halo_angel:#facc15',
    name: 'Hào Quang Thiên Thần',
    rarity: 'legendary',
    coinPrice: 5500,
    description: 'Vòng hào quang vàng nguyên chất lơ lửng tỏa sáng thuần khiết.',
  },
  // clothing: tops
  {
    id: 'top_hoodie_coral',
    type: 'clothing',
    slot: 'top',
    sprite: 'hoodie:#e0735b',
    name: 'Áo Hoodie San Hô',
    rarity: 'common',
    coinPrice: 180,
    description: 'Áo khoác nỉ san hô ấm áp với túi kangaroo tiện lợi.',
  },
  {
    id: 'top_tee_sky',
    type: 'clothing',
    slot: 'top',
    sprite: 'tee:#6f9fe0',
    name: 'Áo Thun Bầu Trời',
    rarity: 'common',
    coinPrice: 140,
    description: 'Chiếc áo thun xanh da trời thanh lịch, thoáng mát suốt ngày dài.',
  },
  {
    id: 'top_raincoat',
    type: 'clothing',
    slot: 'top',
    sprite: 'raincoat:#e6c63a',
    name: 'Áo Mưa Bến Cảng',
    rarity: 'rare',
    coinPrice: 520,
    description: 'Áo mưa chống thấm chuyên dụng cho các cần thủ kiên cường dưới mưa.',
  },
  {
    id: 'top_suit',
    type: 'clothing',
    slot: 'top',
    sprite: 'suit:#2f3350',
    name: 'Âu Phục Phỏng Vấn',
    rarity: 'epic',
    coinPrice: 1500,
    description: 'Bộ vest chỉnh chu, lịch lãm cho những dịp trang trọng.',
  },
  {
    id: 'top_sweater_duck',
    type: 'clothing',
    slot: 'top',
    sprite: 'sweater:#3e9b7a',
    name: 'Áo Len Vịt Vàng',
    rarity: 'legendary',
    coinPrice: 5200,
    description: 'Áo len đan tay họa tiết chú vịt vàng biểu tượng của thị trấn.',
  },
  {
    id: 'top_kimono_sakura',
    type: 'clothing',
    slot: 'top',
    sprite: 'kimono:#f472b6',
    name: 'Yukata Hoa Anh Đào',
    rarity: 'rare',
    coinPrice: 680,
    description: 'Trang phục truyền thống Nhật Bản họa tiết hoa anh đào thanh nhã.',
  },
  {
    id: 'top_cyber_jacket',
    type: 'clothing',
    slot: 'top',
    sprite: 'cyber_jacket:#06b6d4',
    name: 'Áo Khoác Cyberpunk LED',
    rarity: 'epic',
    coinPrice: 1800,
    description: 'Áo khoác công nghệ tương lai viền đèn neon xanh cyan rực rỡ.',
  },
  {
    id: 'top_sailor_uniform',
    type: 'clothing',
    slot: 'top',
    sprite: 'sailor_uniform:#1e40af',
    name: 'Đồng Phục Thủy Thủ Anime',
    rarity: 'rare',
    coinPrice: 580,
    description: 'Áo thủy thủ cổ bẻ thắt nơ đỏ phong cách Chibi kinh điển.',
  },
  {
    id: 'top_overalls_cozy',
    type: 'clothing',
    slot: 'top',
    sprite: 'overalls:#2563eb',
    name: 'Yếm Denim Thợ Câu Phố Biển',
    rarity: 'common',
    coinPrice: 220,
    description: 'Quần yếm bò thời trang bền bỉ có túi riêng đựng mồi câu.',
  },
  // clothing: face
  {
    id: 'face_glasses',
    type: 'clothing',
    slot: 'face',
    sprite: 'glasses:#2b2320',
    name: 'Kính Tròn Trí Thức',
    rarity: 'common',
    coinPrice: 100,
    description: 'Gọng kính đen tròn cổ điển tôn lên vẻ thông thái.',
  },
  {
    id: 'face_shades',
    type: 'clothing',
    slot: 'face',
    sprite: 'shades:#1c1c28',
    name: 'Kính Râm Cực Ngầu',
    rarity: 'rare',
    coinPrice: 380,
    description: 'Kính râm đen sành điệu, bất chấp ngày hay đêm.',
  },
  {
    id: 'face_mustache',
    type: 'clothing',
    slot: 'face',
    sprite: 'mustache:#5a3a22',
    name: 'Ria Mép Quý Tộc',
    rarity: 'epic',
    coinPrice: 900,
    description: 'Hàng ria mép uốn cong lịch thiệp của một quý ông.',
  },
  {
    id: 'face_blush_anime',
    type: 'clothing',
    slot: 'face',
    sprite: 'blush_anime:#f43f5e',
    name: 'Má Hồng Trái Tim Anime',
    rarity: 'rare',
    coinPrice: 320,
    description: 'Hiệu ứng gò má ửng hồng long lanh hình trái tim Chibi ngọt ngào.',
  },
  {
    id: 'face_bandage',
    type: 'clothing',
    slot: 'face',
    sprite: 'bandage:#fbbf24',
    name: 'Băng Dán Mũi Anime Hero',
    rarity: 'common',
    coinPrice: 120,
    description: 'Miếng băng cá nhân chéo mũi phong cách hoạt hình tràn đầy năng lượng.',
  },
  {
    id: 'face_eyepatch_pirate',
    type: 'clothing',
    slot: 'face',
    sprite: 'eyepatch:#0f172a',
    name: 'Bịt Mắt Thuyền Trưởng',
    rarity: 'epic',
    coinPrice: 850,
    description: 'Bịt mắt da đen cá tính của thuyền trưởng hải tặc khét tiếng.',
  },
  {
    id: 'face_mask_kawaii',
    type: 'clothing',
    slot: 'face',
    sprite: 'mask_kawaii:#38bdf8',
    name: 'Khẩu Trang Gấu Chibi',
    rarity: 'common',
    coinPrice: 150,
    description: 'Khẩu trang mềm mại in hình mũi gấu bông siêu dễ thương.',
  },
  // furniture
  ...GEN_Z_FURNITURE,
  {
    id: 'furn_chair',
    type: 'furniture',
    sprite: 'chair:#b7b890',
    size: { w: 1, h: 1 },
    decor: 2,
    name: 'Ghế Gỗ Mộc Mạc',
    rarity: 'common',
    coinPrice: 90,
    description: 'Ghế tựa gỗ ấm cúng cho căn hộ nhỏ của bạn.',
  },
  {
    id: 'furn_table',
    type: 'furniture',
    sprite: 'table:#8a5a3b',
    size: { w: 2, h: 1 },
    decor: 3,
    name: 'Bàn Trà Ăn Vặt',
    rarity: 'common',
    coinPrice: 160,
    description: 'Chiếc bàn gỗ nhỏ gọn để vừa ấm trà và vài món ăn nhẹ.',
  },
  {
    id: 'furn_plant',
    type: 'furniture',
    sprite: 'plant:#3e9b7a',
    size: { w: 1, h: 1 },
    decor: 3,
    name: 'Chậu Monstera Góc Chill',
    rarity: 'common',
    coinPrice: 110,
    description: 'Mang hơi thở thiên nhiên tươi mát vào không gian sống.',
  },
  {
    id: 'furn_rug',
    type: 'furniture',
    sprite: 'rug:#b6a3bd',
    size: { w: 2, h: 2 },
    decor: 4,
    name: 'Thảm Caro Lilac',
    rarity: 'common',
    coinPrice: 200,
    description: 'Thảm caro tím lilac và kem, trải dưới bàn hoặc ghế cho góc chill mềm mại.',
  },
  {
    id: 'furn_lamp',
    type: 'furniture',
    sprite: 'lamp:#dcc79a',
    size: { w: 1, h: 1 },
    decor: 3,
    name: 'Đèn Cây Nghệ Thuật',
    rarity: 'common',
    coinPrice: 130,
    description: 'Ánh sáng vàng ấm áp lan tỏa khắp căn phòng vào ban đêm.',
  },
  {
    id: 'furn_bed',
    type: 'furniture',
    sprite: 'bed:#9caec9',
    size: { w: 2, h: 2 },
    decor: 5,
    name: 'Giường Ngủ Êm Ái',
    rarity: 'rare',
    coinPrice: 480,
    description: 'Nơi nghỉ ngơi lý tưởng sau một ngày câu cá miệt mài.',
  },
  {
    id: 'furn_sofa',
    type: 'furniture',
    sprite: 'sofa:#c69d90',
    size: { w: 2, h: 1 },
    decor: 5,
    name: 'Sofa Thư Giãn',
    rarity: 'rare',
    coinPrice: 540,
    description: 'Chiếc ghế sofa êm ái để tiếp đón bạn bè đến thăm nhà.',
  },
  {
    id: 'furn_bookshelf',
    type: 'furniture',
    sprite: 'bookshelf:#8a5a3b',
    size: { w: 2, h: 1 },
    decor: 5,
    name: 'Kệ Sách Tri Thức',
    rarity: 'rare',
    coinPrice: 460,
    description: 'Kệ gỗ trưng bày sách và những kỷ vật đáng nhớ.',
  },
  {
    id: 'furn_tv',
    type: 'furniture',
    sprite: 'tv:#2f3350',
    size: { w: 2, h: 1 },
    decor: 6,
    name: 'Tivi Màn Siêu Lớn',
    rarity: 'epic',
    coinPrice: 1300,
    description: 'Màn hình tivi giải trí sắc nét cho phòng khách hiện đại.',
  },
  {
    id: 'furn_aquarium',
    type: 'furniture',
    sprite: 'aquarium:#6fc3d8',
    size: { w: 2, h: 1 },
    decor: 7,
    name: 'Bể Cá Thủy Sinh',
    rarity: 'epic',
    coinPrice: 1600,
    description: 'Bể kính trong suốt ngắm nhìn những chú cá bơi lội tung tăng.',
  },
  {
    id: 'furn_duck_statue',
    type: 'furniture',
    sprite: 'duckstatue:#e6c63a',
    size: { w: 1, h: 1 },
    decor: 12,
    name: 'Tượng Vịt Vàng Thần Tài',
    rarity: 'legendary',
    coinPrice: 6000,
    description: 'Tượng vịt vàng đúc đồng mang lại may mắn và tài lộc.',
  },
  {
    id: 'furn_gaming_chair',
    type: 'furniture',
    sprite: 'gamingchair:#a0b8bd',
    size: { w: 1, h: 1 },
    decor: 6,
    name: 'Ghế Setup Pastel',
    rarity: 'epic',
    coinPrice: 1400,
    description: 'Ghế công thái học xanh khói, gối tựa êm và chân xoay gọn gàng cho góc setup.',
  },
  {
    id: 'furn_arcade_machine',
    type: 'furniture',
    sprite: 'arcade:#ae9dbc',
    size: { w: 1, h: 2 },
    decor: 9,
    name: 'Máy Game Thùng Retro 1980',
    rarity: 'epic',
    coinPrice: 2400,
    description: 'Tủ arcade trang trí màu lilac, màn hình pixel và nút bấm nhiều màu gợi thời 8-bit.',
  },
  {
    id: 'furn_cat_tree',
    type: 'furniture',
    sprite: 'cattree:#c9ad8e',
    size: { w: 1, h: 2 },
    decor: 7,
    name: 'Nhà Cây Mèo Chibi 3 Tầng',
    rarity: 'rare',
    coinPrice: 850,
    description: 'Tháp cào móng 3 tầng lót đệm nhung êm ái cho hoàng thượng.',
  },
];

/** Items granted to every new player so housing and style are usable from minute one. */
export const STARTER_ITEMS: { itemId: string; quantity: number }[] = [
  { itemId: 'furn_chair', quantity: 2 },
  { itemId: 'furn_table', quantity: 1 },
  { itemId: 'furn_plant', quantity: 1 },
  { itemId: 'top_tee_sky', quantity: 1 },
  { itemId: 'rod_twig', quantity: 1 },
];
