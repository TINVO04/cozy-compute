# Cozy Compute — Game Asset Style Guide (Style Lock)

> **Source of Truth** cho toàn bộ quy trình thiết kế và sinh tài nguyên đồ họa (AI Asset Generation Pipeline) của dự án Cozy Compute Social MMO. Mọi asset mới trước khi đưa vào game đều bắt buộc phải tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật trong tài liệu này.

---

## 1. Không gian & Tọa độ Thế giới (World Grid)

- **Tile / World Unit chuẩn:** Cố định **$32 \times 32\text{ px}$**.
- **Kích thước Map gốc:** $48\text{ cột} \times 32\text{ dòng} = 1536 \times 1024\text{ px}$.
- **Tương thích:** Đồng bộ 100% với hệ thống tọa độ `packages/game-data/src/map.ts` (`TILE = 32`), hệ thống camera, kích thước avatar người chơi và các sprite pack hiện có.

---

## 2. Góc nhìn & Phối cảnh (Camera & Perspective)

- **Chuẩn phối cảnh:** **Orthographic 3/4 Top-Down (Dimetric $30^\circ - 45^\circ$)**.
- **Quy tắc phối cảnh bất biến:**
  - **Phẳng hoàn toàn (Flat Projection):** Tuyệt đối **KHÔNG** có điểm tụ 3D (vanishing point), **KHÔNG** góc nghiêng camera tilt, **KHÔNG** hiệu ứng mắt cá (fish-eye).
  - Các đường thẳng đứng giữ nguyên trục $Y$ vuông góc.
  - Mặt trên của mái nhà, luống đất, bàn ghế nhìn thấy từ trên xuống với độ nghiêng nhẹ tự nhiên.

---

## 3. Độ phân giải, Viền nét & Điểm ảnh (Pixel Art Standards)

- **Pixel Density:** Điểm ảnh sắc nét (Sharp pixel clusters), dùng giải thuật **Nearest-Neighbor**, tỷ lệ điểm ảnh $1:1$ đồng nhất giữa tất cả các vật thể. Tuyệt đối không để xảy ra hiện tượng "pixel bleeding" (vật to pixel hạt to, vật nhỏ pixel mịn).
- **Edge Treatment (Viền):** 
  - Viền mỏng $1\text{px}$ màu tối hòa hợp với màu vật thể (colored dark outline, ví dụ viền nâu đậm cho gỗ, xanh lá đậm cho tán cây).
  - Hạn chế dùng viền đen thuần thô cứng (`#000000`) trừ khi cần phân tách rõ với nền quá sáng.

---

## 4. Quy chuẩn sinh ảnh AI (AI Generation Protocol)

Khi ra lệnh cho AI (Gemini Imagen 3, Stable Diffusion, FLUX, v.v.) sinh sprite riêng lẻ:

### 4.1 Nền Chroma Key bắt buộc
- **Màu nền:** Bắt buộc sử dụng nền đơn sắc **Magenta `#FF00FF`** hoặc **Green `#00FF00`**.
- **CẤM nền trắng (`#FFFFFF`):** Nền trắng sẽ làm các công cụ tách nền tự động xóa mất các chi tiết màu trắng tự nhiên của asset (áo trắng, lòng trắng mắt, hoa màu trắng, trứng, rèm cửa sổ).

### 4.2 Quy tắc bóng đổ mặt đất (NO Baked Ground Shadows)
- **CẤM bóng đổ mềm xuống đất:** Prompt bắt buộc phải có `"STRICTLY NO soft ground shadows, NO ambient occlusion, NO baked shadow on ground"`.
- **Lý do:** Bóng đổ mềm màu xám vẽ sẵn trên ảnh khi đặt lên nền cỏ hoặc bùn đất khác màu sẽ để lại quầng xám loang lổ rất bẩn.
- **Giải pháp:** Bóng đổ dưới chân vật thể trong game được render động bằng code (ellipse shadow) hoặc sprite bóng mờ bán trong suốt riêng biệt.

### 4.3 Công thức Prompt chuẩn cho AI Sprite
```text
Isolated 2D RPG pixel art asset of a [TÊN VẬT THỂ: ví dụ PRODUCE STALL / MANGO TREE / WOODEN FENCE],
Cozy Vietnamese rural farm aesthetic, Sprout Lands and Studio Ghibli inspired,
flat orthographic 3/4 top-down perspective, strictly NO 3D vanishing points, NO camera tilt,
clean sharp pixel clusters, 16-bit to 32-bit pixel art aesthetic,
solid magenta background (#FF00FF),
STRICTLY NO soft ground shadows, NO ambient occlusion, NO ground terrain blending.
```

