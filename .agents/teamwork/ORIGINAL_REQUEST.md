# Original User Request

## 2026-10-02T03:41:30Z

Triển khai toàn diện Hệ Thống Trang Trại Cá Nhân (Cozy Farm System) cho Cozy Compute Social MMO theo hồ sơ thiết kế kỹ thuật docs/farm_system_plan.pdf. Dự án bao gồm đồ họa Pure Canvas 2D theo phong cách đồng quê Nam Bộ, cổng chuyển map Tây thị trấn vào FarmScene, phân quyền phòng Colyseus FarmRoom bằng mật khẩu, PostgreSQL schema migrations, Server-Authoritative REST API cho vòng tuần hoàn kinh tế nông sản (trồng trọt, chuồng trại, kho Silo, tiệm Bác Sáu, ao nuôi cá), và các HUD panel tương tác trong game.

Working directory: C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute
Integrity mode: development

## Reference Materials
- Hồ sơ đặc tả và lộ trình thiết kế: docs/farm_system_plan.pdf
- Quy tắc phát triển dự án: AGENTS.md (Server-Authoritative, Zero-Dead-Ends, Phím tắt Accessibility WASD/E/Q/Enter/Esc, Bảo mật thông tin xác thực, Quality Gate)

## Requirements

### R1. Bản Đồ Nông Trại & Đồ Họa Nông Thôn 2.5D Pure Canvas (Pixel Art & Scene)
- Mở rộng mép trái bản đồ Thị Trấn (Town Scene), bổ sung Cổng Chào Nông Trại mộc mạc và biển chỉ dẫn đường sang Trang Trại với trigger chuyển cảnh mượt mà.
- Thiết kế module đồ họa Pure Canvas 2D (scanline rasterization, pixel snap, không dùng ảnh ngoài) tái hiện không gian đồng quê Nam Bộ:
  + Các trạng thái mẫu đất (ô đất hoang có cỏ dại/khóa giá tiền, đất tơi xốp, đất khô luống sáng, đất ướt đậm màu, các nấc lớn của mầm cây và hoa trái chín lấp lánh).
  + Cụm chuồng trại riêng biệt: chuồng gà mái lá/ổ rơm, chuồng bò cột gỗ máng cỏ, chuồng heo bãi sình ẩm ướt, chuồng dê bục leo dốc. Hoạt ảnh động cơ bản 2 khung hình chân thực.
  + Tiệm nông nghiệp Bác Sáu sạp gỗ ven đường râm mát và NPC Bác Sáu đội nón lá khăn rằn.
  + Nhà kho Silo ngói âm dương có bao tải thóc, thùng gỗ và bù nhìn rơm nón lá.
  + Ao cá thủy sản viền đá có cầu khỉ, chòi lá dừa và guồng nước quay sủi bọt trắng.
- Dựng Phaser Scene FarmScene tích hợp đầy đủ hệ thống vật cản (collision blockers), camera clamping, âm thanh môi trường đồng quê và điểm tương tác phím E.

### R2. Phòng Riêng Tư & Bảo Mật Mật Khẩu Nông Trại (Colyseus FarmRoom & Access Control)
- Xây dựng phòng Colyseus FarmRoom instance hóa theo ID chủ trang trại (farm:${ownerId}).
- Kiểm soát phân quyền onAuth: Chủ nhà ra vào tự do không cần mật khẩu; khách viếng thăm bắt buộc phải xác thực qua session token mật khẩu hợp lệ.
- UI Modal nhập mật khẩu FarmPasswordModal giao diện gỗ tự nhiên, hỗ trợ bàn phím, bàn phím số ảo và phím Esc để hủy.
- Cơ chế Co-op: Khách được phép ngắm cảnh, trò chuyện và tưới nước giúp cây trồng (nhận tim thân thiện); nghiêm cấm khách tự ý thu hoạch nông sản của chủ trại nếu chưa được bật quyền cho phép.

