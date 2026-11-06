# TV1 — Planning và giao diện chung

## Vai trò và phạm vi sở hữu

TV1 triển khai **UI + API + logic** nhập dự án/thành viên, Planner, sửa kế hoạch, trưởng nhóm duyệt/công bố task chống trùng. TV1 là đầu mối layout, điều hướng, component UI cơ bản. Nhánh đề xuất `feat/planning`, chưa tạo trong phiên tài liệu.

Đọc [AGENTS](../../AGENTS.md), [quy tắc](../PROJECT_RULES.md), [contracts](../CONTRACTS.md), [timeline](../TIMELINE_4H.md), [demo](../DEMO_CHECKLIST.md). Hiện chưa có mã ứng dụng; stack **chưa chốt**. Các đường dẫn mã **dự kiến**: `src/features/planning/`, `src/ui/`, entry layout/điều hướng và API project/member/plan/publish theo contracts. Đây không phải các file cần tạo trong phiên tài liệu.

Shared dependencies: TV2 cung cấp data/session/quyền/transaction/unique và điều phối migration/contracts; TV3 cung cấp wrapper `generate(planner, input)` cùng output validation/lỗi. TV1 tự viết API planning, không giao toàn bộ API cho TV2. UI planning của TV1 không ghi DB trực tiếp hoặc gọi provider AI từ browser.

## Checklist triển khai phiên sau — tất cả chưa hoàn thành

Các khoảng dưới là phút tính từ lúc cả nhóm bắt đầu. Tổng **240 phút**, có 30 phút ổn định và 30 phút demo. Input/output là dự kiến; mỗi việc chỉ đánh dấu sau khi kiểm chứng thực tế.

- [ ] **TV1-N01 — Chốt nền tảng (0–10, 10 phút).** Input: repo hiện trạng, contracts, trao đổi TV2/TV3. Output: stack đã thống nhất, tên field/enum giữ đồng bộ, điểm gắn UI và quy ước session/AI. Hoàn thành khi TV2/TV3 biết props/route màn hình sẽ gắn và TV1 biết interface data/AI; không tự tạo migration.
- [ ] **TV1-N02 — UI chung và form nền (10–30, 20 phút).** Input: stack/điểm gắn đã chốt. Output: layout, điều hướng, thành phần loading/error/empty; form goal/deliverables/deadline và member skills/availableHoursPerWeek. Kiểm chứng hiển thị được dữ liệu mẫu; gửi vị trí gắn màn hình tracking/delivery/report cho TV2/TV3 trước phút 30.
- [ ] **TV1-F01 — Nhập/lưu và tạo nháp (30–55, 25 phút).** Input: Project/ProjectMember, wrapper AI hoặc mock cùng shape. Output: UI + API project/member, API tạo/lấy Plan draft, hiển thị nháp và nhãn real/mock. Kiểm chứng thiếu goal/đầu ra/member bị chặn với thông báo; server validate AI và lưu nháp, chưa có Task chính thức. Lỗi AI giữ input cho retry.
- [ ] **TV1-F02 — Sửa/duyệt/công bố (55–90, 35 phút).** Input: Plan draft có ID tiêu chí ổn định, helper transaction/quyền TV2. Output: UI sửa title/assignee/deadline/criteria/dependency; API lưu expectedVersion, nút duyệt explicit và publish có key. Kiểm chứng task không xuất hiện trong danh sách chính thức trước publish; một lần publish tạo một bộ Task, retry không trùng; version cũ báo conflict. Bàn giao mock hoặc thật đúng trạng thái, không giấu phần chờ.
- [ ] **TV1-I01 — Tích hợp vòng chính (90–135, 45 phút).** Input: DB/session thật TV2, AI wrapper TV3, màn hình của TV2/TV3. Output: project/member/plan/task thật đã lưu, ID gửi các luồng và điều hướng dùng chung. Kiểm chứng cùng session/project: tạo → sửa → publish → bảng task → chat → submission/review → report; tải lại vẫn đọc được. TV1 chịu sửa API planning và layout trong vòng tích hợp.
- [ ] **TV1-I02 — Quyền/lỗi/chính xác (135–180, 45 phút).** Input: vấn đề tích hợp, case quyền/retry/version/AI lỗi. Output: server chặn member duyệt và input/ID/dependency sai, UI cảnh báo rõ conflict/timeout. Kiểm chứng Plan published không sửa lại, không công bố thiếu approved, cycle/deadline ngoài project bị từ chối, hai lần bấm không nhân task.
- [ ] **TV1-S01 — Ổn định, ngừng tính năng (180–210, 30 phút).** Input: [checklist demo](../DEMO_CHECKLIST.md) và lỗi vòng chính. Output: sửa lỗi chặn luồng, checks phù hợp stack đã triển khai và ghi kết quả thực. Kiểm chứng reload sau publish, quyền server qua request trực tiếp, UI không nhầm mock/AI thật; không mở thêm tính năng.
- [ ] **TV1-D01 — Tập demo và bàn giao (210–240, 30 phút).** Input: bản tích hợp ổn định. Output: phần mở đầu demo, dữ liệu dự phòng và danh sách giới hạn/thiếu; phối hợp TV2/TV3 video dự phòng. Kiểm chứng demo chung 3–4 phút, không nói chức năng chưa làm đã hoạt động.

