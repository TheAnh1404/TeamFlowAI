# TV2 — Tracking, dữ liệu và tích hợp

> Mở rộng 07/11/2026 theo yêu cầu triển khai [Coordinator plan](../TV2_CHAT_COORDINATOR_PLAN.md): TV2 thêm chat raw/feed V2, check-in/revision, inbox/preferences, scheduler HTTP, jobs/outbox/lease/fencing, email/verification, nguồn snapshot/task events và API lịch/report V2. Không tự nghiệm thu task hoặc công bố report. API V1 giữ tương thích. Bàn giao frontend ở [COORDINATOR_FRONTEND_HANDOFF](../COORDINATOR_FRONTEND_HANDOFF.md); cấu hình và kiểm chứng thật ở [COORDINATOR_OPERATIONS](../COORDINATOR_OPERATIONS.md). Frontend được thực hiện ở phiên riêng, không ghi đè file đang sửa.

> **Cập nhật phiên triển khai TV2:** đã có code/schema/migration/session/task/chat và kiểm tra riêng phần TV2. Xem [bàn giao và kết quả kiểm chứng](../TV2_HANDOFF.md). Các mô tả “chưa có mã/chưa chốt” bên dưới là bối cảnh khi lập kế hoạch. Checklist mốc phối hợp vẫn chưa đánh dấu hoàn tất vì TV1/TV3 và vòng sản phẩm chung chưa được tích hợp.

## Vai trò và phạm vi sở hữu

TV2 làm **UI + API + logic** bảng task dạng danh sách, chat và Coordinator ghi tiến độ/trở ngại. TV2 phụ trách database, migration/seed, session/quyền cơ bản phía server; là đầu mối contracts và tích hợp. Nhánh đề xuất `feat/tracking`, chưa tạo trong phiên tài liệu. TV1 và TV3 vẫn tự viết API của mình.

Đọc [AGENTS](../../AGENTS.md), [quy tắc](../PROJECT_RULES.md), [contracts](../CONTRACTS.md), [timeline](../TIMELINE_4H.md), [demo](../DEMO_CHECKLIST.md). Hiện chưa có mã ứng dụng; stack **chưa chốt**. Đường dẫn mã **dự kiến**: `src/features/tracking/`, `src/server/data/`, `src/server/session/`, `db/`; API task/messages/resolve/progress/session/users theo contracts. Không tạo các file triển khai này trong phiên tài liệu.

Shared dependencies: TV1 cho layout, điều hướng và Task đã publish; TV3 cho `generate(coordinator, input)` cùng validation/lỗi. TV2 điều phối manifest/cấu hình chung và schema/migration cho cả ba luồng ở phiên triển khai; cung cấp helper quyền và transaction cho TV1/TV3. Không tự đổi contract phá vỡ caller.

## Checklist triển khai phiên sau — tất cả chưa hoàn thành

Tổng **240 phút**. Thứ tự và input/output dự kiến:

