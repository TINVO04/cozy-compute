# Võ đường: cảnh và kiếm thuật

Phaser 3, nhìn từ trên nghiêng, bản đồ 960 × 720. Cảnh pixel được vẽ bằng
Canvas gốc, không dùng tài nguyên bên ngoài. Nền đá xám ngọc #959986, mái
xanh #344f50, gỗ #695449, áo võ sư #46817e, vàng #e8bd74. Ánh sáng trên trái;
nền sân ít tương phản để kiếm và người chơi đọc rõ.

Chọn võ sư Thanh Sơn làm mẫu tạo hình: sprite 48 × 64, chân cố định giữa
đáy, tóc búi trắng, râu dài, áo nhiều lớp, đai vàng, kiếm đeo lưng. Hai đệ
tử giữ cùng tỷ lệ, trang phục và bảng màu. Texture nearest, dùng lại
qua nhiều lần vào phòng; chuyển động thở chỉ co giãn 1.8%.

| Tài nguyên                                  | Nguồn              | Kích thước / trạng thái            | Va chạm                  |
| ------------------------------------------- | ------------------ | ---------------------------------- | ------------------------ |
| Sân, mái, hành lang, giá kiếm, bàn trà, tre | martial-hall.ts    | 960 × 720, tĩnh                    | MARTIAL_BLOCKERS         |
| Võ sư / đệ tử                               | martial-hall.ts    | 48 × 64, alpha, đứng / thở         | Võ sư dùng vật cản chung |
| Đèn lồng                                    | martial-hall.ts    | Đung đưa                           | Trang trí                |
| Phi kiếm / kiếm trận / tàn ảnh              | martial-effects.ts | Triệu hồi / tung chiêu / trúng đòn | Server kiểm tra riêng    |

Hiệu ứng dùng tối đa 48 slot tái sử dụng. Mỗi slot có một Graphics và một
Text; kết thúc sẽ ẩn, khi scene dừng sẽ giải phóng. Chế độ giảm chuyển động
bỏ xoay liên tục, tàn ảnh và giảm độ cao kiếm giáng.

Tám chiêu dùng phím 1–8: Trảm phong, Kiếm khí (lướt chém), Liên hoa kiếm,
Kim chung tráo, Tam kiếm quyết, Vạn kiếm trận, Ảnh bộ, Hồi nguyên. Võ sư
dạy miễn phí, lưu theo tài khoản. Ảnh bộ không gây sát thương; Hồi nguyên
hồi tối đa 24 thể lực. Lướt 240 ms, tối đa 132 đơn vị; server kiểm tra từng
đoạn nhỏ, dừng trước tường và biên sân, mỗi đòn chỉ trúng một lần.

Nguồn: mã nguyên bản tạo trong workspace cho dự án, không nhập asset bên
thứ ba. Kiểm tra bằng Playwright tại bốn kích thước màn hình, chạy cả tám
animation và kiểm tra pool trở về trạng thái nghỉ. Ảnh ở output/martial-hall-v2.png,
output/martial-spin-summon.png và output/martial-rain-summon.png.
