# Handoff Report: Spec Miner — Cozy Farm System

- **Agent**: `survey_spec_miner`
- **Recipient**: Orchestrator (`d39205dd-01db-4096-9bff-542cd3821c40`)
- **Type**: Hard (Task Complete)
- **Artifact Created**: `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_spec_miner\report.md`

---

## 1. Observation

1. **Tài liệu thiết kế gốc `docs/farm_system_plan.pdf`**:
   - Tài liệu gồm 12 trang với cấu trúc phân khu đầy đủ: Cổng Tây thị trấn kết nối sang Trang trại (trang 1, 4), Sơ đồ 5 phân khu (trang 4), Bảng màu Farm Color Palette (trang 4-5), Cơ chế ô đất trồng trọt và chu kỳ sinh trưởng (trang 5), 4 cụm chuồng trại riêng biệt (trang 5-6), Nhà kho nông trại Silo chuyên dụng 100 ngăn khởi điểm với 4 tab (trang 6), Tiệm nông nghiệp Bác Sáu và Hợp đồng đơn đặt hàng hôm nay (trang 7), Ao nuôi cá thủy sản nuôi trồng và guồng nước sục khí (trang 7), Cơ chế bảo mật Colyseus FarmRoom & phân quyền Co-op (trang 8), PostgreSQL Entity Relationship Diagram và schema 5 bảng: `farms`, `farm_plots`, `farm_animals`, `farm_warehouse_items`, `farm_pond_fishes` (trang 9-10), 11 REST API Endpoints Server-Authoritative (trang 10), Lộ trình triển khai 3 giai đoạn (trang 11), và Tiêu chí nghiệm thu Quality Gate (trang 12).
2. **Yêu cầu nhiệm vụ tại `ORIGINAL_REQUEST.md`**:
   - R1: Bản đồ nông trại & đồ họa 2.5D Pure Canvas (pixel art scanline rasterization, không dùng ảnh ngoài).
   - R2: Phòng riêng tư Colyseus `FarmRoom` (`farm:${ownerId}`) và phân quyền mật khẩu kèm `FarmPasswordModal`, cơ chế Co-op (khách chỉ được tưới cây, cấm trộm cắp thu hoạch).
   - R3: Database PostgreSQL 5 bảng và Server-Authoritative API tại `apps/api/src/routes/farm.ts` kèm Idempotency Key chống double-charge.
   - R4: Giao diện Farm HUD & Interaction Panels (Plot Detail, Silo Warehouse 4 tabs, Bác Sáu shop & daily contracts).
3. **Hiện trạng mã nguồn dự án**:
   - `apps/api/migrations/`: Có 4 migration hiện hữu (`0001_init.sql` đến `0004_fishing_rods.sql`). Cần thêm migration `0005_cozy_farm.sql`.
   - `apps/api/src/routes/`: Có `player.ts`, `admin.ts`, `internal.ts`. Cần thêm `farm.ts` và đăng ký trong `apps/api/src/app.ts`.
   - `apps/api/src/ledger.ts`: Đã có hàm `postLedger(tx, input)` hỗ trợ trừ/cộng Coin, Fame với `idempotency_key` và `SELECT FOR UPDATE`.
   - `apps/realtime/src/rooms/`: Đã có mô hình phòng cá nhân hóa `apartment.ts` (`ownerId`, `onAuth`, internal verification). Cần thêm `farm.ts` (`FarmRoom`) và đăng ký trong `apps/realtime/src/index.ts`.
   - `apps/web/src/art/`: Đã có hệ thống vẽ Pure Canvas 2D không phụ thuộc sprite sheet trong `town-landscape.ts`, `town-detail.ts`, `pixel.ts`. Cần thêm `farm-props.ts` và `farm-landscape.ts`.
   - `apps/web/src/game/GameCanvas.tsx` & `scenes.ts`: Quản lý danh sách Phaser Scene. Cần tích hợp `FarmScene` và điều hướng khi `roomKind === 'farm'`.

---

## 2. Logic Chain

1. Từ Observation 1 và 2, toàn bộ thông số kinh tế (giá hạt giống 30-120c, con giống 200-1800c, giá mở đất 500-5000c, sức chứa kho 100 ô + 50 ô/lần nâng cấp), 5 bảng dữ liệu quan hệ, và 11 endpoint API đã được mô tả mạch lạc trong tài liệu thiết kế gốc.
2. Từ Observation 3, kiến trúc hiện tại của Cozy Compute hoàn toàn tương thích với các đặc tả trong tài liệu:
   - Cơ chế tiền tệ và idempotency có thể kế thừa trực tiếp từ `postLedger`.
   - Colyseus room phân quyền theo chủ sở hữu (`farm:${ownerId}`) khớp chuẩn với pattern hiện có của `ApartmentRoom`.
   - Đồ họa Pure Canvas 2D tuân theo phương pháp scanline và pixel snap trong `apps/web/src/art/pixel.ts`.
3. Do đó, toàn bộ 34 tính năng, 16 ca kiểm thử biên (edge cases), công thức tính toán, mã vật phẩm và tiêu chuẩn chất lượng đã được khai thác và lập chỉ mục đầy đủ trong `report.md`.

---

## 3. Caveats

- **Cấu hình thời gian sinh trưởng (Growth Durations)**: Tài liệu gốc đưa ra nguyên tắc sinh trưởng theo thời gian thực (real-time) và bảng giá, trong đó `report.md` đã quy chuẩn thời lượng cơ sở cho 5 loại cây trồng (15 - 60 phút) để phù hợp với nhịp độ trải nghiệm mạng xã hội cozy MMO; đội ngũ triển khai có thể tinh chỉnh các hệ số này trong cấu hình balance mà không làm thay đổi kiến trúc API.
- **Tùy chọn cho phép khách thu hoạch (Co-op Harvest Toggle)**: Mặc định nghiêm cấm khách thu hoạch tài sản chủ nhà. Trường hợp chủ nhà muốn bật tính năng "Cho phép thu hoạch chung", có thể lưu cờ `allow_coop_harvest` trong bảng `farms` hoặc cài đặt session.

---

## 4. Conclusion

Nhiệm vụ khảo sát và trích xuất đặc tả (Spec Mining) cho Hệ Thống Trang Trại Cá Nhân đã hoàn tất 100%. Toàn bộ thông tin kỹ thuật cốt lõi, từ cơ sở dữ liệu PostgreSQL, các endpoint API, cơ chế phân quyền bảo mật phòng Colyseus, kho Silo, tiệm Bác Sáu, ao cá, đến bảng màu và đặc tả Pure Canvas 2D đã được tài liệu hóa chi tiết tại:
`C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_spec_miner\report.md`.

---

## 5. Verification Method

1. **Kiểm tra báo cáo chi tiết**:
   - Đọc trực tiếp `C:\Users\Bao\OneDrive\Máy tính\game\cozy-compute\.agents\teamwork\survey_spec_miner\report.md` để xác nhận đầy đủ 34 tính năng trong bảng Features Discovered, 16 Edge Cases, 5 DDL PostgreSQL tables, 11 API endpoints và Farm Color Palette.
2. **Đối chiếu tài liệu thiết kế gốc**:
   - So sánh các mục trong `report.md` với các trang 1 đến 12 của `docs/farm_system_plan.pdf` và `ORIGINAL_REQUEST.md`.
3. **Xác minh môi trường dự án**:
   - Chạy lệnh kiểm tra TypeScript và Lint của dự án để đảm bảo workspace không có lỗi:
     ```powershell
     pnpm typecheck
     pnpm lint
     ```
