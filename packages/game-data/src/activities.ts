import type { Rarity } from './items.js';

export type ActivitySlug = 'fishing' | 'delivery' | 'cafe' | 'event_duck';

export type FishHabitat = 'ocean' | 'freshwater' | 'mythic';

export interface FishSpecies {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  coin: number;
  fame: number;
  habitat: FishHabitat;
  minSizeCm: number;
  maxSizeCm: number;
  description: string;
  /** A new collectible derived from an existing species; rewards remain server-owned. */
  variantOf?: string;
}

export const FISH: FishSpecies[] = [
  // --- COMMON (15 loài phổ thông) ---
  {
    id: 'soggy_boot',
    name: 'Chiếc Ủng Ướt Sũng',
    rarity: 'common',
    weight: 22,
    coin: 8,
    fame: 0,
    habitat: 'ocean',
    minSizeCm: 18,
    maxSizeCm: 36,
    description: 'Không phải cá nhưng câu lên nhiều nhất trần đời. Đựng đầy rong biển và nước.',
  },
  {
    id: 'anxious_minnow',
    name: 'Cá Tuế Bồn Chồn',
    rarity: 'common',
    weight: 28,
    coin: 14,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 6,
    maxSizeCm: 14,
    description: 'Nhìn đâu cũng thấy nguy hiểm, toàn thân run rẩy cả ngày không ngừng.',
  },
  {
    id: 'office_carp',
    name: 'Cá Chép Công Sở',
    rarity: 'common',
    weight: 24,
    coin: 18,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 28,
    maxSizeCm: 65,
    description: 'Cổ thắt cà vạt đỏ tươm tất, bơi đi họp giao ban đúng 8 giờ sáng mỗi ngày.',
  },
  {
    id: 'clownfish',
    name: 'Cá Hề Lạc Lối',
    rarity: 'common',
    weight: 22,
    coin: 20,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 6,
    maxSizeCm: 15,
    description: 'Màu cam sọc trắng rực rỡ, vẫn đang kiên trì tìm đường về nhà từ năm 2003.',
  },
  {
    id: 'seahorse',
    name: 'Cá Ngựa Đi Bộ',
    rarity: 'common',
    weight: 20,
    coin: 22,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 5,
    maxSizeCm: 14,
    description: 'Tự nhận mình là kỵ binh đại dương dũng mãnh dù tốc độ bơi chậm như rùa.',
  },
  {
    id: 'tilapia',
    name: 'Cá Rô Phi Bất Tử',
    rarity: 'common',
    weight: 24,
    coin: 16,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 15,
    maxSizeCm: 38,
    description: 'Ở vũng nước nào cũng sống khoẻ re, sở hữu tinh thần sinh tồn vô địch.',
  },
  {
    id: 'chub',
    name: 'Cá Mương Háu Ăn',
    rarity: 'common',
    weight: 22,
    coin: 15,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 10,
    maxSizeCm: 24,
    description: 'Cắn câu bất chấp mọi loại mồi từ mẩu bánh mì khô đến chiếc vỏ kẹo rớt xuống nước.',
  },
  {
    id: 'guppy_rainbow',
    name: 'Cá Bảy Màu Phù Hoa',
    rarity: 'common',
    weight: 20,
    coin: 18,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 3,
    maxSizeCm: 8,
    description: 'Bé tí hon nhưng chiếc đuôi xòe lộng lẫy uyển chuyển như vũ công công múa.',
  },
  {
    id: 'crawfish',
    name: 'Tôm Hùm Đất Đỏ Cay',
    rarity: 'common',
    weight: 18,
    coin: 22,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 8,
    maxSizeCm: 18,
    description: 'Hai chiếc càng giơ lên thị uy dữ dội nhưng thực ra chỉ hợp đem sốt bơ tỏi cay nồng.',
  },
  {
    id: 'pufferfish',
    name: 'Cá Nóc Hờn Dỗi',
    rarity: 'common',
    weight: 20,
    coin: 24,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 15,
    maxSizeCm: 38,
    description: 'Chỉ cần bị chạm nhẹ là phồng to như quả bóng gai, mắt lườm nguýt giận dỗi.',
  },
  {
    id: 'flounder',
    name: 'Cá Bơn Hai Mắt Một Bên',
    rarity: 'common',
    weight: 18,
    coin: 22,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 22,
    maxSizeCm: 52,
    description: 'Nằm bẹp dí dưới lớp cát trắng, hai con mắt dồn hết sang một bên để nhìn đời trôi qua.',
  },
  {
    id: 'blue_tang',
    name: 'Cá Đuôi Gai Hay Quên',
    rarity: 'common',
    weight: 18,
    coin: 25,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 12,
    maxSizeCm: 26,
    description: 'Vừa cắn câu giật lên bờ là đã quên mất tiêu tại sao mình lại có mặt ở đây.',
  },
  {
    id: 'flying_fish',
    name: 'Cá Chuồn Trốn Nợ',
    rarity: 'common',
    weight: 18,
    coin: 26,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 18,
    maxSizeCm: 40,
    description: 'Mỗi lần thấy có ai nhắc tới nợ nần là dang đôi vây rộng lượn là là trên mặt sóng.',
  },
  {
    id: 'bass_largemouth',
    name: 'Cá Vược Miệng Rộng',
    rarity: 'common',
    weight: 20,
    coin: 25,
    fame: 1,
    habitat: 'freshwater',
    minSizeCm: 25,
    maxSizeCm: 58,
    description: 'Cái mồm to ngoác ra đớp trọn mồi câu rồi lắc đầu nguầy nguậy hối hận không kịp.',
  },
  {
    id: 'flying_squid',
    name: 'Mực Ống Phóng Tên Lửa',
    rarity: 'common',
    weight: 18,
    coin: 28,
    fame: 1,
    habitat: 'ocean',
    minSizeCm: 20,
    maxSizeCm: 48,
    description: 'Xịt mực đen ngòm phản lực đẩy thân hình vút bay qua đầu các cần thủ trên cầu tàu.',
  },

  // --- RARE (15 loài hiếm có) ---
  {
    id: 'disco_trout',
    name: 'Cá Hồi Vũ Trường',
    rarity: 'rare',
    weight: 14,
    coin: 38,
    fame: 2,
    habitat: 'freshwater',
    minSizeCm: 30,
    maxSizeCm: 65,
    description: 'Vảy bảy màu lấp lánh phản chiếu ánh đèn như quả cầu gương disco sàn nhảy thập niên 80.',
  },
  {
    id: 'tax_salmon',
    name: 'Cá Hồi Hoàn Thuế',
    rarity: 'rare',
    weight: 12,
    coin: 48,
    fame: 3,
    habitat: 'freshwater',
    minSizeCm: 35,
    maxSizeCm: 80,
    description: 'Miệng ngậm chặt tờ khai quyết toán thuế thu nhập cá nhân có đóng dấu giáp lai đỏ.',
  },
  {
    id: 'golden_koi',
    name: 'Cá Chép Vàng Phong Thủy',
    rarity: 'rare',
    weight: 14,
    coin: 45,
    fame: 2,
    habitat: 'freshwater',
    minSizeCm: 28,
    maxSizeCm: 68,
    description: 'Vảy vàng óng ả sang trọng, ôm ước mộng hóa rồng nhưng nhảy lên toàn trúng chậu cần thủ.',
  },
  {
    id: 'betta_fighting',
    name: 'Cá Xiêm Chiến Thần',
    rarity: 'rare',
    weight: 12,
    coin: 42,
    fame: 2,
    habitat: 'freshwater',
    minSizeCm: 6,
    maxSizeCm: 16,
    description: 'Vây đỏ rực bồng bềnh, nhìn vào cái bóng của chính mình dưới nước cũng muốn lao vào đấm.',
  },
  {
    id: 'piranha',
    name: 'Cá Piranha Răng Sún',
    rarity: 'rare',
    weight: 12,
    coin: 44,
    fame: 2,
    habitat: 'freshwater',
    minSizeCm: 14,
    maxSizeCm: 32,
    description: 'Hàm răng sắc lẹm trứ danh nhưng vì ham đớp vỏ trai nên gãy mất một chiếc răng cửa.',
  },
  {
    id: 'snakehead',
    name: 'Cá Lóc Canh Chua',
    rarity: 'rare',
    weight: 14,
    coin: 46,
    fame: 2,
    habitat: 'freshwater',
    minSizeCm: 35,
    maxSizeCm: 88,
    description: 'Lực lưỡng và thiện chiến, nhưng hễ nghe tiếng bạc hà và me dốt là giật mình thon thót.',
  },
  {
    id: 'lionfish',
    name: 'Cá Sư Tử Điệu Đà',
    rarity: 'rare',
    weight: 12,
    coin: 50,
    fame: 3,
    habitat: 'ocean',
    minSizeCm: 20,
    maxSizeCm: 44,
    description: 'Vây gai xoè rộng thướt tha như đầm dạ hội hoàng gia, độc đáo và đầy kiêu sa.',
  },
  {
    id: 'barracuda',
    name: 'Cá Nhồng Tốc Độ',
    rarity: 'rare',
    weight: 12,
    coin: 52,
    fame: 3,
    habitat: 'ocean',
    minSizeCm: 45,
    maxSizeCm: 125,
    description: 'Phóng nhanh như tia chớp xé toạc mặt biển, hàm răng sắc nhọn thích đi hù dọa đàn cá nhỏ.',
  },
  {
    id: 'anglerfish',
    name: 'Cá Lồng Đèn Đèn Pin',
    rarity: 'rare',
    weight: 10,
    coin: 58,
    fame: 3,
    habitat: 'ocean',
    minSizeCm: 28,
    maxSizeCm: 68,
    description:
      'Treo bóng đèn LED siêu sáng trước trán, ban đêm thường bật lên để đọc truyện tranh dưới đáy biển.',
  },
  {
    id: 'moray_eel',
    name: 'Cá Lở Lợm Hang Đá',
    rarity: 'rare',
    weight: 11,
    coin: 55,
    fame: 3,
    habitat: 'ocean',
    minSizeCm: 60,
    maxSizeCm: 155,
    description: 'Chuyên thò đầu ra khỏi hốc đá há hốc mồm làm meme ngạc nhiên cho toàn bộ sinh vật biển.',
  },
  {
    id: 'pink_dolphin',
    name: 'Cá Heo Hồng Thủy Chung',
    rarity: 'rare',
    weight: 9,
    coin: 65,
    fame: 4,
    habitat: 'freshwater',
    minSizeCm: 160,
    maxSizeCm: 255,
    description: 'Sinh vật quý hiếm với làn da hồng kẹo ngọt ngào, mang lại tình yêu và may mắn ngập tràn.',
  },
  {
    id: 'dolphin_playful',
    name: 'Cá Heo Soi Bug',
    rarity: 'rare',
    weight: 9,
    coin: 68,
    fame: 4,
    habitat: 'ocean',
    minSizeCm: 180,
    maxSizeCm: 290,
    description: 'Nhào lộn 360 độ trên không trung và cười tít mắt mỗi khi bạn kéo hụt cần câu.',
  },
  {
    id: 'hammerhead_shark',
    name: 'Cá Mập Đầu Búa Sửa Nhà',
    rarity: 'rare',
    weight: 8,
    coin: 72,
    fame: 4,
    habitat: 'ocean',
    minSizeCm: 250,
    maxSizeCm: 460,
    description:
      'Đầu hình chiếc búa thợ mộc tiêu chuẩn nhưng suốt đời chưa tự tay đóng được một cái đinh nào.',
  },
  {
    id: 'swordfish',
    name: 'Cá Kiếm Đệ Nhất',
    rarity: 'rare',
    weight: 8,
    coin: 75,
    fame: 4,
    habitat: 'ocean',
    minSizeCm: 180,
    maxSizeCm: 330,
    description: 'Mũi kiếm nhọn hoắt bóng loáng, tự xưng là tay kiếm hiệp cô độc số một của đại dương xanh.',
  },
  {
    id: 'tuna_giant',
    name: 'Cá Ngừ Đại Dương Thức Khuya',
    rarity: 'rare',
    weight: 9,
    coin: 70,
    fame: 4,
    habitat: 'ocean',
    minSizeCm: 120,
    maxSizeCm: 250,
    description: 'Thịt béo ngậy giàu Omega-3, bơi liên tục không ngừng nghỉ vì sợ không kịp chạy deadline.',
  },

  // --- EPIC (14 loài sử thi) ---
  {
    id: 'philosopher_eel',
    name: 'Lươn Triết Học',
    rarity: 'epic',
    weight: 6,
    coin: 95,
    fame: 6,
    habitat: 'mythic',
    minSizeCm: 70,
    maxSizeCm: 145,
    description: 'Đeo kính một tròng thanh lịch, vừa uốn lượn vừa trăn trở suy tư về ý nghĩa bản thể luận.',
  },
  {
    id: 'electric_catfish',
    name: 'Cá Trê Sạc Nhanh 65W',
    rarity: 'epic',
    weight: 6,
    coin: 98,
    fame: 6,
    habitat: 'freshwater',
    minSizeCm: 40,
    maxSizeCm: 98,
    description:
      'Bộ râu dài truyền dòng điện cực mạnh, cắm dây sạc vào có thể sạc đầy điện thoại trong nháy mắt.',
  },
  {
    id: 'electric_eel',
    name: 'Lươn Điện Cao Thế 220V',
    rarity: 'epic',
    weight: 5,
    coin: 110,
    fame: 7,
    habitat: 'freshwater',
    minSizeCm: 80,
    maxSizeCm: 185,
    description: 'Nguồn phát điện sống cực kỳ uy lực, có thể thắp sáng cả tiệm cà phê trong nhiều giờ liền.',
  },
  {
    id: 'arowana_dragon',
    name: 'Cá Rồng Hoàng Kim',
    rarity: 'epic',
    weight: 5,
    coin: 120,
    fame: 8,
    habitat: 'freshwater',
    minSizeCm: 60,
    maxSizeCm: 130,
    description: 'Vảy vàng kim lấp lánh như dát vàng 18k, báu vật mang lại tài lộc thịnh vượng đỉnh cao.',
  },
  {
    id: 'sturgeon',
    name: 'Cá Tầm Trứng Muối',
    rarity: 'epic',
    weight: 5,
    coin: 125,
    fame: 8,
    habitat: 'freshwater',
    minSizeCm: 100,
    maxSizeCm: 240,
    description:
      'Tồn tại từ thời khủng long kỷ Jura, sở hữu bọc trứng caviar quý giá đắt đỏ hơn cả vàng thỏi.',
  },
  {
    id: 'axolotl',
    name: 'Kỳ Nhông Nước Cười Trừ',
    rarity: 'epic',
    weight: 6,
    coin: 105,
    fame: 7,
    habitat: 'freshwater',
    minSizeCm: 15,
    maxSizeCm: 32,
    description: 'Chiếc bờm mang hồng xòe như đóa sen, trên môi luôn nở nụ cười ngây thơ vô số tội.',
  },
  {
    id: 'catfish_giant',
    name: 'Cá Tra Khổng Lồ Mê Bánh Mì',
    rarity: 'epic',
    weight: 5,
    coin: 130,
    fame: 8,
    habitat: 'freshwater',
    minSizeCm: 120,
    maxSizeCm: 265,
    description: 'Cái bụng bự núng nính, chuyên rình dưới chân cầu tàu để xin bánh mì của khách vãng lai.',
  },
  {
    id: 'alligator_gar',
    name: 'Cá Sấu Hỏa Tiễn Mõm Dài',
    rarity: 'epic',
    weight: 5,
    coin: 135,
    fame: 8,
    habitat: 'freshwater',
    minSizeCm: 100,
    maxSizeCm: 215,
    description:
      'Mõm dài sắc bén như cá sấu đầm lầy, thích thả trôi thân mình giả làm khúc gỗ mục trêu người.',
  },
  {
    id: 'sunfish_mola',
    name: 'Cá Mặt Trăng Ngơ Ngác',
    rarity: 'epic',
    weight: 5,
    coin: 140,
    fame: 9,
    habitat: 'ocean',
    minSizeCm: 150,
    maxSizeCm: 330,
    description:
      'Tròn xoe phẳng lì như cái thớt khổng lồ, thích nằm ngửa tắm nắng với gương mặt ngơ ngác hoàn toàn.',
  },
  {
    id: 'cyber_koi',
    name: 'Cá Chép Cyberpunk 2077',
    rarity: 'epic',
    weight: 4,
    coin: 150,
    fame: 10,
    habitat: 'mythic',
    minSizeCm: 30,
    maxSizeCm: 76,
    description: 'Được nâng cấp bằng bo mạch bán dẫn phát quang neon và bộ vi xử lý lượng tử siêu tốc.',
  },
  {
    id: 'phoenix_tetra',
    name: 'Cá Neon Hỏa Phụng',
    rarity: 'epic',
    weight: 4,
    coin: 145,
    fame: 9,
    habitat: 'mythic',
    minSizeCm: 12,
    maxSizeCm: 28,
    description: 'Thân hình rực lửa bơi lội dưới lòng nước sâu thẳm mà bộ vảy vẫn bốc cháy kiêu hãnh.',
  },
  {
    id: 'ghost_shark',
    name: 'Cá Mập Ma Dạ Quang',
    rarity: 'epic',
    weight: 4,
    coin: 160,
    fame: 10,
    habitat: 'mythic',
    minSizeCm: 150,
    maxSizeCm: 320,
    description:
      'Thân hình bán trong suốt phát ra ánh sáng huỳnh quang mờ ảo trong những đêm sương mù giăng kín.',
  },
  {
    id: 'beluga_whale',
    name: 'Cá Voi Trắng Mỉm Cười',
    rarity: 'epic',
    weight: 4,
    coin: 170,
    fame: 11,
    habitat: 'ocean',
    minSizeCm: 300,
    maxSizeCm: 530,
    description:
      'Làn da trắng muốt mịn màng như kem tươi, luôn giữ nụ cười hồn nhiên ấm áp kể cả khi cắn câu.',
  },
  {
    id: 'narwhal',
    name: 'Cá Kỳ Lân Bắt Sóng Wi-Fi',
    rarity: 'epic',
    weight: 4,
    coin: 180,
    fame: 12,
    habitat: 'ocean',
    minSizeCm: 380,
    maxSizeCm: 550,
    description:
      'Chiếc sừng xoắn độc nhất vô nhị vươn cao, được đồn đại là dùng để bắt trộm sóng Wi-Fi từ các du thuyền.',
  },

  // --- LEGENDARY (11 loài huyền thoại đỉnh cao) ---
  {
    id: 'killer_whale',
    name: 'Cá Voi Sát Thủ Trầm Tính',
    rarity: 'legendary',
    weight: 2,
    coin: 280,
    fame: 16,
    habitat: 'ocean',
    minSizeCm: 500,
    maxSizeCm: 900,
    description:
      'Bộ tuxedo đen trắng cực bảnh bao, săn mồi đỉnh cao nhưng tâm hồn lại là người hướng nội thích yên tĩnh.',
  },
  {
    id: 'humpback_whale',
    name: 'Cá Voi Lưng Gù Hát Rong',
    rarity: 'legendary',
    weight: 2,
    coin: 320,
    fame: 18,
    habitat: 'ocean',
    minSizeCm: 1100,
    maxSizeCm: 1680,
    description:
      'Nghệ sĩ đại ngàn của biển cả, tiếng hát vang vọng hàng ngàn dặm làm rung chuyển toàn bộ đáy biển.',
  },
  {
    id: 'blue_whale',
    name: 'Cá Voi Thở Oxy',
    rarity: 'legendary',
    weight: 1,
    coin: 450,
    fame: 25,
    habitat: 'ocean',
    minSizeCm: 1600,
    maxSizeCm: 3200,
    description: 'Sinh vật to lớn nhất hành tinh, mỗi lần ngoi lên phun cột nước cao chạm tới những đám mây.',
  },
  {
    id: 'great_white_shark',
    name: 'Cá Mập Ăn Chay',
    rarity: 'legendary',
    weight: 2,
    coin: 290,
    fame: 17,
    habitat: 'ocean',
    minSizeCm: 350,
    maxSizeCm: 630,
    description:
      'Trang bị hàng trăm chiếc răng sắc nhọn gối đầu nhau, nhưng ước mơ từ bé là mở chuỗi buffet salad tảo biển.',
  },
  {
    id: 'manta_ray',
    name: 'Cá Đuối Tấm Thảm Bay',
    rarity: 'legendary',
    weight: 2,
    coin: 270,
    fame: 15,
    habitat: 'ocean',
    minSizeCm: 200,
    maxSizeCm: 490,
    description:
      'Sải cánh rộng lớn lướt nhẹ nhàng như thảm thần trong truyện cổ tích Ả Rập giữa làn nước xanh biếc.',
  },
  {
    id: 'giant_squid',
    name: 'Mực Khổng Lồ Chấm Sa Tế',
    rarity: 'legendary',
    weight: 2,
    coin: 340,
    fame: 19,
    habitat: 'ocean',
    minSizeCm: 450,
    maxSizeCm: 980,
    description:
      'Mười cái xúc tu dài ngoằng với hàng trăm giác hút, là hung thần chuyên giật đứt dây cước của dân làng.',
  },
  {
    id: 'crypto_whale',
    name: 'Cá Voi Tiền Ảo HODL',
    rarity: 'legendary',
    weight: 1,
    coin: 500,
    fame: 30,
    habitat: 'mythic',
    minSizeCm: 1200,
    maxSizeCm: 2950,
    description:
      'Mỗi lần nó vẫy đuôi là toàn bộ biểu đồ nến thị trường tài chính đỏ rực hoặc xanh ngắt chọc trời.',
  },
  {
    id: 'abyssal_kraken',
    name: 'Bạch Tuộc Vực Thẳm Cực Đại',
    rarity: 'legendary',
    weight: 1,
    coin: 480,
    fame: 28,
    habitat: 'mythic',
    minSizeCm: 900,
    maxSizeCm: 1950,
    description:
      'Chúa tể ngủ say hàng vạn năm dưới rãnh vực Mariana, thức giấc chỉ vì ngửi thấy mùi giun đất hấp dẫn.',
  },
  {
    id: 'golden_dragon_fish',
    name: 'Thần Long Hoàng Kim',
    rarity: 'legendary',
    weight: 1,
    coin: 520,
    fame: 32,
    habitat: 'mythic',
    minSizeCm: 700,
    maxSizeCm: 1650,
    description:
      'Cá thần mang dáng dấp long thần viễn cổ, tương truyền ai bắt được sẽ nhận phúc lộc vô biên suốt đời.',
  },
  {
    id: 'rubber_duck_leviathan',
    name: 'Đại Thần Vịt Cao Su',
    rarity: 'legendary',
    weight: 1,
    coin: 550,
    fame: 35,
    habitat: 'mythic',
    minSizeCm: 1000,
    maxSizeCm: 2650,
    description:
      'Chú vịt vàng khổng lồ siêu thực trôi dạt từ một vũ trụ song song tới, tỏa ánh hào quang linh thiêng tuyệt đối.',
  },
  {
    id: 'landlord_pike',
    name: 'Cá Măng Địa Chủ',
    rarity: 'legendary',
    weight: 1,
    coin: 300,
    fame: 20,
    habitat: 'mythic',
    minSizeCm: 80,
    maxSizeCm: 165,
    description:
      'Đội mũ phớt chóp cao sang chảnh, mỗi lần cắn câu là bắt đầu càm ràm đòi tăng tiền thuê mặt nước.',
  },
];

