# Khảo Sát Kỹ Thuật Frontend & Phaser 3: Hệ Thống Cozy Farm

**Dự án**: Cozy Compute Social MMO  
**Phân hệ**: Hệ Thống Trang Trại Cá Nhân (Cozy Farm System)  
**Tác giả**: Frontend & Phaser Explorer  
**Thời điểm khảo sát**: 2026-10-02  
**Mục tiêu**: Phân tích kiến trúc mã nguồn hiện tại của client (`apps/web` và `@cozy/game-data`), đưa ra thiết kế chi tiết và lộ trình hiện thực hóa Đồ họa Pure Canvas 2D, Cổng chuyển map Tây thị trấn, Phaser `FarmScene`, UI Modals/Panels và tích hợp kết nối Colyseus.

---

## 1. Tổng Quan Kiến Trúc Client Hiện Tại

Hệ thống frontend của Cozy Compute Social MMO được tổ chức theo kiến trúc kết hợp chặt chẽ giữa **Phaser 3** (quản lý viewport game, render thế giới pixel 2.5D, chuyển động người chơi và camera) và **React 19 + Zustand + TanStack Query** (quản lý HUD overlays, modal cửa sổ, panel tương tác, hệ thống form và quản lý trạng thái).

```
                      +------------------------------------------+
                      |         React 19 Application Shell        |
                      |   (screens/Game.tsx, ui/primitives.tsx)   |
                      +--------------------+---------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
+-------------------+-------------------+   +---------------------+---------------------+
|        Phaser 3 Game Engine           |   |            UI Overlay Layer               |
|  (GameCanvas.tsx, scenes.ts)          |   |  - Modals: Modal portal (Backdrop/Esc)    |
|  - Scenes: TownScene, ApartmentScene, |   |  - Panels: Backpack, Shop, Fishdex, ...   |
|    CompanyScene, UniversityScene,     |   |  - HUD: Compass, Zone Prompts, Chat,      |
|    ComGaScene, BidaScene, CyberNet    |   |         Emote wheel, Help & Zoom controls |
|  - Textures: Pure Canvas 2D textures  |   |  - State: Zustand store (useUi in store.ts)|
|    (PixelGrid, scanlines, no images)  |   |  - Queries: TanStack Query + api client   |
+-------------------+-------------------+   +-------------------------------------------+
                    |
+-------------------+-------------------+
|     Colyseus Networking Layer         |
|  (net.ts, players.ts, schema.ts)      |
|  - Single active room instance        |
|  - Client prediction & reconciliation |
|  - Room transition state machine      |
+---------------------------------------+
```

---

## 2. Chi Tiết Khảo Sát Theo Từng Hạng Mục

### 2.1 Cấu Hình Game & Cấu Trúc Scene Phaser 3

#### A. Khởi tạo GameCanvas (`apps/web/src/game/GameCanvas.tsx`)
- Phaser được nhúng qua React hook `useEffect` trong `GameCanvas.tsx` với cấu hình:
  - `type: Phaser.AUTO`
  - `pixelArt: true`, `roundPixels: true`: Đảm bảo pixel art hiển thị sắc nét tuyệt đối, không bị mờ nhòe do nội suy tuyến tính (nearest-neighbor scaling).
  - `scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' }`: Tự động co giãn theo kích thước khung nhìn trình duyệt.
  - `audio: { noAudio: true }`: Toàn bộ âm thanh trong game được tạo tổng hợp độc lập qua Web Audio API Oscillator (`apps/web/src/lib/sound.ts`), không phụ thuộc asset âm thanh ngoài.
  - `scene: [TownScene, ApartmentScene, CompanyScene, UniversityScene, ComGaScene, BidaScene, CyberNetScene]`.
- **Cơ chế chuyển Scene**:
  - `GameCanvas` lắng nghe trường `roomKind = useUi((s) => s.room.kind)`.
  - Khi `roomKind` thay đổi (ví dụ chuyển sang `'farm'`), Phaser tự động dừng các scene đang chạy (`s.scene.stop()`) và khởi động scene mục tiêu (`game.scene.start(target)`).
  - Để tích hợp `FarmScene`, chỉ cần đăng ký `FarmScene` vào mảng `scene` trong `GameCanvas.tsx` và thêm `'farm'` vào kiểu `UiState['room']['kind']`.

