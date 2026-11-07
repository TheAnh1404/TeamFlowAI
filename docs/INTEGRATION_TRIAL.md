# Bản ghép thử TV1 + TV2 + TV3

> Đang nâng cấp backend theo [BACKEND_UPGRADE](BACKEND_UPGRADE.md). Delivery runtime đã thay bộ nhớ tạm bằng DB chung; phần giới hạn phía dưới ghi lại trạng thái tại phiên ghép ban đầu. Cấu hình Neon thật vẫn chưa có để kiểm chứng bên ngoài.

Nhánh cục bộ: `codex/integration-tv1-tv2-tv3`.

Nguồn đã ghép: `origin/main` và `origin/tv2_hung` (5d6f9ee), `origin/tv1_hung` (76a5106), `origin/tv3-quang` (466594b). Git merge không xung đột. Main và các nhánh thành viên không bị sửa.

## Chạy không cần Docker

Repo dùng Node.js 24.x, npm 11.x, Next.js và Neon PostgreSQL qua mạng. Hiện không có Dockerfile/Compose. Driver DB hiện chỉ nhận hostname Neon và dùng kết nối WebSocket; PostgreSQL trong Docker không thay Neon trực tiếp nếu chưa đổi driver/cấu hình.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000. Trang giới thiệu mở được khi chưa có DB; đăng nhập, tạo dự án và tracking cần Neon đã cấu hình. `npm ci` chỉ cần chạy khi cài mới hoặc lockfile thay đổi.

Tạo `.env.local` theo `.env.example`, điền `DATABASE_URL`, `DATABASE_DIRECT_URL`, bật `ENABLE_DEMO_AUTH=true` và đặt `DEMO_ACCESS_CODE` tối thiểu 16 ký tự. Không đưa giá trị thật vào Git/chat. TV2 chạy migration và seed trên DB đã thống nhất; phiên ghép thử không chạy migration lên DB chung.

Provider TV3 trả `aiMode: mock` khi không có API key. Nếu dùng AI thật, đặt `OPENAI_API_KEY`, `OPENAI_MODEL` và `AI_STRICT_REAL=true` để lỗi provider không tự chuyển thành mock. Các chế độ mock riêng của TV1/TV2 chỉ dùng khi chủ ý đặt `PLANNING_AI_MODE=mock` hoặc `TRACKING_AI_MODE=mock`.

## Điểm đã nối

- Shell TV1 bao các màn TV2/TV3.
- Planner TV1 gọi provider AI TV3 qua interface chung.
- P06 gắn DeliverySlot TV3 qua client adapter IntegratedWorkbench; callbacks refresh task/dirty form dùng interface TV2.
- Delivery dùng phiên server TV2; bỏ fallback nhận role từ header/query khi không đăng nhập. Không tự cấp quyền leader. Leader được hiển thị form nộp bài cho task của nhóm.

## Giới hạn cần xử lý trước demo toàn vòng

TV3 hiện dùng `InMemoryDeliveryRepository` với fixture p1/t1/s1. TV1/TV2 ghi dữ liệu thật vào Neon với ID server sinh. Vì vậy:

- Task mới từ Planner chưa đọc được trong repository delivery; nộp/review/nghiệm thu chưa chạy toàn vòng trên cùng dữ liệu.
- Báo cáo TV3 chưa lấy snapshot Neon của TV2 và dữ liệu trong bộ nhớ không bền sau restart.
- Cần TV3/TV2 nối DeliveryRepository với schema/transaction/mutation identity và readReportSnapshot hiện có. Kiểm lại quyền trên từng tài nguyên trước khi replay, version/revision và báo cáo trên snapshot chung. Không coi merge/build pass là kiểm chứng các bất biến này.
- UI P06 đã nối slot, nhưng API delivery còn dependency dữ liệu ở trên. Không dùng fixture ID để giả vờ đã tích hợp với task Neon.

Môi trường kiểm tra hiện chưa có DATABASE_URL, DATABASE_DIRECT_URL, OPENAI_API_KEY, ENABLE_DEMO_AUTH, DEMO_ACCESS_CODE. Không thể xác minh đăng nhập, lưu Neon và AI thật trong phiên này.

## Kết quả chạy thử

- `npm run check`, `npm run build`: đạt.
- `npm test`: 21/21 đạt. Có test tích hợp provider Planner TV3 → publish TV1 → task reader TV2 trên PGlite áp migration; không phải Neon.
- Chạy bản production tại `http://127.0.0.1:3000`: `/`, `/app`, `/app/projects/new` và `/api/health` trả 200. Các màn có quyền hiển thị hướng dẫn đăng nhập khi thiếu phiên; HTTP 200 của trang không đồng nghĩa DB đã sẵn sàng.
- `/api/session`, `/api/tasks/t1/submissions` và `/api/projects/p1/reports?demoRole=leader` trả 401 khi thiếu phiên. Tham số tự khai demoRole không cấp quyền.
- Edge mở trang giới thiệu thật ở desktop và 360px: không tràn ngang; ảnh cục bộ `.cache/planning-ui/integration-landing.png`.
