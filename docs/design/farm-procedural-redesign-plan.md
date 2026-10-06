# Kế Hoạch Quy Hoạch & Tái Thiết Kế Bản Đồ Nông Trại (Cozy Farm Procedural Redesign Plan)

## 1. Mục tiêu & Nguyên tắc

- **Bám sát 100% hình ảnh map gốc (`apps/web/public/farm/farm_background.jpg`)**:
  - Giữ trọn vẹn bố cục không gian, hình khối các công trình (Tiệm Bác Sáu, Kho Silo, Ao cá, 3 chuồng trại, Giếng đá, Cây sồi, Cổng vào, 36 ô đất).
- **Loại bỏ hoàn toàn ảnh JPG nén mờ**:
  - Vẽ thủ tục bằng Canvas TypeScript (`imageSmoothingEnabled = false`), giữ pixel art sắc nét ở độ phân giải $1536 \times 1024$ ($48 \times 32$ tiles).
- **Phân lớp chiều sâu (Depth Sorting)**:
  - Tất cả công trình, chuồng trại, cây cối là đối tượng độc lập có `setDepth(y + h)` để nhân vật đi trước và sau tự nhiên.
- **Khớp chuẩn 100% Collision (`FARM_BLOCKERS`)**:
  - Căn chỉnh hitbox va chạm khớp từng pixel với chân đế công trình và hàng rào.
  - Lối đi chính và hành lang nội bộ luôn rộng $\ge 64\text{px} - 96\text{px}$ (2-3 tiles), không bị kẹt.

---

## 2. Bảng Phân Chia Giai Đoạn Thực Hiện

- **Giai đoạn 1**: Nền địa hình (`farm-landscape.ts`) bám sát ảnh gốc (cỏ pasture, mạng lưới đường mòn đất cát vàng uốn lượn, bờ đá phân tầng, cổng Tây Bắc, bỏ nạp JPG).
- **Giai đoạn 2**: Tiệm Nông Nghiệp Bác Sáu (`paintShopBacSau`) & Nhà Kho Nông Sản Silo (`paintSiloWarehouse`) với đầy đủ chi tiết pixel và depth-sorting.
- **Giai đoạn 3**: Cụm 3 Chuồng Trại Chăn Nuôi (Gia cầm, Heo mọi, Dê/Bò) & Khu Trái Tim Nông Trại (Cây sồi cổ thụ, giếng đá, ghế nghỉ, bảng tin).
- **Giai đoạn 4**: Ao Thủy Sản & Cầu Tàu Câu Cá + Khu 36 Ô Đất Trồng Trọt & Cập nhật toàn bộ `FARM_BLOCKERS` trong `packages/game-data/src/map.ts`.
- **Giai đoạn 5**: Kiểm thử chất lượng toàn diện (Typecheck, Lint, Test, Build, Screenshot Verification).