#### B. Phân Cấp Lớp Scene (`apps/web/src/game/scenes.ts`)
- **`WorldScene` (Lớp trừu tượng cơ sở)**:
  - Quản lý phím bấm di chuyển `WASD` và `Mũi tên`.
  - Tích hợp `PlayerLayer`: tự động lắng nghe Colyseus room qua `net.onRoom((room) => this.bindRoom(room))`.
  - Quản lý camera: Phương thức `fitCamera()` tính toán zoom cơ sở dựa trên tỷ lệ màn hình và `useUi.getState().zoom`, áp dụng `cam.setBounds(...)` để clamping camera chuẩn xác không lộ viền ngoài.
  - Xử lý điều khiển: Phương thức `update()` kiểm tra hàm `typing()` (người chơi đang nhập văn bản vào input/textarea/contentEditable) hoặc khi có modal backdrop, panel, activity đang mở để tự động chặn di chuyển của nhân vật.
- **`InteriorScene` (Lớp mở rộng cho các không gian nội thất & phân khu)**:
  - Kế thừa `WorldScene`.
  - Cung cấp cơ chế tương tác phím E theo cự ly (`this.interactAt(x, y, label, run)`): Tự động tìm điểm tương tác gần nhất trong phạm vi `2 * TILE` (64px) và hiển thị tooltip `E · [label]`.
  - Hỗ trợ bong bóng thoại NPC (`activeBubble`), tự động đóng khi bấm `Esc` hoặc sau một khoảng thời gian trễ.
- **`TownScene`**:
  - Quản lý thế giới ngoài trời Thị trấn (48 x 32 tiles, 1536 x 1024 px).
  - Render thế giới chi tiết qua `buildDetailedTown(this)` (`town-detail.ts`).
  - Lắng nghe vị trí di chuyển qua `onSelfMove(x, y)` để cập nhật zone hiện tại vào `useUi.getState().setZone(zone)`.

---

### 2.2 Đồ Họa Pure Canvas 2D (Procedural Graphics & Pixel Snap)

#### A. Kiến Trúc Không Dùng Ảnh Ngoài (Zero External Images)
Dự án áp dụng nguyên tắc **Pure Canvas 2D** nhất quán:
1. **Lớp tiện ích `PixelGrid` (`apps/web/src/art/pixel.ts`)**:
   - Cung cấp lưới pixel logic với bộ đệm `(string | null)[]`.
   - Các phép vẽ cơ bản: `set(x, y, color)`, `rect(x, y, w, h, color)`, `circle`, `ellipse`, `line` (thuật toán Bresenham), `outline` (tự động tạo viền 1px bao quanh các vùng đổ màu), `dither` (tạo hiệu ứng chuyển sắc hạt), `mirror` (lật đối xứng).
   - Xuất ra `HTMLCanvasElement` qua `toCanvas(scale)` và đăng ký vào Phaser qua `this.textures.addCanvas(key, canvas)`.
2. **Scanline Rasterization & Pixel Snapping (`apps/web/src/art/town-detail.ts`, `town-landscape.ts`)**:
   - `c.getContext('2d')!.imageSmoothingEnabled = false`: Tắt triệt để anti-aliasing trên Canvas context.
   - Hàm `shape(ctx, color, points)` thực hiện scanline rasterization: tính toán giao điểm giữa từng đường quét ngang và các cạnh đa giác, tô từng đoạn pixel nguyên `[Math.ceil(x1) .. Math.floor(x2)]`. Điều này giúp các cạnh cong, mái ngói vòm, bờ ao, thân gia súc giữ được độ sắc nét pixel chân thực.
   - Hàm `box(ctx, color, x, y, w, h)` luôn dùng `Math.round()` để khóa chặt mọi tọa độ vào lưới pixel nguyên bản.
