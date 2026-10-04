# Kế Hoạch Thiết Kế & Triển Khai: Hệ Thống Thuyền Câu & Hải Trình Biển Sâu (Boat Fishing Expedition)

> **Mục tiêu**: Bổ sung tính năng mua các loại thuyền câu tại Tiệm Ngư Cụ Bác Ba, cho phép người chơi xuất bến từ cầu tàu thị trấn (Pier) để lái thuyền ra Bản đồ Biển Sâu (Offshore Ocean Realm) mới, khám phá các ngư trường xa bờ và săn bắt các loài thủy quái/thần ngư cực hiếm với phần thưởng kinh tế vượt trội.

---

## 1. Tổng quan Trải nghiệm Người chơi (Core Gameplay Loop)

```mermaid
flowchart TD
    A["Tiệm Ngư Cụ Bác Ba (Town)"] -->|Mua thuyền với Xu & Trang bị| B["Kho Đồ / Ngăn Thuyền"]
    B -->|Tiến lại Cầu Tàu Bến Cá (Pier)| C["Bến Đỗ Thuyền (Boat Slip)"]
    C -->|Bấm E / Lên Thuyền| D["Trạng thái Lái Thuyền (Boating Mode)"]
    D -->|Lái thuyền vượt luồng nước phía Đông| E["Cổng Hải Trình Biển Sâu (Sea Portal)"]
    E -->|Chuyển Scene| F["Map Mới: Hải Trình Biển Sâu (OceanScene)"]
    F -->|Thả cần câu trên thuyền hoặc cập đảo| G["Ngư Trường Rạn San Hô & Rãnh Biển Sâu"]
    G -->|Câu cá thành công| H["Cá Biển Sâu Thần Thoại (Kraken, Cá Kiếm, Thần Long)"]
    H -->|Lái thuyền về phao hoa tiêu Tây Bắc| I["Trở về Cầu Tàu Thị Trấn Trảng Dài"]
    H -->|Bán tại Bác Ba / Khoe Balo| J["Thu về lượng lớn Xu & Danh Tiếng"]
```

1. **Ghé Tiệm Bác Ba**: Người chơi mở giao diện tiệm, chuyển sang tab **"Bến Thuyền"** để chọn mua các loại thuyền phù hợp với túi tiền và mục tiêu câu cá.
2. **Xuất bến tại Cầu Tàu (Pier)**: Khi đã trang bị thuyền, tại mạn cầu tàu xuất hiện chiếc thuyền của người chơi neo đậu dập dềnh. Bấm `E` để lên thuyền.
3. **Điều khiển thuyền lướt sóng**: Nhân vật chuyển sang trạng thái cưỡi thuyền với sprite động, hiệu ứng rẽ sóng (wake waves) và tốc độ di chuyển tăng dần theo cấp thuyền.
4. **Du hành sang Map Biển Sâu mới**: Chạy thuyền qua luồng nước dẫn ra biển lớn để vào map **Hải Trình Biển Sâu (Offshore Ocean)**.
5. **Khám phá các ngư trường bí ẩn**:
   - Vùng rạn san hô (Coral Reef): Cá Rất Hiếm (Rare/Epic).
   - Vịnh biển lộng (Open Ocean): Cá Cực Hiếm & Thủy quái (Epic/Legendary).
   - Rãnh biển đen tối (The Abyssal Trench): Cá Thần Thoại & Tối Thượng (Sovereign).
6. **Câu cá trực tiếp từ mạn thuyền**: Thả cần câu bất cứ nơi đâu trên mặt nước biển sâu, tận hưởng cơ chế câu cá kéo cước kịch tính và mang về chiến lợi phẩm khủng.

---

## 2. Hệ Thống Thuyền & Phân Cấp (Boat Tiers & Catalog)

Thuyền được quản lý như một loại trang bị cao cấp (`type: 'boat'`, `slot: 'boat'`) với thẩm quyền server (Server-Authoritative):

