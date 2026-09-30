# Chạy game trên máy Windows bằng .bat

Game chạy trực tiếp bằng Node.js, PostgreSQL và Redis trên Windows. Caddy phục vụ web đã build và chuyển API/WebSocket; dịch vụ Cloudflared có sẵn đưa `https://play.devtizo.vip` tới Caddy. Không cần Docker để chạy game. CI trên GitHub vẫn dùng container tạm để kiểm thử.

## Thư mục và dữ liệu

- Checkout: `D:/Game_Cua_Bao`, dùng để sửa code. `start-game.bat` vẫn chạy bản dev.
- Production: `D:/CozyGameProduction`, chứa `.env`, `bin`, `releases`, `logs`, `redis`, `backups`, `runtime.json`. Thư mục chỉ cấp quyền cho tài khoản chạy server, Administrators và SYSTEM.
- Setup tạo role/database `cozy_game_prod` trong PostgreSQL 17 hiện tại, sao chép dữ liệu game sau khi backup; database dev vẫn giữ nguyên. Production còn phụ thuộc cluster `infra/postgres/local_data`, không xóa hoặc di chuyển thư mục đó.
- Redis production dùng cổng `56380`, bind loopback và bật AOF; tách khỏi pubsub và positions của bản dev.
- API: `127.0.0.1:8788`; realtime: `127.0.0.1:2568`; proxy: `127.0.0.1:8082`; supervisor: `127.0.0.1:8083`, yêu cầu control secret.

## Thiết lập lần đầu

Cần Node.js >=22, pnpm 10.33.0, Git, PostgreSQL 17 và Redis Windows đang cài. Setup tải Caddy 2.11.4 từ release chính thức và xác minh SHA-256.

```powershell
$env:COZY_DEPLOY_DIR = 'D:/CozyGameProduction'
$env:COZY_REDIS_EXECUTABLE = (Get-Process redis-server | Select-Object -First 1 -ExpandProperty Path)
node infra/deploy/windows-setup.mjs
```

Setup lấy email admin thật và cấu hình gateway từ `.env` dev, tạo password PostgreSQL cùng hai secret riêng. Không chạy lại setup khi `.env` production đã tồn tại. Nếu setup bị ngắt sau khi tạo database, giữ backup và xử lý phần restore; script không xóa hay ghi đè database có sẵn.

Để kiểm tra bản chưa commit trên máy, chạy `node infra/deploy/windows-deploy.mjs --local`. Mỗi lần tạo release riêng, có hậu tố `-local-<timestamp>`. Trạng thái chỉ ghi vào `local-deployment.json`; lệnh này không xác nhận domain công khai hoặc bật AUTO_DEPLOY.

## Kết nối domain

Trong Cloudflare, chọn đúng account chứa `devtizo.vip` và Tunnel đang chạy trên Windows. Thêm **Published application route / Public hostname**:

| Trường    | Giá trị          |
| --------- | ---------------- |
| Subdomain | `play`           |
| Domain    | `devtizo.vip`    |
| Type      | `HTTP`           |
| URL       | `127.0.0.1:8082` |

Địa chỉ này dành cho Cloudflared chạy trực tiếp trên Windows. Không dùng `caddy:80` của cấu hình Docker. Giữ nguyên các route khác. Kiểm tra record có sẵn trước khi thay thế. Không mở port router. Cloudflare phải cho phép WebSocket, không cache API/matchmaking/version, và không chèn challenge vào các endpoint này.

## Chạy và cập nhật

| File                    | Chức năng                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `start-production.bat`  | Bật supervisor và release đã chọn; tự khởi động lại API, realtime, Caddy, Redis khi lỗi   |
| `stop-production.bat`   | Dừng các tiến trình do supervisor sở hữu; giữ PostgreSQL dùng chung                       |
| `deploy-production.bat` | Build commit sạch vào release mới, backup database, chuyển phiên bản, kiểm tra qua domain |

Deploy production cần code đã commit và checkout sạch. Không sửa trực tiếp release đang chạy. Nếu release mới lỗi, script kích hoạt lại release đã chạy trước đó; migration database không tự đảo ngược. Backup nằm ngoài release. Người chơi có thể mất kết nối khi đổi phiên bản và cần tải lại web.

Chạy lại deploy của commit đã thành công sẽ kiểm tra/kích hoạt release đó và xác minh domain, không build lại hoặc tạo thêm migration.

Sau lần deploy đầu tiên, có thể cài task tự bật khi đăng nhập Windows và backup mỗi ngày lúc 03:00:

```powershell
powershell -NoProfile -File infra/deploy/windows-tasks.ps1
```

Task chạy khi tài khoản server đang đăng nhập. Nó không bảo đảm game chạy trước màn hình đăng nhập sau reboot. Máy cần luôn bật, không sleep và có mạng. Logs nằm trong thư mục production; cần theo dõi dung lượng và sao chép backup sang thiết bị khác.

## GitHub Actions

Cài self-hosted runner Windows riêng ngoài checkout và production, label `cozy-production`, dưới cùng tài khoản đã có quyền đọc `.env` và chạy Node/pnpm. Đặt repo Variables:

Có thể cài runner bằng `node infra/deploy/windows-runner-setup.mjs` khi `gh` đã đăng nhập repo, rồi chạy `powershell -NoProfile -File infra/deploy/windows-runner-task.ps1`. Runner nằm ở `D:/CozyGameRunner`, xác minh checksum bản tải xuống và chạy bằng task tự bật khi đăng nhập. Token đăng ký không được in ra hoặc lưu trong script.

| Variable           | Giá trị                                                       |
| ------------------ | ------------------------------------------------------------- |
| `COZY_DEPLOY_DIR`  | `D:/CozyGameProduction`                                       |
| `COZY_DEPLOY_MODE` | `windows-native`                                              |
| `AUTO_DEPLOY`      | `true` sau khi domain và deploy commit đã kiểm tra thành công |

CI format/lint/typecheck/test, build và browser vẫn chạy trên runner GitHub. Chỉ push vào `master` đã pass CI được triển khai trên máy server. PR không chạy trên máy giữ dữ liệu và credentials. Khi runner offline, job deploy chờ. Đặt `AUTO_DEPLOY=false` để tạm dừng.

## AI gateway

Gameplay không yêu cầu LiteLLM để readiness thành công; `/api/readyz` báo riêng `checks.gateway`. Nếu gateway chưa chạy, việc phát virtual key và gọi model AI chưa hoạt động. Không dùng mock upstream để thay thế production. Cài/chạy LiteLLM thật trên server với database và credentials riêng trước khi cấu hình model cho người chơi. Proxy chỉ public `/v1/*`; master key và provider key ở phía server.