- [ ] **TV2-N01 — Chốt nền tảng (0–10, 10 phút).** Input: repo/contracts và nhu cầu TV1/TV3. Output: stack/lưu bền/session demo đã thống nhất, mapping module, interface data/transaction/quyền và giới hạn chung. Kiểm chứng ba người hiểu actor từ session, `...MemberId` là membership, ai là leader/canAccept. Điều phối dependency/cấu hình dùng chung trong phiên triển khai.
- [ ] **TV2-N02 — Dữ liệu/session nền (10–30, 20 phút).** Input: quyết định N01. Output: schema/migration/seed tối thiểu cho các entity đã thống nhất; cơ chế demo session phía server, API session/users và helper membership/quyền. Kiểm chứng một bản ghi đọc lại được và request không session bị chặn; phát ID dùng chung và interface trước phút 30. Nếu chưa xong, bàn giao adapter mock cùng contract ngay, ghi rõ phần còn thiếu.
- [ ] **TV2-F01 — Danh sách task và dữ liệu dùng chung (30–55, 25 phút).** Input: Task mẫu hợp contract hoặc Task TV1 đã publish. Output: UI + API danh sách/chi tiết task/progress, hiển thị assignee/deadline/status/criteria/dependency; hoàn thiện data access cho TV1/TV3. Kiểm chứng chỉ hiện Task chính thức, phân biệt empty với lỗi và giữ dữ liệu qua reload khi đã nối DB.
- [ ] **TV2-F02 — Chat/Coordinator/làm rõ (55–90, 35 phút).** Input: session, task, wrapper Coordinator/mock TV3. Output: UI + API lưu/đọc chat, resolve, ProgressUpdate; chỉ cập nhật khi task/ý định/quyền chắc chắn. Kiểm chứng câu mơ hồ hỏi lại không đổi Task; assignee báo blocker lưu đúng task; người không có quyền chỉ chat no_change. Chat retry/resolve không tạo update trùng.
- [ ] **TV2-I01 — Tích hợp vòng chính (90–135, 45 phút).** Input: project/member/plan/task thật TV1, submission/review/report TV3. Output: một bộ ID và DB/session dùng chung; giải quyết migration theo thứ tự và nối dữ liệu mọi luồng. Kiểm chứng tạo → publish → chat → nộp/review → report rồi reload; TV1/TV3 tự sửa API của họ, TV2 sửa data/helper/tracking và điều phối lỗi tích hợp.
- [ ] **TV2-I02 — Quyền/lỗi/chính xác (135–180, 45 phút).** Input: lỗi/case tích hợp. Output: kiểm tra cùng project và actor ở mọi thao tác, validation version, chống cập nhật trùng và prompt injection. Kiểm chứng user không phụ trách không đổi task; không tìm thấy task thì hỏi lại; chat không đổi deadline/assignee/criteria/done; AI lỗi không ghi nửa chừng.
- [ ] **TV2-S01 — Ổn định, ngừng tính năng (180–210, 30 phút).** Input: checklist chung và lỗi quyền/lưu dữ liệu. Output: sửa lỗi vòng chính, kiểm tra persistence/quyền trực tiếp API theo stack, ghi checks thực chạy. Kiểm chứng không lộ dữ liệu project khác, snapshot dữ liệu đọc nhất quán, hai lần resolve không hai ProgressUpdate.
- [ ] **TV2-D01 — Demo/reset/bàn giao (210–240, 30 phút).** Input: bản tích hợp ổn định. Output: phần chat/bị chặn, dữ liệu dự phòng, cách reset phạm vi demo đã chốt và video với TV1/TV3. Kiểm chứng không reset nhầm dữ liệu khác; demo 3–4 phút và ghi rõ mock/AI thật/phần thiếu.

## Nhận và bàn giao dependency

| Mốc | Nhận từ ai | TV2 bàn giao | Nếu phải chờ |
|---|---|---|---|
| Phút 10–30 | TV1: điểm gắn UI và field planning; TV3: nhu cầu submission/report, interface Coordinator | Contract/data/session/quyền/transaction, ID mẫu, thứ tự migration và dependency chung | Không chờ UI để làm data; gửi adapter/mock trước, công khai tiến độ lớp lưu thật |
| Phút 90 | TV1: Plan/Task shape; TV3: wrapper Coordinator hoặc mock đúng shape | Task list/chat/resolve thao tác độc lập, case mơ hồ/quyền/retry, API readers cho report | Dùng t1/m2 theo contracts cho tracking; không tạo Task giả vào DB như đã publish thật nếu chưa qua luồng TV1 |
| Phút 135 | TV1: project/task đã publish; TV3: submission/review/report lưu thật | Session/DB chung và vòng chính đã kiểm chứng qua reload; log vấn đề tích hợp còn lại | Ưu tiên data/adapter/quyền; cắt lọc nâng cao/trang trí, không cắt persistence |

## Tiêu chí hoàn thành kiểm chứng được

- [ ] Dữ liệu mọi luồng lưu server, còn sau reload; migration/schema có một đầu mối TV2, ID và tên field đúng contracts.
- [ ] Quyền server dựa vào session + ProjectMember; request giả role/userId hoặc ID khác project không vượt quyền.
- [ ] Chat mơ hồ trả `clarification_required`, chưa có ProgressUpdate/Task mutation; resolve xác thực lại tác giả, task, quyền và version.
- [ ] Chat rõ blocker chỉ chuyển đúng task sang blocked; không suy “gần xong” thành phần trăm, không kết luận không làm việc khi thiếu cập nhật.
- [ ] Chat/resolve retry atomic và không trùng update; không cho chat thay deadline/assignee/criteria hay ghi done.
- [ ] Phút 90 tracking độc lập; phút 135 toàn bộ luồng cùng project/task/session và DB thật. Bàn giao shared changes, checks thực chạy, phần thiếu và dependency.

## Ngoài phạm vi

Không viết toàn bộ API planning/delivery/report thay TV1/TV3. Không làm bot ngoài ứng dụng, scheduler, OAuth Google, đọc link/tệp/repository, Kanban kéo thả, đa workspace, tự đổi deadline hay tự tái lập kế hoạch. Báo cáo thuộc Coordinator nhưng UI/API/logic báo cáo do TV3 triển khai. Checklist không được thực thi trong phiên tài liệu.