### R3. Hệ Thống Dữ Liệu PostgreSQL & Server-Authoritative API (Economy & Gameplay Logic)
- Tạo migration PostgreSQL chuẩn hóa cho các bảng: farms, farm_plots, farm_animals, farm_warehouse_items, farm_pond_fishes.
- Hiện thực toàn bộ REST API Server-Authoritative tại apps/api/src/routes/farm.ts:
  + GET /api/farm/me: Lấy thông tin nông trại của người chơi.
  + PUT /api/farm/settings: Đổi mật khẩu trang trại, cấu hình chế độ riêng tư/công khai.
  + POST /api/farm/auth: Xác thực mật khẩu khi muốn ghé thăm nông trại người khác.
  + POST /api/farm/plots/unlock: Mở khóa mẫu đất bằng Coin (trừ tiền server-side kèm idempotency key chống double-charge).
  + POST /api/farm/plots/plant, POST /api/farm/plots/water, POST /api/farm/plots/harvest: Quản lý chu trình canh tác cây trồng với thời gian thực tính toán hoàn toàn phía server.
  + POST /api/farm/shop/buy, POST /api/farm/shop/sell: Mua hạt giống/con giống/phân bón và bán sỉ nông sản hoặc hoàn thành "Hợp Đồng Đơn Đặt Hàng Hôm Nay".
  + POST /api/farm/animals/feed, POST /api/farm/pond/stock: Quản lý chăn nuôi gia súc/gia cầm và thả nuôi/tăng trọng thủy sản ao nhà.
- Tuyệt đối không tin tưởng bất kỳ giá trị client gửi lên về số dư Coin, trạng thái ô đất hoặc thời gian sinh trưởng.

### R4. Giao Diện Điều Khiển Nông Nghiệp Trong Game (Farm HUD & Interaction Panels)
- Tích hợp các panel giao diện đồng bộ với phong cách cozy của game:
  + Panel Chi Tiết Ô Đất / Canh Tác (hiển thị trạng thái tưới, thời gian trưởng thành, nút chăm sóc).
  + Panel Nhà Kho Silo (dung lượng khởi đầu 100 ngăn, hỗ trợ nâng cấp dung lượng bằng Coin, phân tab thông minh cho nông sản/vật nuôi/hạt giống/vật tư, tách bạch độc lập với Backpack cá nhân).
  + Panel Tiệm Nông Nghiệp Bác Sáu (gian hàng buôn bán và hợp đồng thu mua nông sản hôm nay có thưởng kinh nghiệm).
- Tuân thủ nguyên tắc Zero-Dead-Ends: mọi nút bấm, thao tác mua bán, thu hoạch đều hoạt động hoàn chỉnh và có thông báo phản hồi rõ ràng.

## Acceptance Criteria

### Security & Room Verification
- [ ] Chủ trang trại truy cập thẳng vào FarmRoom mà không bị yêu cầu nhập mật khẩu.
- [ ] Người chơi khác không có mật khẩu đúng sẽ bị từ chối truy cập và nhận thông báo lỗi tại cổng.
- [ ] Khách chỉ có thể thực hiện hành động hỗ trợ tưới nước hợp lệ; API và Colyseus room từ chối mọi yêu cầu thu hoạch hoặc can thiệp trái phép tài sản của chủ trại.

### Economy & State Integrity
- [ ] Thao tác mở khóa ô đất và mua vật tư khấu trừ Coin chính xác trên server với idempotency key, không bị trùng lặp giao dịch khi nhấn nhiều lần liên tiếp.
- [ ] Chu kỳ sinh trưởng cây trồng (Hạt non → Cây con → Trái chín), thời gian giữ ẩm của đất tưới và tăng trọng cá ao được tính toán xác thực theo timestamp của server.
- [ ] Nhà kho nông trại Silo lưu trữ đúng các tab phân loại, độc lập với túi đồ Backpack, và cho phép nâng cấp dung lượng hợp lệ bằng Coin.

### Visual & Scene Verification
- [ ] Di chuyển đến mép đường Tây thị trấn kích hoạt chuyển cảnh sang FarmScene mượt mà, định vị người chơi đúng tại cổng vào trang trại.
- [ ] Toàn bộ asset cảnh vật nông trại, chuồng trại 4 loại thú, sạp Bác Sáu, nhà kho và ao sen được render bằng Pure Canvas 2D không bị vỡ bố cục hay thiếu tài nguyên.

### Quality Gate
- [ ] pnpm typecheck vượt qua 100% không có bất kỳ lỗi TypeScript nào trên toàn bộ workspace.
- [ ] pnpm lint vượt qua không có lỗi code style/syntax.
- [ ] Bổ sung test suites đầy đủ cho các endpoint API nông trại và logic phân quyền FarmRoom.
- [ ] Mã nguồn được format chuẩn theo quy chuẩn của dự án.