## Nhận và bàn giao dependency

| Mốc | Nhận từ ai | TV1 bàn giao | Nếu phải chờ |
|---|---|---|---|
| Phút 10–30 | TV2: interface session/data, User/membership demo; TV3: signature AI/mock/lỗi | Layout/điều hướng, form và điểm gắn UI; shape nháp/publish | Dùng u1/m1 leader, u2/m2, u3/m3 và Plan/Task mẫu theo contracts; stub adapter hiển thị rõ mock |
| Phút 90 | TV2: transaction/unique/quyền và task reader; TV3: Planner wrapper | Luồng nhập → sửa nháp → publish chạy độc lập; mapping ID, shape API, trạng thái thật/mock, case retry | Dùng mock data cùng contract; ghi rõ chưa nối DB/AI, không tuyên bố checkpoint 135 đạt |
| Phút 135 | TV2/TV3: các luồng đã nối cùng ID | Project/Plan/Task lưu thật, layout gắn đủ vòng chính | Ưu tiên nối adapter thật; cắt trang trí, không bỏ publish/quyền/lưu dữ liệu |

## Tiêu chí hoàn thành kiểm chứng được

- [ ] API planning lấy actor từ session server; member không duyệt/công bố, không dùng role client.
- [ ] Project/member có đủ mục tiêu, đầu ra, kỹ năng, giờ khả dụng và deadline cho Planner; dữ liệu nhập/lưu/lấy lại đúng.
- [ ] Chỉnh sửa nháp giữ ID task/criterion hiện có, cấp ID server cho mục mới; validate member/dependency/deadline, conflict version không ghi đè.
- [ ] Plan draft không tạo Task chính thức; publish atomic, chỉ leader xác nhận; retry và key mới không tạo trùng bộ task.
- [ ] Phút 90 có thao tác độc lập và bàn giao request/response + lỗi + nhãn mock/thật; phút 135 có vòng chính trên cùng dữ liệu lưu thật sau reload.
- [ ] Checks chỉ được báo nếu thực sự chạy trong phiên triển khai; cuối phiên ghi shared changes, phần thiếu và người nhận. Không tự commit/push nếu chưa được yêu cầu.

## Ngoài phạm vi

Không làm tracking/review/report thay TV2/TV3; không sửa schema/migration độc lập, không thay wrapper AI chung ngoài phối hợp với TV3. Không tự đổi deadline/assignee/criteria qua chat hoặc sau publish. Không mở Google Calendar/Meet, OAuth, Kanban kéo thả, đa workspace hay tái lập kế hoạch phức tạp. Mọi việc ở checklist này dành cho phiên triển khai sau.
