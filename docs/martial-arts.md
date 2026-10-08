# Đại hội Võ thuật

Đi qua cổng chùa Bửu Long ở phía đông thị trấn, hoặc nhấn E tại cổng,
để vào võ đường. Lối đi đá nối cổng với đường chính. Lối ra nằm phía nam
sân; nút Về thị trấn cũng đưa người chơi về trước cổng.

Võ sư ở phía trái sân dạy miễn phí Kiếm khí, Liên hoa kiếm và Kim chung
tráo, Tam kiếm quyết, Vạn kiếm trận, Ảnh bộ và Hồi nguyên. Trảm phong có sẵn.
Đến gần võ sư, nhấn E rồi chọn Học chiêu.
Mộc nhân bên phải sân dùng để luyện hướng kiếm và hiệu ứng.

WASD / phím mũi tên di chuyển và hướng kiếm. Phím 1–8 lần lượt sử dụng
Trảm phong, Kiếm khí, Liên hoa kiếm, Kim chung tráo, Tam kiếm quyết,
Vạn kiếm trận, Ảnh bộ và Hồi nguyên. E mở bảng võ đường;
Esc đóng bảng; Q và Enter tiếp tục dùng cho biểu cảm và chat.

Mời một người đang có mặt trong võ đường và chờ họ nhận lời. Lời mời hết
hạn sau 20 giây. Mỗi võ đường có một sân đấu với 3 giây chuẩn bị và 120
giây thi đấu. Hết thời gian, người nhiều thể lực hơn thắng; bằng nhau là
hòa. Rời sân hoặc mất kết nối trong trận bị xử thua. Thể lực hồi đầy sau
trận; không mất tiền hay vật phẩm. Khán giả không gây sát thương cho võ sĩ.

Vũ khí được nạp từ tài khoản Hang Ngọc qua API nội bộ. Sát thương PvP cơ
bản: kiếm tập sự 12, kiếm sắt 16, kiếm tinh thể 20. Server kiểm tra tầm,
hướng, thời gian báo chiêu, hồi chiêu, nội lực và chiêu đã học. Vùng báo
chiêu cố định tại vị trí thi triển; đối thủ có thể di chuyển để né.
Kim chung tráo giảm 75% sát thương trong một giây.

Bảng hạng dùng Elo khởi điểm 1000, hệ số K=32, lưu chung trong Redis và
làm mới mỗi 10 giây. Cùng cặp chỉ tính một kết quả mỗi 10 phút. Kết quả
được cập nhật nguyên tử và chống lặp theo mã trận; lưu lỗi sẽ được thử
lại trong lúc tiến trình realtime còn hoạt động. Chiêu đã học lưu theo
tài khoản trong Redis. Cần giữ volume Redis để giữ dữ liệu qua lần khởi động.

## Kiểm tra

- `pnpm --filter @cozy/realtime test`: kiểm tra chấp thuận, hết hạn lời
  mời, hồi chiêu, nội lực, né đòn, phòng thủ, học chiêu, thoát trận và vé vào.
- `pnpm --filter @cozy/realtime exec tsx scripts/martial-smoke.ts`: hai
  client WebSocket thật, Redis thật, sát thương và animation broadcast,
  Elo và hạn chế đấu lặp. Mặc định Redis tại 127.0.0.1:6379; có thể đặt
  MARTIAL_TEST_REDIS_URL. Dùng namespace riêng và xóa dữ liệu thử sau khi chạy.
  API xác thực/vũ khí dùng dữ liệu cố định trong bài smoke này.
- `pnpm --filter @cozy/web exec playwright test e2e/martial.spec.ts`:
  kiểm tra hình ảnh, phím kỹ năng, focus dialog và bốn kích thước màn hình
  bằng fixture. Cần Vite tại 127.0.0.1:5173.

Ảnh kiểm tra: output/martial-hall-verified.png.
