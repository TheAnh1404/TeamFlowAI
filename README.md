# TeamFlow AI

Dự án nhóm TV1/TV2/TV3 tham gia **DevDay Exchange Community: Da Nang City**, hỗ trợ nhóm nhỏ lập kế hoạch, theo dõi và nghiệm thu công việc bằng ba agent.

## Hiện trạng

Tại thời điểm soạn bộ tài liệu, repository chỉ có file prompt đầu vào, chưa có mã ứng dụng, manifest dependency, database hay script chạy. Bộ tài liệu này là kế hoạch cho **phiên triển khai 240 phút sau**, không phải báo cáo sản phẩm hoàn thành.

- Hiện có: tài liệu quy tắc, contracts thiết kế, nhiệm vụ, timeline và kịch bản demo.
- Stack frontend/backend/database, cơ chế session cụ thể, nhà cung cấp/model AI và môi trường chạy: **chưa chốt**.
- Setup/run: **chưa triển khai**; chưa có lệnh được xác minh từ repository để hướng dẫn chạy ứng dụng. Không suy ra lệnh cài đặt hoặc build.
- Mọi module, API, entity và JSON được mô tả bên dưới là **đặc tả dự kiến**, chưa có triển khai. Không có tuyên bố build/test pass.

## Sản phẩm dự kiến

| Agent | Vai trò |
|---|---|
| Planner | Thu thập mục tiêu, đầu ra, thành viên, kỹ năng, giờ khả dụng, deadline; đề xuất kế hoạch/task để trưởng nhóm sửa và duyệt trước khi công bố. |
| Reviewer | Đối chiếu bài nộp với từng tiêu chí; chỉ ra bằng chứng, thiếu sót và hướng chỉnh sửa. |
| Coordinator | Nhận cập nhật chat, ghi tiến độ/trở ngại; tổng hợp báo cáo tuần. TV3 triển khai phần báo cáo để cân bằng khối lượng. |

MVP phiên sau gồm:

- Nhập dự án và thành viên; AI tạo kế hoạch nháp, sửa trực tiếp, trưởng nhóm duyệt/công bố task.
- Bảng task dạng danh sách; chat trong ứng dụng gắn đúng task, hỏi lại khi mơ hồ.
- Nộp văn bản/Markdown/đoạn mã, review theo tiêu chí, sửa và nộp lại; con người nghiệm thu hoàn thành.
- Báo cáo tuần tạo **bằng nút**, dựa trên dữ liệu đã lưu và có nguồn. Đây chưa phải tự động chạy theo lịch.
- Lưu dữ liệu phía server để vẫn còn sau khi tải lại trang.

Để sau: Google Calendar/Meet thật, OAuth Google, bot ngoài ứng dụng, đọc link/repository/tệp, scheduler, kéo thả Kanban, đa workspace, tự đổi deadline và tái lập kế hoạch phức tạp.

## Phân công và mốc bàn giao

| Thành viên | Sở hữu UI + API + logic | Đầu mối dùng chung |
|---|---|---|
| TV1 | Nhập dự án/thành viên, Planner, sửa nháp, duyệt/công bố chống trùng | Layout, điều hướng, UI cơ bản |
| TV2 | Bảng task, chat, Coordinator cập nhật/trở ngại; DB/session/quyền server | Database, migration/seed, contracts và tích hợp |
| TV3 | Lớp AI, nộp bài, Reviewer, nộp lại, nghiệm thu, báo cáo | AI dùng chung; backend tính số liệu, AI tóm tắt có nguồn |

Phút 90: từng luồng thao tác độc lập được với dữ liệu mẫu cùng contract. Phút 135: vòng chính dùng chung project/task thật và dữ liệu lưu thật. Từ phút 180 ngừng thêm tính năng, giữ 60 phút cuối cho ổn định và demo.

## Tài liệu

- [AGENTS — hướng dẫn Codex](AGENTS.md)
- [Quy tắc dự án và ownership](docs/PROJECT_RULES.md)
- [Contracts thiết kế](docs/CONTRACTS.md)
- [TV1 — Planning](docs/tasks/TV1_PLANNING.md)
- [TV2 — Tracking](docs/tasks/TV2_TRACKING.md)
- [TV3 — Delivery](docs/tasks/TV3_DELIVERY.md)
- [Timeline 4 giờ](docs/TIMELINE_4H.md)
- [Bắt đầu phiên triển khai — ba prompt](docs/START_HERE.md)
- [Checklist demo 3–4 phút](docs/DEMO_CHECKLIST.md)

Các checklist triển khai hiện đều chưa hoàn thành. Nhóm cần chốt stack, tài khoản demo/session, người nghiệm thu và cấu hình AI trong 30 phút đầu phiên triển khai; xem các quyết định cụ thể trong contracts.
