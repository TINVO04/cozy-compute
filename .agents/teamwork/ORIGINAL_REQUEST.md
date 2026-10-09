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

## 2026-10-08T12:29:53Z

# Teamwork Project Prompt — Final

> Status: Launched
> Goal: Multi-agent execution of the vehicle asset pack and integration
> Requested team: Full team (parallel agents for asset generation, loader integration, and visual verification)

Xây dựng và tích hợp trọn bộ asset đồ họa pixel-art đạt chuẩn cho toàn bộ 16 mẫu xe cộ trong thư mục `assets/vehicles/` của Cozy Compute Social MMO, đảm bảo đủ hoạt ảnh 4 hướng (idle và 3 frame driving), tích hợp bộ nạp asset động và cơ chế leo lên xe (mounting) chính xác 100% không lỗi hình học hay lệch tâm nhân vật.

Working directory: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute`
Integrity mode: development

## Requirements

### R1. Bộ nạp Asset Động & Tương thích ngược (Vehicle Asset Loader)
- Xây dựng module nạp asset hình ảnh từ `assets/vehicles/` (hoặc `apps/web/public/vehicles/`).
- Tự động fallback về procedural canvas nếu asset chưa nạp xong, đảm bảo zero-downtime, không bị crash hay màn hình trắng.
- Giữ nguyên vẹn tính tương thích với các hàm hiện có: `vehicleCanvas()`, `ensureVehicleTexture()`, và hệ thống đăng ký texture Phaser 3.

### R2. Bộ Asset Đồ Họa & Hoạt Ảnh Toàn Diện Cho 16 Mẫu Xe
- Tạo đầy đủ tài nguyên cho tất cả 16 xe theo cấu trúc thư mục chuẩn:
  - **Xe đạp (1 mẫu)**: `bicycles/trek-marlin-7`
  - **Xe máy (7 mẫu)**: `motorcycles/vespa-primavera-150`, `motorcycles/ducati-panigale-v4`, `motorcycles/honda-super-cub`, `motorcycles/harley-davidson-fat-boy`, `motorcycles/kawasaki-ninja-h2`, `motorcycles/yamaha-yzf-r1`, `motorcycles/bmw-r1250-gs`
  - **Ô tô (8 mẫu)**: `cars/mercedes-benz-g63`, `cars/lamborghini-aventador`, `cars/porsche-911`, `cars/toyota-supra-mk4`, `cars/ferrari-f40`, `cars/ford-mustang`, `cars/rolls-royce-phantom`, `cars/tesla-model-s` (cùng mapping tương thích cho `car_sunset` và `car_mercedes`).
- Mỗi thư mục xe gồm: `spritesheet.png`, `preview.png`, `icon.png`, và `meta.json`.
- Kích thước frame chuẩn `48 × 40 px`, tấm sprite tổng `192 × 160 px` (4 hướng [Down, Left, Right, Up] × 4 frames [Idle, Drive 1, Drive 2, Drive 3]).
- Điểm tiếp đất bánh xe tại `y = 37 px`, chiều rộng thân xe ≤ 40 px để nằm trọn trong lòng đường `40 px` (`TOWN_ROADS`) không kích hoạt phạt tiền `off_road`.

### R3. Cơ Chế Leo Lên Xe Hoàn Hảo Không Lỗi (Mounting & Visual Geometry)
- **Xe 2 bánh**: Vị trí yên xe (seat) đón đúng trọng tâm hông nhân vật (`x = 24, y = 16..20`). Khớp hoàn hảo với cơ chế crop chân `(0, 0, 32, 40)` và vị trí gác chân/bàn đạp.
- **Xe 4 bánh**: Kính cabin phản quang có độ sâu; khi nhân vật lên xe (`V`), avatar ẩn mượt mà; bóng tiếp xúc mặt đường (contact shadow) đầm chắc.
- **Chiếu sáng (`VehicleLights`)**: Chóa đèn pha trước và đèn hậu sau khớp chuẩn xác với tọa độ raytracing/shader (`dx * 20, dy * 18` và `-dx * 18, -dy * 18`).

### R4. Tích hợp Showroom & Cửa Hàng (Showroom & Shop UI Integration)
- Hiển thị góc nghiêng/profile sắc nét tại bục Showroom (`136 × 66 px`, scale 2x) và popup `VehicleShopPanel` (scale 3x với tính năng xoay 4 hướng).
- Tích hợp icon hiển thị trong túi đồ và danh mục hàng hóa `item_definitions`.

## Verification Resources
- Test suites hiện có: `packages/game-data/src/vehicles.test.ts`, `apps/web/src/game/showroom.test.ts`.
- Scripts kiểm tra trực quan Playwright: `output/vehicle-preview.mjs`, `output/vehicle-ui-check.mjs`.

## Acceptance Criteria

### Technical & Quality Gate
- [ ] Chạy `pnpm --filter @cozy/game-data test` và `pnpm --filter @cozy/web test` vượt qua 100%.
- [ ] `pnpm typecheck` và `pnpm lint` không có lỗi.
- [ ] Toàn bộ 16 mẫu xe đều có đủ 4 file (`spritesheet.png`, `preview.png`, `icon.png`, và `meta.json`) đúng chuẩn lưới 4x4 (192 × 160 px).

### Visual & Gameplay Verification
- [ ] Nhân vật khi nhấn `V` leo lên xe đạp/xe máy không bị thụt thân, không bị lệch yên, chân không bị lòi qua lốc máy hay bàn đạp.
- [ ] Lái xe trên đường không bị phạt nhầm `off_road` ở tốc độ tối đa.
- [ ] Đèn pha ban đêm rọi ra đúng chùm từ đầu xe, đèn đỏ hậu phát sáng đúng đuôi xe.
- [ ] Xem xe trong Showroom và xoay góc trong Shop UI mượt mà, sắc nét (pixel-perfect nearest filtering).


## 2026-10-08T14:57:19Z

# Teamwork Project Prompt — Master Vehicle Art Direction & Showroom Upgrade

Triển khai toàn diện MASTER_VEHICLE_ART_DIRECTION_PLAN.docx: Sửa lỗi xe đi qua trái bị ngược, nâng cấp đồ họa toàn bộ 16 phương tiện đạt chuẩn WOW 2.5D Pixel Art có chiều sâu vượt bậc, và mở rộng Showroom Gara Bạc Hà để trưng bày, trải nghiệm và mua sắm toàn bộ 16 mẫu xe trong assets.

Working directory: c:\Users\Bao\OneDrive\Máy tính\game\cozy-compute
Integrity mode: development

## Requirements

### R1. Sửa triệt để lỗi xe đi qua trái bị ngược (Transform Matrix Leakage)
- Trong `apps/web/src/art/vehicle.ts`, cô lập ma trận biến đổi bằng `ctx.save()` và `ctx.restore()` khi vẽ hướng trái (`dir === 1`), đảm bảo không rò rỉ `scaleX = -1` ra context của canvas.
- Trong `apps/web/src/art/vehicle-loader.ts` hàm `blitFrame`, gọi tường minh `ctx.setTransform(1, 0, 0, 1, 0, 0)` và `ctx.resetTransform?.()` trước khi xóa và vẽ frame ảnh từ spritesheet để ngăn ngừa hiện tượng lật ngược 2 lần.
- Đảm bảo xe và nhân vật lái (cả 2 bánh lẫn ô tô) khi bấm `A` di chuyển sang trái (`dir = 1`) đều hướng mũi xe, đèn pha và mắt nhìn thẳng sang trái, không bị giật lùi hay lật ngược.

### R2. Nâng cấp đồ họa toàn bộ 16 mẫu xe theo chuẩn WOW Pixel Art 2.5D
- Nâng cấp bộ generator master `scripts/generate_vehicles.py` tuân thủ nghiêm ngặt 8 lớp chất lượng trong master plan (Silhouette, Proportion, Structure, Material, Lighting, Micro-detail, Signature, Pixel cleanup):
  - **Vật liệu & Chiều sâu 4 tầng màu**: Đáy gầm tối sâu, màu thân xe mid-tone, vạch dập nổi phản quang, vệt bóng sáng gắt (sharp specular).
  - **Kính 2.5D phản quang**: Kính tối trong suốt + dải phản chiếu nghiêng 45° + bóng đổ mui xe.
  - **Mâm xe & Lốp cao su**: Lốp bo tròn có rãnh vân, hốc bánh xe tối sâu tạo độ nổi 3D, đĩa phanh kim loại đục lỗ cùng cùm phanh Brembo đỏ/vàng, chấu mâm hợp kim/đĩa đúc.
  - **Chi tiết nhận diện (Signature pass)** cho đủ 16 xe:
    - *Ferrari F40*: Cánh gió hộp vuông nguyên khối, nắp máy kính rãnh Lexan, hốc NACA nắp capo, 3 ống xả tròn giữa.
    - *Lamborghini Aventador SVJ*: Dáng nêm siêu thấp, cánh gió ALA carbon, hốc hút gió sườn lớn, đèn LED chữ Y.
    - *Porsche 911 GT3 RS*: Cánh gió cao cổ thiên nga, hông nở rộng, mang cá tản nhiệt vè trước, dải LED đuôi.
    - *Toyota Supra MK4*: Cánh gió cong cao vút, 4 vòng đèn tròn LED mỗi bên, body tròn cơ bắp, pô đại.
    - *Mercedes G63 AMG*: Body vuông cơ bắp, lưới tản nhiệt Panamericana, bánh sơ-cua bọc inox, xi-nhan vè trước, pô kép hông xe.
    - *Rolls-Royce Phantom VIII*: Grille đền Pantheon mạ crôm, tượng Spirit of Ecstasy, cửa mở ngược suicide doors, mâm logo RR đứng yên.
    - *Ford Mustang Shelby GT500*: Sọc đua Le Mans kép chạy dài mũi đến đuôi, hốc gió lồi cơ bắp trên nắp máy, lưới tản nhiệt Cobra.
    - *Tesla Model S Plaid*: Nóc kính panorama toàn cảnh trong suốt vuốt dài, tay nắm cửa phẳng chìm, đuôi gió carbon, mâm turbine.
    - *Ducati Panigale V4 S*: Cánh gió carbon, phuộc Öhlins vàng, gắp đơn sau lộ mâm, sắc đỏ Rosso Corsa.
    - *Kawasaki Ninja H2*: Khung mắt cáo xanh lá Lime Green, đầu xe ram-air sắc nhọn khí động học.
    - *Yamaha YZF-R1*: Đèn projector đôi, hốc gió mũi xe, màu Icon Blue.
    - *BMW R1250 GS Adventure*: Đầu mỏ vịt, 2 đầu xi-lanh Boxer chìa sang bên, khung chống đổ và thùng nhôm phượt.
    - *Vespa Primavera 150*: Thân ong bo tròn mềm mại, viền crôm, yếm cong và yên da nâu/kem thanh lịch.
    - *Honda Super Cub C125*: Yếm trắng uốn cong kinh điển, gác baga inox, đèn tròn retro.
    - *Harley-Davidson Fat Boy*: Mâm nhôm đúc đặc Lakester, pô kép vát xéo shotgun, bình xăng giọt nước, đèn pha to bản.
    - *Trek Marlin 7*: Khung nhôm Alpha Silver cong thể thao, căm nan hoa xoay khi đạp, đĩa líp nhiều tầng, phuộc dầu RockShox vàng.
  - **Đủ 4 hướng (Down, Left, Right, Up)** và **4 frame chuyển động/hướng** (quay bánh xe, nhấp nhô giảm xóc ±0.5px, vệt phản quang lướt).

### R3. Nâng cấp Showroom Gara Bạc Hà tận dụng toàn bộ 16 mẫu xe
- Cấu trúc lại 4 bục trưng bày trong Showroom tương ứng 4 phân khúc chuyên biệt:
  - Bục 1 (Tây Bắc - Supercars): Ferrari F40, Lamborghini Aventador, Porsche 911 GT3 RS, Toyota Supra MK4.
  - Bục 2 (Đông Bắc - Luxury & Muscle): Rolls-Royce Phantom, Mercedes G63 AMG, Ford Mustang Shelby, Tesla Model S Plaid.
  - Bục 3 (Tây Nam - Sport Superbikes): Ducati Panigale, Kawasaki Ninja H2, Yamaha YZF-R1, BMW R1250 GS.
  - Bục 4 (Đông Nam - Cruiser, Heritage & Bicycle): Vespa Primavera, Honda Super Cub, Harley Fat Boy, Trek Marlin 7.
- Bổ sung cơ chế Bục xoay đổi xe tương tác (Interactive Pedestal Cycling): Khi người chơi lại gần bục, nhấn phím E hoặc nút điều hướng [◀] [▶] để chuyển đổi hiển thị các mẫu xe thuộc phân khúc đó ngay trên bục; thông số tên xe, giá bán, tốc độ cập nhật thời gian thực.
- Nâng cấp `VehicleShopPanel.tsx`: Thêm tabs lọc danh mục (Tất cả (16), Siêu xe (4), Xe sang & Cơ bắp (4), Mô tô PKL (4), Xe phố & Xe đạp (4)), cho phép xem preview xoay 360 độ và mua sắm trực tiếp toàn bộ 16 xe.
- Đa dạng hóa xe trưng bày ngoài tủ kính Gara Bạc Hà trên phố (`paintVehicleDealer`).

### R4. Đồng bộ Canvas Fallback Runtime & Pipeline Assets
- Nâng cấp thuật toán vẽ `vehicleCanvas` trong `apps/web/src/art/vehicle.ts` để xe dự phòng và xe trong tủ kính đạt cùng tỷ lệ, silhouette, vật liệu và không bị lỗi ngược hướng.
- Tạo trọn bộ 16 thư mục xe với `spritesheet.png` (192x160), `preview.png` (144x120), `icon.png` (48x40) và `meta.json` trong `assets/vehicles/` và đồng bộ sang `apps/web/public/vehicles/`.

## Verification Resources
- `scripts/audit_vehicle_geometry.py`: Kiểm định tự động kích thước 192x160, thân xe <= 40px, tiếp đất y=37, yên xe 2 bánh tại x=24, y=16..20.
- `scripts/verify-vehicle-assets.mjs`: Kiểm định tính toàn vẹn file PNG, header và cấu trúc `meta.json`.
- Test suites: `packages/game-data/src/vehicles.test.ts`, `apps/web/src/art/vehicle-loader.challenge.test.ts`, `apps/web/src/game/vehicles.challenge.test.ts`, `apps/web/src/game/showroom.test.ts`.

## Acceptance Criteria

### Direction & Physics Compliance
- [ ] Xe và người lái khi di chuyển sang trái (dir = 1) hiển thị đầu xe, đèn pha và avatar quay chính xác sang bên trái (không quay lùi, không bị lật ngược).
- [ ] Điểm tiếp đất của bánh xe ở các hướng ngang khớp chính xác y=37 px, thân xe không vượt quá 40 px chiều rộng, yên xe 2 bánh nằm tại x=24, y=16..20.

### Pixel Art Aesthetics (WOW Standard)
- [ ] Tất cả 16 xe đạt chuẩn Pixel Art 2.5D: có bóng đổ gầm xe, thân xe 4 tầng màu, kính phản quang 45 độ, mâm lốp có rãnh vân và cùm phanh, có tối thiểu 3 chi tiết đặc trưng nhận diện thương hiệu.
- [ ] Hoạt họa 4 frame mỗi hướng chạy mượt mà, bánh xe xoay góc tự nhiên, không giật khựng hay méo hình.
- [ ] Canvas fallback runtime (`vehicleCanvas`) hiển thị đúng tỷ lệ, silhouette và không rò rỉ transform matrix.

### Showroom & Gara Utilization
- [ ] Toàn bộ 16 mẫu xe đều có mặt trong Showroom Gara Bạc Hà thông qua 4 bục phân khúc có tính năng chuyển đổi mẫu xe (Pedestal Cycling) và Kiosk/Cửa hàng có bộ lọc danh mục.
- [ ] Mặt tiền tủ kính Gara Bạc Hà ngoài phố hiển thị các mẫu xe đa dạng và bắt mắt.

### Quality Gate & Verification
- [ ] `python scripts/audit_vehicle_geometry.py` vượt qua 100% không có lỗi cho cả 16 mẫu xe.
- [ ] `node scripts/verify-vehicle-assets.mjs` kiểm tra hợp lệ toàn bộ 16 thư mục xe.
- [ ] Vượt qua `pnpm --filter @cozy/game-data test` và `pnpm --filter @cozy/web test`.
- [ ] Vượt qua `pnpm format:check`, `pnpm lint`, `pnpm typecheck` và `pnpm test`.
- [ ] Chụp ảnh thực tế headless browser xác nhận trực quan: Showroom trưng bày xe lộng lẫy và xe chạy ngoài phố rẽ trái chuẩn xác.