// Higher-tier variants are separate journal entries with their own art and reward weights.
FISH.push(
  {
    id: 'office_carp_ceo',
    name: 'Cá Chép Tổng Tài Bất Ổn',
    rarity: 'defiant',
    variantOf: 'office_carp',
    weight: 0.28,
    coin: 440,
    fame: 27,
    habitat: 'freshwater',
    minSizeCm: 65,
    maxSizeCm: 140,
    description:
      'Đeo cà vạt quá khổ, kẹp cặp táp và đội vương miện lệch. Vừa cắn câu vừa hứa tăng lương bằng rong biển.',
  },
  {
    id: 'pufferfish_gym',
    name: 'Cá Nóc Lực Sĩ Bỏ Ngày Chân',
    rarity: 'defiant',
    variantOf: 'pufferfish',
    weight: 0.28,
    coin: 460,
    fame: 28,
    habitat: 'ocean',
    minSizeCm: 55,
    maxSizeCm: 115,
    description:
      'Thân tròn như bóng, vây ngực cuồn cuộn ôm tạ san hô. Tập ngực cả đời nhưng quên mất mình không có chân.',
  },
  {
    id: 'catfish_noodle',
    name: 'Cá Trê Đại Sư Mì Úp',
    rarity: 'defiant',
    variantOf: 'catfish_giant',
    weight: 0.24,
    coin: 480,
    fame: 29,
    habitat: 'freshwater',
    minSizeCm: 90,
    maxSizeCm: 210,
    description: 'Đội bát mì như nón, râu uốn thành đôi đũa. Tuyên bố tu luyện ba phút là thành chính quả.',
  },
  {
    id: 'disco_trout_diva',
    name: 'Cá Hồi Diva Lệch Nhịp',
    rarity: 'defiant',
    variantOf: 'disco_trout',
    weight: 0.24,
    coin: 500,
    fame: 30,
    habitat: 'mythic',
    minSizeCm: 65,
    maxSizeCm: 155,
    description:
      'Tóc xoăn bồng bềnh, kính sao và micro vỏ sò. Hát lệch nhịp đến mức cả đàn phải bơi ngược để theo kịp.',
  },
  {
    id: 'swordfish_void',
    name: 'Cá Kiếm Hư Không Đế Quân',
    rarity: 'sovereign',
    variantOf: 'swordfish',
    weight: 0.065,
    coin: 720,
    fame: 42,
    habitat: 'ocean',
    minSizeCm: 240,
    maxSizeCm: 520,
    description:
      'Mũi kiếm obsidian xẻ rách màn nước, vây phủ tinh vân tím. Những mảnh không gian lặng lẽ quay quanh thân như hộ vệ.',
  },
  {
    id: 'golden_dragon_astral',
    name: 'Thần Long Tinh Hà Chí Tôn',
    rarity: 'sovereign',
    variantOf: 'golden_dragon_fish',
    weight: 0.055,
    coin: 800,
    fame: 48,
    habitat: 'mythic',
    minSizeCm: 300,
    maxSizeCm: 720,
    description:
      'Vảy vàng bạch kim ôm một lõi sao xanh, sừng pha lê và dải vây ngân hà. Mỗi vòng lượn vẽ một quỹ đạo tinh tú.',
  },
  {
    id: 'koi_storm',
    name: 'Cá Koi Lôi Đình Thiên Đế',
    rarity: 'sovereign',
    variantOf: 'cyber_koi',
    weight: 0.07,
    coin: 740,
    fame: 44,
    habitat: 'freshwater',
    minSizeCm: 110,
    maxSizeCm: 270,
    description:
      'Giáp vảy lam bạc khắc đường sét, vây dài như chiến kỳ. Hai vòng lôi ấn bao quanh thân mà chẳng làm cháy một cọng rong.',
  },
  {
    id: 'kraken_eclipse',
    name: 'Kraken Nhật Thực Bá Chủ',
    rarity: 'sovereign',
    variantOf: 'abyssal_kraken',
    weight: 0.045,
    coin: 840,
    fame: 50,
    habitat: 'mythic',
    minSizeCm: 550,
    maxSizeCm: 1400,
    description:
      'Áo giáp hắc ngọc, giác hút đỏ rực và vành nhật thực đồng đỏ. Xúc tu cuộn thành một ngai vàng giữa biển sâu.',
  },
);

