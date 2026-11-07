# Bàn giao nâng cấp backend và trải nghiệm demo

Ngày kiểm chứng: 07/11/2026. Các thay đổi nằm trên working tree của `codex/integration-tv1-tv2-tv3`; chưa commit/push và chưa áp migration lên Neon chung.

## Quyết định sản phẩm đã xác nhận

- Cảnh báo khi đã sử dụng **ít nhất 80% thời gian dự án** và tiến độ nghiệm thu **không vượt 80%**. Khoảng thời gian tính từ Project.createdAt đến deadline; không đổi đồng hồ để giả cảnh báo.
- Mentor có tài khoản, được trưởng nhóm cấp/thu hồi quyền xem từng dự án và nhận thông báo trong ứng dụng.
- Tiến độ = số task `done` đã được người có quyền nghiệm thu / tổng task đã công bố. Không suy phần trăm từ chat. Chưa có task thì tiến độ chưa xác định, không tự coi là 0% rồi cảnh báo.
- Chế độ diễn tập cục bộ dùng dữ liệu lưu trên máy và AI mẫu có nhãn. Mặc định triển khai thông thường vẫn hỗ trợ Neon; AI thật cần cấu hình riêng.

## Đối chiếu năm yêu cầu

| Yêu cầu | Đã triển khai | Bằng chứng |
|---|---|---|
| Timeline nổi bật | Khối timeline ở đầu workspace, deadline, tiến độ nghiệm thu, mốc 80%, danh sách hạn công việc/phụ thuộc; trang mentor ưu tiên timeline trước phần mục tiêu dài | `project-timeline.tsx`, `supervision.ts`; browser fixture và ảnh production `workspace.png`, `mentor-mobile.png` |
| Demo ổn định | Delivery lưu DB chung, atomic mutation/replay, khóa version/revision, timeout AI, giữ bài nộp khi lỗi; local rehearsal lưu bền và khởi động lại được | `tests/delivery.test.ts`, `agent-policies.test.ts`, browser planning và rehearsal |
| Planner chi tiết | Hỏi rõ phạm vi/rủi ro/điều kiện thành công trước khi tạo; lưu câu trả lời trong mục tiêu; task có bước thực hiện, lý do phân công, ước lượng cần xác nhận và tiêu chí; mẫu chọn theo kỹ năng/khối lượng, cảnh báo quá khả dụng | `intake.ts`, `planner-mock.ts`, `planner.ts`, `planner-quality.test.ts`; wizard production trong rehearsal |
| Nhắc users/mentor | Grant mentor chỉ đọc, tài khoản MENTOR, notification theo người nhận, dấu đã đọc, thu hồi quyền, chống trùng; worker chạy độc lập tab | `supervision/server/service.ts`, migration 0003; test ranh giới và browser đợi cảnh báo thật ở dự án hạn 30 giây |
| Tác phong chuyên nghiệp | Chỉ dẫn dựa nguồn, input là dữ liệu không phải lệnh, thiếu thông tin phải hỏi rõ; Coordinator không suy done, Reviewer mẫu không kết luận từ một từ khóa; báo cáo bỏ tên/số liệu giả và mở được nguồn thật | `mock-policies.ts`, `real-provider.ts`, `validator.ts`, `agent-policies.test.ts`; report/source production trong rehearsal |

## Kiểm chứng đã chạy

- `npm run check`: lint và typecheck đạt.
- `npm test`: **33/33 đạt** trên PostgreSQL PGlite, áp đầy đủ migration; kiểm quyền, retry/rollback, version/revision, snapshot, mentor, notification, Planner, timeout và chính sách agent.
- `npm run build`: đạt, không còn cảnh báo tracing toàn workspace từ đường dẫn DB diễn tập.
- `npm run test:ui`: đạt bảng/filter, desktop/mobile 360px, drawer/focus/Escape, dirty form và chat/IME/retry.
- `node --import tsx tests/browser/planning.ts`: đạt bước làm rõ yêu cầu, lưu/version/publish, lỗi Planner giữ nội dung/dự án, bài nộp nhận HTTP 200 sai shape vẫn giữ nội dung và retry cùng key.
- `npm run test:rehearsal`: **đạt trên ứng dụng production thật**, API thật và DB cục bộ riêng. Đăng nhập → wizard → Planner → duyệt/publish → cấp mentor → submit/review/accept → tiến độ 50% → report/source → background notice mốc 80% → mentor chỉ đọc/360px → đánh dấu đã đọc → dừng/khởi động máy chủ → đọc lại tiến độ/báo cáo/quyền mentor. AI mode mock; không gọi đây là Neon/AI thật.
- Ảnh production đã tạo ở `.cache/rehearsal-ui/workspace.png`, `report.png`, `mentor-mobile.png`. Đã xem bản mentor trên 360px; dữ liệu này là dữ liệu kiểm thử riêng, không commit.