3. **Bộ Sinh Số Ngẫu Nhiên Ổn Định (`mulberry(seed)`)**:
   - Hàm PRNG đơn định `mulberry` tạo các chi tiết trang trí (hoa dại, vết sần trên đất, vỏ cây, sao lấp lánh) hoàn toàn đồng nhất giữa các lần render mà không bị giật lag hay thay đổi ngẫu nhiên.
4. **Hệ Thống Bảng Màu Đồng Quê Nam Bộ Cho Cozy Farm**:
   - Đất phù sa & luống cày: Đất khô `#8c6747`, Đất ướt đậm màu sau tưới `#5c3a21`, Đất màu mỡ bón phân vi sinh `#3b2314`.
   - Cây trồng & mầm xanh: Mầm non `#a3e635`, Thân lúa/dây dưa óng ả `#65a30d`, Lá xum xuê `#15803d`, Trái chín vàng `#facc15`, Cà chua chín mọng đỏ `#dc2626`.
   - Gỗ mộc & tranh tre: Thân tre vàng ngà `#d4a373`, Vách gỗ mộc `#713f12`, Mái lá dừa khô `#9a6a38`, Ụ rơm vàng óng `#fde047`.
   - Nước ao & bèo hoa dâu: Nước ao ngọc lục bảo `#356859`, Bèo tấm `#84cc16`, Hoa sen hồng phấn `#f472b6`.

---

### 2.3 Điều Khiển & Tiêu Chuẩn Accessibility (A11y)

| Phím Tắt | Chức Năng | Cơ Chế Triển Khai |
|:---|:---|:---|
| **WASD / Arrows** | Di chuyển 4 hướng | Phaser `WorldScene.update()` kiểm tra `this.keys`, gửi input vector qua `PlayerLayer.setInput({ x, y })`. Bị vô hiệu hóa khi gõ text (`typing()`) hoặc khi mở panel/modal. |
| **E** | Tương tác gần | - Trong `TownScene`: Lắng nghe theo `zone` từ `ZONE_ACTIONS[zone]`, hiển thị nút CTA trên HUD và trigger hành động tương ứng.<br>- Trong `InteriorScene` / `FarmScene`: Proximity check bán kính `2 * TILE`, hiển thị hint `E · [Tên tương tác]`. |
| **Q** | Bánh xe cảm xúc (Emote Wheel) | Toggle popup wheel 8 biểu cảm (`wave`, `laugh`, `heart`, `shock`, `dance`, `sleep`, `angry`, `thumbs`), gửi `net.send('emote', ...)`. |
| **Enter** | Mở ô chat thị trấn / nông trại | Focus trực tiếp vào phần tử `#chat-input`. |
| **Esc** | Hủy / Đóng / Quay lại | Đóng active modal (qua `Modal` portal), đóng panel hiện tại (`setPanel(null)`), hủy bong bóng thoại NPC, thoát menu avatar. |
| **B** | Mở Balo / Tủ đồ cá nhân | Chuyển đổi trạng thái `panel === 'backpack'`. |
| **+ / - / 0 / Wheel** | Zoom camera bản đồ | Tăng/giảm zoom theo nấc 0.1, phím `0` reset về 100%. Đã chặn kích hoạt khi cuộn chuột bên trong modal hoặc panel. |

---

### 2.4 Kiến Trúc UI: React Overlays, Modals & HUD

#### A. Cấu Trúc Overlay Tách Biệt
- Canvas của Phaser nằm ở lớp nền (`main.world > GameCanvas`), toàn bộ giao diện điều khiển nằm ở lớp overlay React bên trên (`WorldHud`, `TopBar`, `Sidebar`, `ConnectionOverlay`, và các Panels).
- **Zustand Store (`apps/web/src/lib/store.ts`)**:
  - `panel: Panel`: Điều khiển panel đang mở (`'backpack'`, `'shop-fashion'`, `'events'`, v.v.).
  - `room: { kind, ownerId?, label }`: Quản lý không gian hiện tại của client.
  - `toasts: Toast[]`: Thông báo góc màn hình (4 kiểu: `success`, `error`, `info`, `reward`).