/**
 * Calculates randomized catch size and weight for a fish species.
 * Size directly affects the visual pixel scale rendered in the celebration UI!
 */
export function calculateFishSize(
  rng: () => number,
  fish: FishSpecies,
): {
  sizeCm: number;
  weightKg: number;
  sizeCategory: 'small' | 'standard' | 'large' | 'giant';
} {
  const min = fish.minSizeCm;
  const max = fish.maxSizeCm;
  // Quasi-normal distribution centered around 0.5 with slight variance
  const roll = (rng() + rng() + rng()) / 3;
  const sizeCm = Math.round((min + roll * (max - min)) * 10) / 10;
  const ratio = (sizeCm - min) / Math.max(1, max - min);

  let sizeCategory: 'small' | 'standard' | 'large' | 'giant' = 'standard';
  if (ratio < 0.25) sizeCategory = 'small';
  else if (ratio > 0.85) sizeCategory = 'giant';
  else if (ratio > 0.6) sizeCategory = 'large';

  // Realistic weight estimation based on length
  const baseKg = Math.max(0.05, Math.pow(sizeCm, 2.7) / 28000);
  const weightKg = Math.round(baseKg * (0.88 + rng() * 0.25) * 10) / 10;

  return { sizeCm, weightKg, sizeCategory };
}