---

## 5. Tỷ lệ & Kích thước Quy chuẩn (Integer Tile Budget)

Tất cả asset sau khi tách nền phải được căn chỉnh (snap) về đúng bội số nguyên của lưới $32\text{px}$:

| Nhóm đối tượng | Kích thước Tiles | Kích thước Pixel ($W \times H$) | Ví dụ thực tế |
|---|---|---|---|
| **Avatar / Nhân vật** | $1 \times 1$ | $32 \times 32\text{ px}$ | Người chơi, NPC nông dân, thương lái |
| **Cây nhỏ / Đèn / Tre** | $1 \times 2$ | $32 \times 64\text{ px}$ | Bụi tre, cột đèn đường, luồng chuối nhỏ |
| **Cây ăn trái vừa** | $2 \times 2$ | $64 \times 64\text{ px}$ | Cây ổi, chanh, bụi hoa lớn |
| **Cây lớn cổ thụ** | $2 \times 3$ hoặc $3 \times 3$ | $64 \times 96\text{ px}$ hoặc $96 \times 96\text{ px}$ | Cây xoài, dừa nước, cây đa đầu làng |
| **Kiosk / Quầy hàng** | $3 \times 3$ | $96 \times 96\text{ px}$ | Quầy trái cây, sạp báo, quầy nước mía |
| **Nhà nhỏ / Chòi nghỉ** | $3 \times 3$ hoặc $4 \times 3$ | $96 \times 96\text{ px}$ hoặc $128 \times 96\text{ px}$ | Chòi câu cá, trạm gác, chuồng gà |
| **Nhà lớn / Kho bãi** | $4 \times 4$ hoặc $5 \times 4$ | $128 \times 128\text{ px}$ hoặc $160 \times 128\text{ px}$ | Nhà cấp 4 mái ngói, kho thóc, chuồng bò |

---

## 6. Điểm Neo (Anchor Origin) & Sắp xếp Chiều sâu 2.5D (Depth Sorting)

Để nhân vật khi di chuyển có thể đi tự nhiên trước hoặc sau lưng các vật thể:

- **Anchor Origin:**
  - Đối với cấu trúc đứng (nhà, cây, hàng rào, cột đèn): Đặt tại **Bottom-Center `(0.5, 1.0)`**.
  - Đối với nền gạch/cỏ (Terrain, Road tiles): Đặt tại **Center `(0.5, 0.5)`** hoặc Top-Left `(0, 0)`.
- **Tách biệt Visual Bounds & Collision Footprint:**
  - `visualBounds`: Kích thước toàn bộ ảnh vẽ (ví dụ cây xoài $64 \times 96\text{ px}$).
  - `footprint`: Chỉ tính vùng chân đế cắm xuống đất (ví dụ gốc cây xoài chỉ chiếm $32 \times 32\text{ px}$ ở đáy).
- **Quy tắc Depth Sorting:**
  $$\text{depth} = Y_{\text{footprint}} + \text{depthOffset}$$
  Phần tán cây và mái nhà phía trên có độ sâu thấp hơn avatar khi avatar đi dưới chân, và cao hơn khi avatar đứng sau lưng.

---

## 7. Quy chuẩn Dynamic & Animated Assets

1. **Cây trồng (Crops):**
   - Phải thiết kế theo chuỗi 4 giai đoạn phát triển:
     1. `Stage 0 (Seed)`: Hạt giống / mầm đất ($32 \times 32$).
     2. `Stage 1 (Sprout)`: Cây con mới nhú ($32 \times 32$).
     3. `Stage 2 (Blooming)`: Cây ra hoa / phát triển ($32 \times 32$).
     4. `Stage 3 (Mature)`: Cây trĩu hạt / trái chín sẵn sàng thu hoạch ($32 \times 32$).
2. **Gia súc & Sinh vật (Animals):**
   - Bò vàng, gà tre, vịt cỏ, heo mọi:
   - Spritesheet 4 hướng di chuyển: `Down` (mặt trước), `Up` (lưng), `Left` (quay trái), `Right` (quay phải).
   - Tối thiểu: 2 frames cho `idle`, 4 frames cho `walk`.
3. **Terrain Autotiling (Đất, Nước, Đường):**
   - Thiết kế theo chuẩn **9-Slice / 16-Tile Bitmask**:
     - 1 tile Trung tâm (nội dung lấp đầy).
     - 4 tile Cạnh biên (Top, Bottom, Left, Right).
     - 4 tile Góc bo ngoài (Top-Left, Top-Right, Bottom-Left, Bottom-Right).
     - 4 tile Góc bo trong (Inner corners).
