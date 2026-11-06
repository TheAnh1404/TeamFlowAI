# Quy tắc dự án và phối hợp

## Phạm vi phiên

Phiên hiện tại chỉ tạo/cập nhật 10 tài liệu: [AGENTS](../AGENTS.md), [README](../README.md), file này, [CONTRACTS](CONTRACTS.md), ba file [TV1](tasks/TV1_PLANNING.md)/[TV2](tasks/TV2_TRACKING.md)/[TV3](tasks/TV3_DELIVERY.md), [TIMELINE_4H](TIMELINE_4H.md), [START_HERE](START_HERE.md), [DEMO_CHECKLIST](DEMO_CHECKLIST.md). Không viết mã/cấu hình/schema/migration/seed/test/workflow, cài đặt, gọi API ngoài, chạy ứng dụng/build/test hay thao tác commit/push/nhánh/remote. Không sửa file prompt có sẵn. Các việc triển khai dưới đây dành cho phiên sau có prompt triển khai rõ ràng.

Hiện chưa có ứng dụng; stack **chưa chốt**. Tất cả đường dẫn mã dưới đây là **dự kiến**, có thể ánh xạ theo stack được nhóm chốt; không phải file đã tồn tại. Không phải tạo thêm tài liệu ngoài danh sách trong phiên này.

## Ownership theo luồng

| Phần | Đầu mối | Bên sử dụng/phối hợp | Ranh giới |
|---|---|---|---|
| `src/features/planning/` (dự kiến), API project/member/plan/publish | TV1 | TV2, TV3 nhận Task đã công bố | TV1 làm cả UI + API + logic; dùng lớp dữ liệu/quyền TV2 và AI TV3 |
| `src/features/tracking/` (dự kiến), API task/chat/progress | TV2 | TV1/TV3 | TV2 xử lý đúng task/đúng quyền, không tự sửa kế hoạch |
| `src/features/delivery/`, `src/features/reports/` (dự kiến), API submission/review/accept/report | TV3 | TV2 cung cấp dữ liệu | Báo cáo là chức năng Coordinator về sản phẩm |
| `src/ui/`, layout/điều hướng và entry giao diện (dự kiến) | TV1 | TV2/TV3 gắn màn hình của mình | TV2/TV3 gửi điểm gắn và props; tránh cùng sửa layout |
| `db/`, migration/seed, `src/server/data/`, `src/server/session/` (dự kiến) | TV2 | TV1/TV3 tự triển khai API của mình | TV2 điều phối mọi thay đổi schema/migration; cung cấp truy vấn/transaction và helper quyền |
| `src/server/ai/` (dự kiến) | TV3 | TV1 Planner, TV2 Coordinator | TV3 giữ wrapper, output validation, timeout/lỗi; mỗi luồng giữ nghiệp vụ của mình |
| [CONTRACTS](CONTRACTS.md), type/validator dùng chung sau khi chốt stack | TV2 | TV1/TV3 cùng xác nhận phần sử dụng | Một nguồn tên field/enum/API, thay đổi được thông báo |
| Manifest/lockfile, cấu hình khởi động dùng chung (chỉ phiên triển khai) | TV2 | TV1/TV3 thống nhất nhu cầu | Một người áp dụng dependency/cấu hình chung, không cài đồng thời gây xung đột |

Mỗi shared file cụ thể có đúng một đầu mối theo nhóm trên. Nếu file mới nằm ngoài bảng, gán đầu mối trước khi cùng sửa. Đầu mối không có nghĩa phải viết thay toàn bộ phần việc của người khác.

## Nhánh, dependency và tích hợp dự kiến

