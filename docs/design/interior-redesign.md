# VietProDev và phòng thực hành DNTU

Hai phòng dùng pixel art vẽ bằng Canvas trong mã nguồn, cùng phong cách với thị trấn và căn hộ. Texture nền được tạo một lần rồi dùng lại khi chuyển cảnh; không tải thêm thư viện hay ảnh bên ngoài.

## VietProDev

Studio lập trình với sàn gỗ sồi, tường kem, xanh sage và hai cụm bàn làm việc. Tường sau có lam gỗ, biển VietProDev, bảng sprint, tủ server và quầy cà phê. Cửa sổ, đèn tường, cây xanh, bàn phím, cốc cà phê và sách tạo cảm giác một nơi làm việc có người sử dụng. Nhân viên giữ tên, vai trò và lời thoại hiện có.

![Văn phòng VietProDev ở 1280×720](company-preview.png)

## Đại học Công nghệ Đồng Nai

Khôi phục khuôn viên ngoài trời 48×32 ô từ commit `c7083e9` trong PR #2 (`feat/bida-cybernet-activities`). Khuôn viên được thêm ở `38e320e`, sau đó bị thay bằng phòng học 16×11 ô khi nhánh merge master tại `24b5134`. Bản khôi phục gồm 15 công trình: các cánh Khu A, Khu B, thư viện Khu C, Smart Labs và Gym Khu G, xưởng Khu F, ký túc xá–căng tin, khu khởi nghiệp, tuyển sinh, hai cổng và trạm xe buýt. Sân thể thao, công viên, cây xanh, đài phun, ghế đá và sáu NPC được giữ lại.

![Toàn cảnh khuôn viên DNTU ở 1536×1024](university-preview.png)

## Di chuyển và tương tác

Văn phòng giữ kích thước 16×11 ô; khuôn viên DNTU rộng 48×32 ô. Va chạm và kích thước khuôn viên trong game-data được dùng chung cho realtime và dự đoán di chuyển phía client. Người chơi xuất hiện gần cổng chính, đi qua cổng vòm để vào sân trung tâm và các đường nối giữa các khu. Camera theo người chơi, có giới hạn theo bản đồ. Điểm tương tác được đặt trước công trình để bàn phím tiếp cận được; Minh Khang đứng trên đường giữa Khu B và thư viện.

Dùng WASD hoặc mũi tên để đi, E để tương tác gần nhất, Esc để đóng hội thoại. Các NPC, thư viện, sân thể thao, trường quay, vườn khởi nghiệp, căng tin, Smart Labs, Gym, xưởng ô tô, phòng CNC và cổng vòm có thông tin riêng. Nhãn gợi ý E hiện khi đến gần; đi ra Cổng 1 hoặc Cổng 2 phía Đông để về thị trấn. Vùng thoát giả ở tọa độ phòng học cũ đã được bỏ. Tắt chuyển động theo cài đặt giảm chuyển động.

Văn phòng hiển thị trọn phòng; khuôn viên lớn dùng camera theo người chơi. Ảnh toàn cảnh là chế độ xem kiểm tra riêng, không phải mức phóng bắt buộc khi chơi.

## Xem và kiểm tra

Chạy Vite rồi mở `/e2e/fixtures/interiors.html` để xem cảnh thật trong trình duyệt. Fixture này chỉ kiểm tra hiển thị và tương tác cục bộ, không kết nối multiplayer.

Thêm `?room=university` vào URL để mở thẳng trường DNTU.

```powershell
pnpm --filter @cozy/web dev
pnpm --filter @cozy/web exec playwright test e2e/interior-render.spec.ts
$env:E2E_SHOTS_DIR = 'D:/Game_Cua_Bao/docs/design'
node apps/web/e2e/interior-preview.mjs
```

Kiểm tra văn phòng trong `packages/game-data/src/interior-layout.test.ts` và `apps/web/e2e/interior-render.spec.ts`. Kiểm tra khuôn viên, đường đi qua cổng vòm, tương tác bàn phím và cổng ra trong `packages/game-data/src/campus-layout.test.ts` và `apps/web/e2e/campus.spec.ts`. Cần cập nhật web và realtime cùng phiên bản để thống nhất kích thước và va chạm khuôn viên.