#### B. Thành Phần UI Chuẩn Hóa (`apps/web/src/ui/primitives.tsx`)
1. **`Modal`**:
   - Sử dụng `createPortal` mount trực tiếp vào `document.body`.
   - Có lớp nền mờ `.backdrop` (`backdrop-filter: blur(4px)`).
   - Tự động bẫy tiêu điểm bàn phím (`Tab` và `Shift+Tab`), tự đóng khi nhấn `Esc` hoặc click ngoài vùng hộp thoại.
   - Đạt chuẩn accessibility với `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
2. **`Panel`**:
   - Được dùng cho các bảng toàn màn hình hoặc slide-over (như Balo, Cửa hàng).
   - Chứa tab list, header có nút đóng `Esc`, thanh công cụ tìm kiếm và lọc.
3. **`ConfirmDialog`**:
   - Dialog xác nhận thao tác quan trọng (mua hàng, mở khóa đất, nâng cấp kho).

#### C. Các Panels & Modals Cần Thiết Cho Cozy Farm:
1. **`FarmPasswordModal.tsx`**:
   - Sử dụng `Modal` với giao diện phím gỗ mộc mạc phong cách Nam Bộ.
   - Hỗ trợ cả bàn phím cứng và bàn phím ảo (virtual numeric keypad) cho thiết bị cảm ứng hoặc chuột.
   - Nhập đúng password -> gọi API xác thực -> nhận session token truy cập `FarmRoom`.
   - Phím `Esc` hoặc nút Hủy đưa người chơi trở lại vị trí an toàn ngoài cổng.
2. **`FarmPlotModal.tsx` (hoặc Interactive HUD Plot Control)**:
   - Hiển thị thông số ô đất đang chọn: Trạng thái (Đất hoang khóa, Đất khô, Đất ướt, Đang lớn, Chín rộ), thời gian sinh trưởng còn lại, thời gian giữ ẩm.
   - Nút hành động trực quan tuân thủ **Zero-Dead-Ends**:
     - *Mở khóa ô đất*: Hiện giá Coin, khấu trừ an toàn với idempotency key.
     - *Cuốc đất / Xới luống*: Chuyển thành đất tơi xốp.
     - *Gieo hạt*: Chọn hạt giống từ Silo/Balo.
     - *Tưới nước*: Cấp ẩm cho luống đất, kích hoạt hiệu ứng nước sẫm màu.
     - *Bón phân vi sinh*: Giảm 50% thời gian lớn.
     - *Thu hoạch*: Gặt lúa/dưa/cà chua, nhận sản phẩm vào Kho Silo.
3. **`FarmSiloPanel.tsx`**:
   - Panel chứa nông sản và vật tư trang trại (dung lượng cơ sở 100 ô).
   - Nút nâng cấp dung lượng (+50 ô/lần) bằng Coin có hộp thoại xác nhận.
   - 4 tab thông minh:
     - 🌾 *Nông sản gặt hái*: Lúa mì, bắp ngô, dưa hấu ruột đỏ, cà chua bi, ớt hiểm.
     - 🥚 *Sản phẩm chăn nuôi*: Trứng gà ta, trứng vịt lộn, sữa tươi nguyên chất, cuộn len, lông vũ.
     - 🌱 *Túi hạt giống & Con giống*: Các loại hạt giống và con giống mua từ Bác Sáu.
     - 🧪 *Vật tư & Phân bón*: Cám bắp, thóc bồ, phân vi sinh, phân trùn quế, bình tưới.
   - Hoàn toàn tách bạch khỏi Backpack cá nhân.
4. **`FarmShopPanel.tsx` (Tiệm Nông Nghiệp Bác Sáu)**:
   - Tab 1: *Gian hàng vật tư* (Mua hạt giống, con giống, thức ăn gia súc, phân bón).
   - Tab 2: *Thu mua nông sản & Hợp đồng hôm nay* (Bán sỉ nông sản lấy Coin, nộp đơn hàng theo yêu cầu để nhận thêm +25% Coin và điểm kinh nghiệm Nông Dân).

---

### 2.5 Bản Đồ Thị Trấn & Cơ Chế Chuyển Cảnh Sang `FarmScene`

#### A. Khảo Sát Mép Tây Thị Trấn Hiện Tại
- Bản đồ Thị trấn có kích thước `48 x 32` ô (`1536 x 1024` px).
- Trong `packages/game-data/src/map.ts`:
  - Tuyến đường chính `PATHS` có đoạn `t(1, 10, 46, 2)` chạy ngang từ cột 1 (`x = 32`) đến cột 47 tại hàng 10-11 (`y = 320..384`).
  - Toàn bộ mép Tây (cột 0, `x = 0..32`) hiện đang bị chặn bởi blocker chu vi: `t(0, 0, 1, MAP_ROWS)`.
  - Trong `town-detail.ts`: Vùng ven Tây có các cây rừng biên giới (`border:west:${y}`) được vẽ dày đặc dọc theo `x = 8..18`.
- Ràng buộc kiểm thử nghiêm ngặt (`packages/game-data/src/town-layout.test.ts`):
  - Mọi zone trong `ZONES` **bắt buộc phải có đường đi lát đá liên tục nối đến điểm xuất phát `SPAWN`** (`it('connects every activity to spawn along paved paths or the pier')`).

#### B. Giải Pháp Tích Hợp Cổng Tây (Western Gate Portal)
1. **Cập nhật `packages/game-data/src/map.ts`**:
   - Tách blocker phía Tây thành 2 đoạn, chừa khoảng trống tại hàng 10-11:
     ```ts
     // Thay vì t(0, 0, 1, MAP_ROWS):
     t(0, 0, 1, 10),                 // Đoạn tường trên cổng (hàng 0..9)
     t(0, 12, 1, MAP_ROWS - 12),      // Đoạn tường dưới cổng (hàng 12..31)
     ```
   - Mở rộng đường đi `PATHS`: Bổ sung `t(0, 10, 2, 2)` nối thẳng ra mép bản đồ.
   - Khai báo Zone mới:
     ```ts
     {
       id: 'farm_gate',
       label: 'Cổng Trang Trại Nam Bộ',
       prompt: 'Bước qua cổng nông trại',
       rect: t(0, 10, 2, 2),
     }
     ```
   - Thêm `'farm_gate'` vào kiểu `ZoneId` và mảng `DELIVERY_DESTINATIONS` nếu cần.
2. **Cập nhật Đồ Họa Cổng Tây trong `town-detail.ts`**:
   - Trong vòng lặp vẽ cây biên giới Tây (`border:west`), bỏ qua đoạn `y >= 300 && y <= 400` để không che khuất lối đi.
   - Vẽ **Cổng Chào Nông Trại Tre Mộc Mạc** (mái tranh nhỏ, 2 cột tre vàng ngà, hàng rào tre thấp) và **Biển Chỉ Dẫn** cắm ven đường đề chữ *"Đường Vào Trang Trại"*.
3. **Cơ Chế Chuyển Cảnh Mượt Mà**:
   - Khi người chơi đi đến mép Tây (`x <= 0.8 * TILE && y >= 9.8 * TILE && y <= 11.5 * TILE`) hoặc đứng trước cổng nhấn phím `E`:
     - Nếu là trang trại của chính mình: Gọi `net.goFarm(me.id, 'Trang Trại Của Bạn')` -> tự động chuyển scene và phòng Colyseus.
     - Nếu ghé thăm người chơi khác (từ thẻ người chơi `PlayerCardModal` hoặc danh sách bạn bè): Mở `FarmPasswordModal` -> nhập đúng mật khẩu -> `net.goFarm(targetOwnerId, ..., passwordToken)`.
   - Tại `FarmScene`: Cổng ra nằm ở phía Bắc (`y <= 1.5 * TILE && x >= 22 * TILE && x <= 26 * TILE`), khi bước qua sẽ gọi `net.goTown()` đưa người chơi trở lại vị trí Cổng Tây thị trấn (`x = 2 * TILE, y = 10.5 * TILE`).

---

### 2.6 Kết Nối Client Colyseus & Đồng Bộ Dữ Liệu Thời Gian Thực

#### A. Kiến Trúc Colyseus Client (`apps/web/src/game/net.ts`)
- Client duy trì duy nhất một kết nối phòng hoạt động tại một thời điểm (`Net.room`).
- Đối tượng `target` hiện hỗ trợ:
  ```ts
  private target:
    | { name: 'town' }
    | { name: 'apartment'; ownerId: string }
    | { name: 'company' }
    | { name: 'university' }
    | { name: 'comga' }
    | { name: 'bida' }
    | { name: 'cybernet' };
  ```
- **Mở rộng cho Farm**:
  Thêm target:
  ```ts
  | { name: 'farm'; ownerId: string; passwordToken?: string }
  ```
  Và phương thức điều hướng:
  ```ts
  goFarm(ownerId: string, label = 'Trang Trại Nam Bộ', passwordToken?: string) {
    useUi.getState().setRoom({ kind: 'farm', ownerId, label });
    return this.connect({ name: 'farm', ownerId, passwordToken });
  }
  ```
- Trong `doConnect()`:
  ```ts
  target.name === 'farm'
    ? await this.client.joinOrCreate('farm', { token, ownerId: target.ownerId, passwordToken: target.passwordToken })
  ```
- Xử lý lỗi từ chối: Nếu máy chủ từ chối kết nối (mật khẩu sai hoặc phòng khóa riêng tư), client hiển thị toast báo lỗi, giữ người chơi ở lại cổng Thị trấn và không bị kẹt màn hình đen.

#### B. Cơ Chế Dự Đoán Chuyển Động & Reconcile (`PlayerLayer`)
- `PlayerLayer` (`apps/web/src/game/players.ts`) quản lý toàn bộ avatar trong phòng:
  - Bản thân người chơi (local avatar): Áp dụng `MovementPrediction`, gửi input định kỳ 20Hz (`sendAcc >= 50ms`) lên server và reconcile vị trí chính xác.
  - Người chơi khác (remote avatars): Nội suy chuyển động mượt mà dựa trên snapshot trạng thái của server.
  - Camera follow: `this.scene.cameras.main.startFollow(av.container, true, 0.12, 0.12)`.
  - Chat bubbles và emote icons tự động neo phía trên đầu avatar.
- Khi vào `FarmScene`, `PlayerLayer` hoạt động ngay tức thì mà không cần viết lại cơ chế đồng bộ nhân vật.

#### C. Đồng Bộ Trạng Thái Nông Trại & Phân Quyền Co-op
- Máy chủ `FarmRoom` phát sóng các sự kiện thời gian thực tới tất cả người chơi có mặt:
  - `farm:plot_updated`: Ô đất được tưới nước / nảy mầm / chín / thu hoạch.
  - `farm:coop_water`: Khách tưới nước giúp cây -> hiển thị hiệu ứng bong bóng trái tim thân thiện (`❤️ +1 Tim Thân Thiện`) bay lên phía trên đầu khách và chủ trang trại.
  - `farm:animal_animated`: Đàn gà mổ thóc, bò nhai cỏ, heo lăn sình.
  - `farm:wheel_spin`: Guồng nước sủi bọt trắng liên tục.
- Quyền hạn Co-op: Khách chỉ được gửi yêu cầu tưới nước (`farm:water`). Nếu khách cố tình gửi lệnh thu hoạch nông sản (`farm:harvest`) hoặc can thiệp ô đất của chủ nhà, máy chủ Colyseus và API lập tức từ chối và phát thông báo cảnh báo.

---

## 3. Kiến Trúc Thiết Kế `FarmScene` (Phaser 3)

### 3.1 Bố Cục Không Gian Trang Trại Nam Bộ

Bản đồ `FarmScene` được thiết kế theo kích thước chuẩn `48 x 32` ô (`1536 x 1024` px):

```
+----------------------------------------------------------------------------------------+
| Hàng 0-3:   [BỜ RÀO TRE & CỔNG NÔNG TRẠI HƯỚNG BẮC (LỐI VỀ THỊ TRẤN)]                 |
|                                                                                        |
| Hàng 4-13:  [TIỆM BÁC SÁU]           [NHÀ KHO SILO]             [AO CÁ & GUỒNG NƯỚC]   |
|             (Cột 3..14)              (Cột 18..28)               (Cột 32..45)           |
|             - Sạp gỗ mái lá          - Kho ngói âm dương        - Bờ ao viền đá, sen   |
|             - NPC Bác Sáu khăn rằn   - Bao thóc, thùng gỗ,      - Cầu khỉ, chòi lá dừa |
|             - Bán giống & đơn hàng     bù nhìn rơm nón lá       - Guồng nước sủi bọt   |
|                                                                                        |
| Hàng 14-17: ================== CON ĐƯỜNG ĐÁ SỎI & MƯƠNG NƯỚC ========================= |
|                                                                                        |
| Hàng 18-30: [CỤM CHUỒNG TRẠI GIA SÚC]           [KHU MẪU ĐẤT CANH TÁC 6x6]             |
|             (Cột 3..20)                         (Cột 24..45)                           |
|             - Chuồng gà/vịt (mái lá, ổ rơm)     - 36 ô đất nông nghiệp                 |
|             - Chuồng bò sữa (máng cỏ, cọc gỗ)   - Ô khóa: cọc gỗ biển ổ khóa kèm giá   |
|             - Chuồng heo mọi (bãi sình bùn)     - Ô cuốc khô / Ô tưới đẫm nước sẫm màu |
|             - Chuồng dê núi (bục leo dốc)       - Mầm non -> Thân lúa -> Trái chín     |
|                                                                                        |
| Hàng 31:    [BỜ RÀO TRE NAM BỘ PHÍA NAM]                                               |
+----------------------------------------------------------------------------------------+
```

### 3.2 Các File Nghệ Thuật Cần Tạo Mới
1. **`apps/web/src/art/farm-landscape.ts`**:
   - `paintFarmLandscape()`: Vẽ toàn bộ mặt đất trang trại (đất thịt đồng bằng, thảm cỏ xanh dịu, lối đi đá sỏi mộc mạc, mương nước phù sa uốn lượn có gợn sóng lăn tăn, lòng ao cá xanh ngọc viền đá cuội).
2. **`apps/web/src/art/farm-props.ts`**:
   - `paintFarmGate()`: Cổng tre Nam Bộ và biển chỉ dẫn lối về thị trấn.
   - `paintFarmPlots(state, cropId, stage)`: Vẽ từng trạng thái ô đất (Khóa, Khô, Ướt, Cây theo từng nấc sinh trưởng, Trái chín lấp lánh hiệu ứng ánh sáng).
   - `paintCoopsAndBarns()`: 4 cụm chuồng trại riêng biệt với rào tre, mái lá dừa, máng ăn và bãi bùn ẩm ướt.
   - `paintFarmAnimals(type, frame)`: Gà ri, vịt xiêm, bò sữa, heo mọi, dê núi với hoạt ảnh động 2 khung hình chân thực.
   - `paintFarmWarehouse()`: Nhà kho Silo ngói âm dương, bao tải thóc, thùng gỗ, cân bàn cổ điển và bù nhìn rơm nón lá.
   - `paintFarmShop()`: Sạp gỗ ven đường râm mát dưới tán mít, NPC Bác Sáu áo bà ba quấn khăn rằn.
   - `paintFarmFishPond()`: Cầu khỉ tre, chòi lá câu cá, guồng nước quay tạo bọt oxy.

### 3.3 Âm Thanh Tổng Hợp Đồng Quê (`apps/web/src/lib/sound.ts`)
Bổ sung các âm thanh synthesizer đặc trưng miền quê không cần dùng file audio mp3/ogg ngoài:
- `farm_hoe`: Tiếng cuốc xới đất giòn giã (`[160, 220, 110]` Hz, noise/triangle).
- `farm_water`: Tiếng tưới nước róc rách sủi bọt (`[380, 520, 310]` Hz, sine/triangle).
- `farm_plant`: Tiếng gieo hạt nhẹ nhàng (`[520, 680]` Hz, pop).
- `farm_harvest`: Tiếng chuông gặt hái lấp lánh mừng bội thu (`[523, 659, 784, 1046, 1318]` Hz, arpeggio).
- `farm_rooster`: Tiếng gà gáy rộn rã bình minh (`[600, 750, 900, 700]` Hz).

---

## 4. Bảng So Sánh & Đánh Giá Rủi Ro Triển Khai

| Tiêu Chí | Thiết Kế Đề Xuất | Khả Năng Tương Thích & Giảm Thiểu Rủi Ro |
|:---|:---|:---|
| **Hiệu Năng Render** | Pure Canvas 2D + Texture Cache | Toàn bộ texture được vẽ một lần qua Canvas rồi cache vào Phaser Texture Manager (`this.textures.addCanvas`). Tỷ lệ khung hình duy trì 60fps mượt mà trên cả máy cấu hình thấp. |
| **Bảo Vệ Tính Toàn Vẹn Dữ Liệu** | Server-Authoritative 100% | Mọi giao dịch Coin, mở khóa đất, chu kỳ sinh trưởng cây trồng đều do server tính toán và có idempotency key; client chỉ đóng vai trò hiển thị trực quan. |
| **Phân Quyền Khách / Chủ Trại** | Kiểm tra quyền kép (Server + Colyseus) | Chủ nhà ra vào tự do; khách cần mật khẩu hợp lệ. Hành động thu hoạch của khách bị chặn triệt để tại cấp độ API và Colyseus. |
| **Chuyển Cảnh Mượt Mà** | Tích hợp State Machine `roomKind` | Tái sử dụng cơ chế room transfer đã được kiểm chứng của `TownScene` -> `ApartmentScene`, loại bỏ hoàn toàn lỗi rò rỉ bộ nhớ hoặc xung đột Phaser display list. |
| **Tuân Thủ Quality Gate** | Tương thích TypeScript 100% | Đảm bảo `pnpm typecheck`, `pnpm lint`, `pnpm test` đạt 100% không có cảnh báo hay lỗi kiểu dữ liệu. |

---

## 5. Kết Luận & Khuyến Nghị Cho Nhóm Triển Khai

1. **Về Gói Dữ Liệu `@cozy/game-data`**:
   - Cần bổ sung khai báo `FARM_COLS = 48`, `FARM_ROWS = 32`, `FARM_SPAWN`, `FARM_BLOCKERS`, và `ZoneId = 'farm_gate'` trong `packages/game-data/src/map.ts`.
   - Cập nhật test `packages/game-data/src/town-layout.test.ts` để bảo đảm `farm_gate` có đường đi liên tục từ điểm `SPAWN` chính.
2. **Về Phaser Scenes (`apps/web/src/game/`)**:
   - Hiện thực hóa `FarmScene` kế thừa `WorldScene` trong `apps/web/src/game/scenes.ts`.
   - Đăng ký `FarmScene` trong `GameCanvas.tsx`.
3. **Về Đồ Họa Pure Canvas (`apps/web/src/art/`)**:
   - Tạo mới `farm-landscape.ts` và `farm-props.ts` theo đúng bảng màu và thiết kế Nam Bộ đã đặc tả.
4. **Về Mạng & Giao Tiếp (`apps/web/src/game/net.ts`)**:
   - Bổ sung target `'farm'` trong `Net` class với phương thức `goFarm()`.
5. **Về Giao Diện React (`apps/web/src/screens/`)**:
   - Tạo mới `FarmPasswordModal.tsx`, `FarmPlotModal.tsx`, `FarmSiloPanel.tsx`, `FarmShopPanel.tsx`.
   - Tích hợp các panel vào `screens/Game.tsx` và ánh xạ `ZONE_ACTIONS.farm_gate`.