- Nhánh đề xuất: TV1 `feat/planning`, TV2 `feat/tracking`, TV3 `feat/delivery`. Đây chỉ là hướng dẫn; phiên tài liệu không tạo nhánh. Khi triển khai, dùng checkout/thư mục làm việc riêng nếu làm song song, tránh ba người đổi nhánh trên cùng thư mục.
- 0–30 phút: cùng chốt contracts và stack; TV1 công bố điểm gắn UI, TV2 công bố interface data/session/quyền và ID mẫu, TV3 công bố interface AI. TV2 điều phối manifest, schema và thứ tự migration; không chạy ba migration độc lập rồi mới ghép.
- 30–90 phút: mỗi người làm luồng riêng; UI/AI dùng dữ liệu mẫu cùng contract khi backend/AI thật chưa sẵn. Giữ ID liên kết giống ví dụ contracts; đánh dấu chế độ mock rõ ràng. Không dùng localStorage thay cho mục tiêu lưu dữ liệu server của checkpoint 135.
- 90–135 phút: TV2 điều phối vòng tích hợp; TV1 cung cấp project/member/plan/task đã publish, TV2 nối task/chat/progress, TV3 nối submission/review/report. Cùng xác minh session, quyền và lưu sau reload.
- Thay đổi tương thích, ví dụ thêm field tùy chọn có mặc định, được thực hiện trong phạm vi sở hữu rồi báo người dùng contract, không cần quy trình xin phép rườm rà. Tránh sửa trực tiếp shared file của người khác khi chưa phối hợp.
- Đổi tên field, bỏ enum, đổi ý nghĩa quyền/trạng thái/response là thay đổi phá vỡ: thống nhất với đầu mối và các bên sử dụng trước, cập nhật contracts cùng adapter/caller trong một lượt tích hợp. Schema/migration kể cả tương thích vẫn do TV2 điều phối để tránh xung đột.
- Bàn giao ngắn: phần đã chạy được; interface/shared file thay đổi; checks thực sự đã chạy và kết quả; phần thiếu/mock; dependency và người nhận tiếp theo. Không báo “xong” dựa trên UI mẫu.

## Bất biến nghiệp vụ

1. Plan `draft` chỉ chứa task nháp; sau khi trưởng nhóm duyệt, server mới tạo Task chính thức trong một transaction và chuyển `published`. Retry không sinh task trùng.
2. Session do server xác minh; quyền dựa trên ProjectMember đã lưu. Không nhận role/userId do client tự khai làm căn cứ cấp quyền. Chọn member ở UI demo chỉ hợp lệ khi server thiết lập session qua cơ chế demo đã chốt, không phải gửi tùy ý một ID vào API nghiệp vụ.
3. Chat cần task đã xác định và đúng quyền trước khi cập nhật. Thiếu/nghi ngờ task hoặc trạng thái thì hỏi lại, chưa đổi Task/ProgressUpdate. Không tự đổi assignee, deadline, criteria; không tự ghi `done`.
4. Không suy “gần xong” thành phần trăm. MVP không có field phần trăm. Thiếu cập nhật nghĩa là “chưa có cập nhật trong kỳ”, không kết luận không làm việc.
5. Review từng criterion phải có evidence liên quan; thiếu dữ liệu dùng `insufficient_evidence`. AI chỉ tư vấn; trưởng nhóm hoặc member có quyền nghiệm thu xác nhận hoàn thành. Bài nộp/chat không được ghi đè chỉ dẫn agent, quyền hoặc công cụ.
6. Báo cáo được người dùng bấm nút; backend tính số liệu và đúng/trễ hạn từ dữ liệu đã lưu, AI chỉ tóm tắt có nguồn. Tách `submittedAt` và `acceptedAt`, không nói nộp trễ chỉ vì nghiệm thu trễ. Khoảng kỳ, mốc chụp dữ liệu và nguồn phải hiển thị.
7. API key ở server, không đưa secret vào Git, log hoặc response. AI lỗi không để lại cập nhật nghiệp vụ nửa chừng; hiển thị lỗi và cho retry. Dữ liệu mẫu, mock AI và AI thật phải được phân biệt.

## Quyết định cần chốt trong 30 phút đầu phiên sau

Stack/runtime/database/lưu bền; cơ chế session và ba tài khoản demo phía server; leader và `canAccept`; provider/model AI, biến môi trường phía server và giới hạn timeout; mapping đường dẫn dự kiến vào mã; lệnh setup/check thực sự có trong repo sau triển khai. TV2 ghi quyết định contracts/dữ liệu, TV1 xác nhận UI, TV3 xác nhận AI. Không tự gọi stack dự kiến là hiện có.

Giữ MVP và các phần để sau như [README](../README.md). Khi trễ, theo [timeline](TIMELINE_4H.md): bỏ trang trí/tùy chọn trước, không cắt quyền, lưu dữ liệu, duyệt kế hoạch, làm rõ task hay độ trung thực của báo cáo.