| Cấp Thuyền | Tên Thuyền                                       | Giá (Xu) | Tốc độ   | Vùng biển cho phép             | Đặc điểm & Ngoại quan                                                                            |
| ---------- | ------------------------------------------------ | -------- | -------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Tier 1** | **Thuyền Thúng Nan Tre** _(Bamboo Coracle)_      | 1,500    | 130 px/s | Vùng đầm lầy, ven bờ sông      | Nan tre đan quét hắc ín truyền thống Nam Bộ, tay chèo gỗ nhỏ nhắn, nhẹ nhàng dập dềnh.           |
| **Tier 2** | **Thuyền Gỗ Tam Bản** _(Wooden Sampan)_          | 6,000    | 170 px/s | Vùng ven biển, Rạn san hô nông | Thuyền ba lá gỗ sao vững chãi, có mui che lá dừa, cắm cờ đuôi nheo, khoang chứa đồ rộng.         |
| **Tier 3** | **Ca Nô Composite Cao Tốc** _(Speedboat Cutter)_ | 22,000   | 230 px/s | Toàn bộ Vịnh Biển Lộng         | Động cơ đuôi tôm công suất lớn, thân composite trắng-xanh hiện đại, lướt sóng xé gió.            |
| **Tier 4** | **Tàu Viễn Dương Hoàng Kim** _(Abyssal Trawler)_ | 65,000   | 270 px/s | Rãnh Biển Sâu (Abyssal Trench) | Tàu sắt bọc đồng kiên cố, đèn pha rọi biển đêm, đài radar phát quang, chịu được bão tố biển sâu. |

---

## 3. Bản Đồ Mới: Hải Trình Biển Sâu (Offshore Ocean Realm)

