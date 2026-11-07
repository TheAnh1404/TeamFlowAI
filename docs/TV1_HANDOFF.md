# TV1 — bàn giao Planning và giao diện chung

Ngày kiểm chứng: 07/11/2026. Đọc cùng `TV2_HANDOFF.md`; tài liệu scaffold và checklist gốc mô tả giai đoạn trước triển khai.

## Đã triển khai

- P01 giới thiệu ba trợ lý, CTA tạo dự án và vào phiên demo; không có số liệu thành tích giả.
- Shell tại `src/app/app/layout.tsx`, `src/components/layout/app-shell.tsx`: topbar, sidebar, liên kết bỏ qua điều hướng, responsive. Nội dung P02/P05/P06/P07 của TV2 được giữ nguyên trong children. P08 của TV3 dùng cùng shell.
- UI chung `src/components/ui/primitives.tsx`: Button, Badge, Alert, Stepper; lớp CSS `tf-*` dùng token cố định. Dialog công bố dùng `<dialog>` gốc với tiêu điểm, Escape và backdrop.
- P03 ba bước: dự án → thành viên → kiểm tra/tạo nháp. Dữ liệu được lưu qua API; khi Planner lỗi giữ nội dung, giữ ID dự án đã lưu để thử lại; nếu lần trước đã tạo nháp thì mở bản đã có. Chọn tài khoản tại P02 trước khi tạo.
- P04 xem/sửa tên, mô tả, người phụ trách, deadline, tiêu chí và dependency; lưu version, cảnh báo nội dung chưa lưu; công bố cần lưu trước và xác nhận rõ ràng; chuyển P05 sau thành công. Thành viên chỉ đọc kế hoạch đã công bố.
- API project/member/plan/draft/publish thay các stub TV1 bằng implementation; không đổi URL, enum hoặc response contract.

## Điểm nối TV2

`src/features/planning/server/implementation.ts` export `createPlanningService(db, planner?)` cho kiểm thử và `planningService()` cho route/page runtime. Dùng trực tiếp schema, `projectMember`, `requireSession`, `commitMutation`, `mutationIdentity` của TV2. Không thay migration, auth hoặc schema.

Project và member được khóa khi đã có Plan. Tạo nháp gọi AI ngoài transaction, sau đó khóa project và so lại snapshot đầu vào. Sửa nháp khóa Plan và kiểm expectedVersion. Draft task/criterion cũ phải thuộc bản hiện tại; mục mới có ID null được server cấp ID. Dependency phải trong cùng bản nháp và không có vòng; deadline không sau project.

Publish kiểm leader hiện tại, `approved: true`, version và toàn bộ draft. Plan published và Task todo được ghi cùng transaction. ID Task/criterion giữ từ draft. `Idempotency-Key` bắt buộc theo helper TV2; retry cùng key/body trả kết quả cũ, khác body trả 409, key mới trên Plan published trả 409 và không thêm Task. P05/tracking/delivery đọc chung bảng Task, không cần mapping hoặc seed task riêng.

Giới hạn: project name 200, goal 4.000, 1–20 deliverables (500 ký tự/mục); tối đa 8 thành viên; 0–168 giờ/tuần, tạo Planner yêu cầu trên 0 và có kỹ năng; 1–30 task, title 200, description 4.000, 1–10 criteria (1.000 ký tự/mục). Mutation JSON vẫn theo giới hạn 32 KB của TV2. Giữ các giới hạn này khi chuẩn bị demo.

## Điểm nối TV3

Adapter riêng TV1: `src/features/planning/server/planner.ts`. Mặc định gọi `aiProvider.generate('planner', {project,members})` đúng interface hiện tại. Kiểm tra shape, aiMode, tempKey, membership, deadline, criteria, dependency trước lưu. Timeout 20 giây; lỗi provider 502, timeout 504; provider chưa triển khai vẫn 501. Không âm thầm chuyển sang mẫu.

Để phát triển khi chờ TV3, đặt **server-only** `PLANNING_AI_MODE=mock`. Adapter tạo task theo đầu ra dự án, chia lần lượt cho các thành viên, lưu `aiMode: mock`. Đây là dữ liệu mẫu xác định, không phải AI lập kế hoạch theo kỹ năng. Bỏ biến này khi nối provider TV3 thật. UI đọc mode từ Plan đã lưu, không đọc biến server.

Public UI planning export tại `src/features/planning/index.ts`. TV3 tiếp tục sở hữu `src/server/ai/`, delivery và report; phiên TV1 không triển khai các module đó.

## Kiểm chứng và giới hạn

- `npm test`: 20/20 đạt, gồm 3 test planning trên PostgreSQL PGlite áp migration thật: quyền, private draft, stable IDs, version conflict, approve, retry, frozen published plan, dependency vòng/ID/member/deadline sai, lỗi Planner và timeout. Đây không phải Neon.
- `npm run check` và `npm run build`: đạt. Windows cần quyền đọc đường dẫn đủ cho Next/SWC; không đổi cấu hình dự án để lách lỗi môi trường.
- `npm run test:ui`: bộ kiểm thử giao diện tracking TV2 đạt sau khi thêm shell/CSS.
- `node --import tsx tests/browser/planning.ts`: Edge fixture đạt lưu nháp/version, chặn công bố khi chưa lưu, dialog/Escape, chuyển P05, responsive 360px, Planner lỗi/thử lại không tạo dự án mới và giữ nội dung. Next router và API được thay bằng fixture; không gọi đây là end-to-end trên Neon. Ảnh ở `.cache/planning-ui/`, không commit.
- Đã xem ảnh màn hình P04 mobile. Chưa kiểm chứng toàn vòng planning → chat → submission/review → report với Neon và AI thật. TV2 chuẩn bị môi trường/migrate/seed; TV3 cung cấp provider và module của mình; sau đó chạy demo trên cùng ID và tải lại từng màn hình.
- Contract chưa có ước lượng giờ theo task nên chưa có cảnh báo quá tải hoặc tổng công sức AI; UI chỉ hiển thị giờ khả dụng đã nhập. Không tự thêm field shared contract.
- Không có scheduler, upload, OAuth, đổi leader hoặc sửa lại nội dung Task đã công bố. Không commit/push/tạo nhánh.

## Cách kiểm tra tích hợp tiếp theo

1. TV2 cấu hình Neon/demo session và migrate/seed theo bàn giao TV2.
2. Chọn TV1 ở `/app`, tạo dự án và nhập kỹ năng/giờ cho các thành viên. Bật mock có nhãn nếu provider chưa sẵn.
3. Tạo nháp → sửa một tiêu chí → lưu → duyệt/công bố → P05. Reload và xác nhận đúng ID, số task, trạng thái todo.
4. Chọn TV2: API draft/publish bị chặn; task đã công bố đọc được. Tiếp tục chat và resolve của TV2.
5. TV3 nối delivery/review/report, kiểm bằng chứng và nguồn snapshot; chỉ đánh dấu vòng MVP sau khi luồng thật hoàn thành.