export type FishShadowTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ShadowTierInfo {
  tier: FishShadowTier;
  label: string;
  name: string;
  lengthPx: number;
  widthPx: number;
  swimSpeed: number;
  wiggleSpeed: number;
  hasCrown?: boolean;
  hasGlow?: boolean;
  color: string;
}

export const SHADOW_TIER_CONFIG: Record<FishShadowTier, ShadowTierInfo> = {
  1: {
    tier: 1,
    name: 'Bé xíu',
    label: 'Bóng 1 (Cực nhỏ)',
    lengthPx: 26,
    widthPx: 9,
    swimSpeed: 1.35,
    wiggleSpeed: 1.6,
    color: '#1e3a5f',
  },
  2: {
    tier: 2,
    name: 'Nhỏ',
    label: 'Bóng 2 (Nhỏ)',
    lengthPx: 40,
    widthPx: 13,
    swimSpeed: 1.15,
    wiggleSpeed: 1.3,
    color: '#1b3454',
  },
  3: {
    tier: 3,
    name: 'Trung bình',
    label: 'Bóng 3 (Vừa)',
    lengthPx: 58,
    widthPx: 19,
    swimSpeed: 1.0,
    wiggleSpeed: 1.0,
    color: '#162b46',
  },
  4: {
    tier: 4,
    name: 'Lớn',
    label: 'Bóng 4 (Lớn)',
    lengthPx: 84,
    widthPx: 26,
    swimSpeed: 0.85,
    wiggleSpeed: 0.85,
    color: '#122238',
  },
  5: {
    tier: 5,
    name: 'Khổng lồ',
    label: 'Bóng 5 (Khổng lồ)',
    lengthPx: 118,
    widthPx: 36,
    swimSpeed: 0.72,
    wiggleSpeed: 0.7,
    color: '#0e1b2d',
  },
  6: {
    tier: 6,
    name: 'Thần thoại Vương miện',
    label: 'Bóng 6 (Vương miện / Leviathan)',
    lengthPx: 165,
    widthPx: 50,
    swimSpeed: 0.58,
    wiggleSpeed: 0.6,
    hasCrown: true,
    hasGlow: true,
    color: '#0a1422',
  },
};