- **Quy mô thế giới**: Kích thước 48 x 32 tiles (`1536 x 1024 px`), tỉ lệ chuẩn hệ thống Cozy Compute.
- **Không gian & Địa hình**:
  1. **Bến đỗ Đảo Thần Ngư (Angler's Isle Dock)**: Hòn đảo đá cổ kính ở trung tâm với ngọn Hải Đăng sừng sững, cầu tàu đá cổ để người chơi có thể neo thuyền lên bờ nghỉ chân.
  2. **Bãi Rạn San Hô Phát Quang (Bioluminescent Coral Shelf)**: Vùng nước nông xanh ngọc bích, nhìn thấu những rặng san hô phát sáng lung linh.
  3. **Vùng Biển Lộng Đón Gió (Open Ocean Waves)**: Vùng nước biển xanh thẳm với những đàn hải âu chao liệng, phao hoa tiêu nhấp nháy dẫn đường.
  4. **Vực Thẳm Biển Sâu (Abyssal Trench)**: Vùng biển đen huyền bí ở góc Đông Nam, sấm chớp mờ ảo, xoáy nước ngầm—nơi duy nhất xuất hiện bóng cá khổng lồ và Thần Long Trấn Biển.
  5. **Cổng Quay Về Thị Trấn (Return Shipping Channel)**: Phao tiêu hải trình dẫn về Bến Cầu Tàu Thị Trấn Trảng Dài an toàn.

---

## 4. Danh Mục Cá Biển Sâu Mới (New Offshore Fish Pool)

Bổ sung các loài cá độc quyền chỉ câu được khi ra khơi trên biển:

1. **Cá Ngừ Vây Xanh Đại Dương** _(Giant Bluefin Tuna - Rare)_: Vua tốc độ biển sâu, thịt đỏ tươi giá trị cao.
2. **Cá Kiếm Hoàng Kim** _(Broadbill Swordfish - Epic)_: Chiếc mũi kiếm dài bén ngót, sức kéo cước dữ dội.
3. **Cá Mặt Trăng Khổng Lồ** _(Giant Mola Mola - Epic)_: Thân hình tròn dẹp khổng lồ lững lờ tắm nắng giữa đại dương.
4. **Hải Long Thước Ngân** _(Bioluminescent Oarfish - Legendary)_: Cá rồng biển dài hàng mét phát ánh sáng bạc ma mị dưới rãnh vực.
5. **Mực Khổng Lồ Đáy Biển** _(Colossal Kraken Squid - Legendary)_: Những chiếc xúc tua khổng lồ ôm trọn mồi câu giữa màn đêm.
6. **Thần Long Hải Vương** _(Abyssal Sovereign Dragon - Sovereign)_: Thần thú tối thượng của biển cả Nam Bộ, chỉ cắn câu cần thủ cưỡi Tàu Viễn Dương Hoàng Kim tại Rãnh Biển Sâu.

---

## 5. Kiến Trúc Kỹ Thuật & An Ninh (Technical Architecture & Anti-Cheat)

Tuân thủ nghiêm ngặt nguyên tắc **Server-Authoritative Game State** từ `AGENTS.md`:

1. **Giao dịch Mua Thuyền Idempotent**:
   - Sử dụng `/shop/buy` với `idempotencyKey` ngẫu nhiên.
   - Server kiểm tra số dư ví Coin trong Database transaction, trừ tiền và ghi nhận `inventory_items` với `type = 'boat'`.
2. **Xác thực Thẩm quyền Ra Khơi (Access Verification)**:
   - Server kiểm tra quyền sở hữu thuyền trước khi chấp nhận chuyển vào phòng `OceanRoom`.
   - Người chơi không sở hữu thuyền hoặc sử dụng thuyền cấp thấp sẽ bị từ chối khi cố tiếp cận Vực Thẳm Biển Sâu.
3. **Cơ chế Điều Khiển Thuyền Client-Side (Smooth Boating Physics)**:
   - Khi ở trên thuyền, tốc độ avatar được cập nhật theo thông số của thuyền đang trang bị.
   - Thêm hiệu ứng hạt sóng nước (water foam particles) và nghiêng thân thuyền khi bẻ lái.
4. **Phòng chơi Đa người chơi Biển Sâu (`OceanRoom`)**:
   - Quản lý đồng bộ sự hiện diện của nhiều thuyền bè cùng lúc trên biển.
   - Đồng bộ động tác buông cần câu từ mạn thuyền của các người chơi khác trong phòng.
   - Hệ thống thông báo kênh toàn server (Server Broadcast) khi có cần thủ săn được cá Legendary/Sovereign ngoài biển khơi.

---

## 6. Lộ Trình Triển Khai Chi Tiết (Milestones)

### Giai đoạn 1: Dữ Liệu & Kinh Tế Thuyền (`packages/game-data` & `packages/economy`)

- [ ] Định nghĩa `BoatConfig`, hằng số `BOATS`, item seeds `type: 'boat'`.
- [ ] Bổ sung danh mục cá biển sâu vào `FISH` và cấu hình bảng xác suất câu biển sâu.
- [ ] Viết unit tests kiểm thử logic mua thuyền, tốc độ, phân loại vùng biển.

### Giai đoạn 2: Cửa Hàng & Túi Đồ (`apps/web/src/screens`)

- [ ] Nâng cấp [`FishingShopPanel.tsx`](file:///C:/Users/Bao/OneDrive/Máy%20tính/game/cozy-compute/apps/web/src/screens/panels/FishingShopPanel.tsx): Thêm tab "Bến Thuyền" với giao diện trực quan, bảng thông số và nút mua/trang bị.
- [ ] Cập nhật Balo ([`BackpackPanel.tsx`](file:///C:/Users/Bao/OneDrive/Máy%20tính/game/cozy-compute/apps/web/src/screens/panels/BackpackPanel.tsx)) để xem và đổi thuyền nhanh.

### Giai đoạn 3: Đồ Hoạ Pixel Art & Sprite Thuyền (`apps/web/src/art`)

- [ ] Tạo module `apps/web/src/art/boat.ts`: Vẽ 4 loại thuyền (Thúng, Tam Bản, Ca Nô, Tàu Viễn Dương) kèm avatar và vệt sóng.
- [ ] Tạo module `apps/web/src/art/ocean-landscape.ts`: Vẽ phong cảnh biển sâu, đảo hải đăng, rạn san hô và bến tàu.

### Giai đoạn 4: Map Biển Sâu & Tương Tác Cầu Tàu (`apps/web/src/game`)

- [ ] Cập nhật Cầu Tàu Thị Trấn ([`apps/web/src/game/scenes.ts`](file:///C:/Users/Bao/OneDrive/Máy%20tính/game/cozy-compute/apps/web/src/game/scenes.ts)): Đặt thuyền neo ở bến, bấm `E` để lên thuyền ra khơi.
- [ ] Hiện thực `OceanScene`: Lái thuyền, va chạm rạn đá, câu cá từ thuyền, quay về thị trấn.

### Giai đoạn 5: Phòng Máy Chủ Realtime & API (`apps/realtime` & `apps/api`)

- [ ] Tạo `OceanRoom` trong `apps/realtime/src/rooms/ocean.ts` xử lý di chuyển thuyền và câu cá đồng bộ.
- [ ] Cập nhật endpoint câu cá `/activities/fishing/start` hỗ trợ các zone biển sâu.

### Giai đoạn 6: Kiểm Thử Toàn Diện & Quality Gate

- [ ] Chạy toàn bộ test suites (`game-data`, `realtime`, `web`, `api`).
- [ ] Kiểm tra `pnpm typecheck`, `pnpm lint`, `pnpm format:check`.
- [ ] Chạy thử nghiệm thực tế trên trình duyệt và xác nhận không có lỗi kẹt đường hay giật map.