Diễn tập đã phát hiện và sửa lỗi kiểm tra Origin khi Next chuẩn hóa URL localhost, nhãn trợ năng của select/textarea và race đóng drawer khi dữ liệu nghiệm thu đang đồng bộ. Đây là lý do không chỉ dựa vào build/unit tests để xác nhận demo.

## Dữ liệu và điểm vận hành

- `delivery/server/implementation.ts` dùng schema/transaction/session TV2; không còn singleton p1/t1/s1 trong bộ nhớ. Server đọc quyền hiện tại trước replay, không tin memberships do client tự khai.
- Nghiệm thu chỉ dùng revision mới nhất đã có review đầy đủ, bằng chứng đúng submission và mọi tiêu chí met. Review cũ vẫn lưu nhưng không đổi trạng thái revision mới. AI không tự ghi done.
- Báo cáo lấy `readReportSnapshot`, giữ metrics/refs/asOf, phân biệt thời điểm nộp và nghiệm thu. Endpoint source kiểm quyền, report ref và project. Task hiện tại có nhãn rõ, không dùng để tính lại report cũ.
- Migration `0003_mentor_notifications.sql` chỉ thêm `project_mentors`, `notifications` và các FK/index/unique tương ứng. SQL đã được kiểm tra và áp trên PGlite. Đầu mối DB cần đọc rồi migrate trên Neon trước khi chạy bản nâng cấp ở đó.
- Trên local-demo, bộ quét chạy cùng web process để tránh hai tiến trình truy cập cùng file PGlite. Trên Neon chạy `npm run worker:deadlines` dưới trình quản lý tiến trình; không phụ thuộc trình duyệt và không biến report thành scheduler.
- Notification unique theo project/recipient/kind, kiểm recipient khi đọc, xóa notice khi thu hồi mentor. Khi tiến độ vượt 80%, thông báo được đánh dấu đã cải thiện.
- Public AI proposal giữ các field cũ, bổ sung tùy chọn steps/assignmentReason/estimatedHours. Planner chuẩn hóa nội dung vào description của task, không đổi ID/schema Task/Plan đã công bố. API demo bổ sung MENTOR; seed lặp an toàn thêm danh tính, không xóa dữ liệu.

## Giới hạn cần nêu đúng

- Chưa kết nối Neon chung và chưa gọi provider AI thật. Không coi bằng chứng mock/local là kiểm chứng độ ổn định mạng hoặc chất lượng ngữ nghĩa của mô hình thật. Các đường gọi provider, prompt, output validation và lỗi có sẵn để tích hợp khi cấu hình key/model.
- Rà soát đầu vào là bước hướng dẫn theo quy tắc, được ghi rõ trên UI; không giả là đã gọi mô hình. Planner/Reviewer mẫu cũng có giới hạn rõ ràng và luôn giữ quyền duyệt/nghiệm thu của con người.
- Ước lượng giờ là đề xuất, không dùng để tự ghi tiến độ. Tiến độ theo số task được tính đều, không khẳng định là tỷ lệ công sức thực tế đã bỏ ra.
- Không gửi email/thông báo ngoài ứng dụng; phạm vi đã chốt là thông báo nội bộ. Chưa thêm OAuth, scheduler báo cáo hay tự đổi deadline/assignee qua chat.

Hướng dẫn thiết lập, diễn tập và chuyển sang Neon/AI thật: [DEMO_RUNBOOK](DEMO_RUNBOOK.md).