export function getFishShadowTier(sizeCm: number, rarity?: string, habitat?: string): FishShadowTier {
  if (
    habitat === 'mythic' ||
    rarity === 'defiant' ||
    rarity === 'sovereign' ||
    (rarity === 'legendary' && sizeCm >= 600)
  ) {
    return 6;
  }
  if (sizeCm < 25) return 1;
  if (sizeCm < 60) return 2;
  if (sizeCm < 150) return 3;
  if (sizeCm < 400) return 4;
  if (sizeCm < 900) return 5;
  return 6;
}

export const CAFE_INGREDIENTS = [
  { id: 'espresso', label: 'Cà phê Espresso' },
  { id: 'milk', label: 'Sữa tươi đánh nóng' },
  { id: 'foam', label: 'Lớp bọt sữa' },
  { id: 'caramel', label: 'Sốt Caramel' },
  { id: 'ice', label: 'Đá viên' },
  { id: 'oat', label: 'Sữa yến mạch' },
  { id: 'cinnamon', label: 'Bột quế' },
  { id: 'regret', label: 'Một chút tiếc nuối' },
] as const;
export type CafeIngredient = (typeof CAFE_INGREDIENTS)[number]['id'];

export const CAFE_CUSTOMERS = [
  'Chú ngỗng mặc áo măng tô',
  'Chủ nhà trọ (lại đến nữa rồi)',
  'Một pháp sư kiệt sức',
  'Khách nói "không vội" nhưng giục liên tục',
  'Một chú mèo bằng cách nào đó biết trả tiền',
  'Ngài thị trưởng (chưa xác thực)',
];

export const DELIVERY_PACKAGES = [
  'Một chiếc hộp ấm bất thường',
  'Bốn mươi chú vịt cao su',
  'Một chiếc tất cực kỳ quan trọng',
  'Chiếc đèn phát ra tiếng vo ve',
  'Bát súp bí ẩn',
  'Một bức thư xin lỗi',
  'Thùng cà phê & nước tăng lực thức đêm VietProDev',
  'Bàn phím cơ switch xanh dự phòng',
  'Tập đề án tốt nghiệp & tài liệu NCKH sinh viên DNTU',
  'Hộp bằng cử nhân & nón tốt nghiệp danh giá DNTU',
  'Hộp cơm gà xối mỡ đùi góc tư da giòn Biên Hòa nóng hổi',
  'Thùng nước ngọt Sting dâu & combo mì xào cho Cyber Game HNT',
];

/** Default admin-tunable activity configuration. Stored in the activities table. */
export const DEFAULT_ACTIVITY_CONFIG = {
  fishing: {
    biteMinMs: 2500,
    biteMaxMs: 7000,
    reactionWindowMs: 1400,
    runTtlMs: 60000,
    dailySoftCap: 40,
    overCapMultiplier: 0.25,
  },
  delivery: {
    baseCoin: 45,
    fame: 3,
    msPerTile: 650,
    minTimeMs: 20000,
    maxBonusCoin: 30,
    dailySoftCap: 30,
    overCapMultiplier: 0.25,
  },
  cafe: {
    steps: 4,
    timeLimitMs: 25000,
    baseCoin: 30,
    fame: 2,
    maxBonusCoin: 20,
    dailySoftCap: 40,
    overCapMultiplier: 0.25,
  },
  event_duck: {
    coinPerPoint: 25,
    placementCoin: [150, 90, 60],
    participationCoin: 20,
    fame: 5,
    placementFame: [20, 12, 8],
  },
} as const;

export type ActivityConfigMap = {
  fishing: {
    biteMinMs: number;
    biteMaxMs: number;
    reactionWindowMs: number;
    runTtlMs: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  delivery: {
    baseCoin: number;
    fame: number;
    msPerTile: number;
    minTimeMs: number;
    maxBonusCoin: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  cafe: {
    steps: number;
    timeLimitMs: number;
    baseCoin: number;
    fame: number;
    maxBonusCoin: number;
    dailySoftCap: number;
    overCapMultiplier: number;
  };
  event_duck: {
    coinPerPoint: number;
    placementCoin: number[];
    participationCoin: number;
    fame: number;
    placementFame: number[];
  };
};
