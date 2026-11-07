# Nhật ký triển khai và kiểm tra tích hợp — TeamFlow AI

## Kiểm chứng và xuất bản MVP lên tv1_hung — 07/11/2026

- Yêu cầu hiện tại: kiểm tra cả TV1/TV2/TV3; khi đạt, commit `full function of TeamFlow AI` và push lên `tv1_hung`. Chi tiết/matrix/bằng chứng tại [RELEASE_VERIFICATION](docs/RELEASE_VERIFICATION.md).
- `check`, build, **42/42 test**, browser tracking/planning/settings và production rehearsal đều đạt. Vòng production có phiên TV1/TV2/TV3 riêng: nháp/sửa/duyệt → TV2 chat/làm rõ/blocker → nộp thiếu/review/nộp lại → TV1 nghiệm thu → TV3 nộp/review → báo cáo có nguồn → mentor/thông báo → restart giữ dữ liệu.
- Sửa lỗi drawer có thể mở lại khi đồng bộ sau nghiệm thu; bổ sung nhãn trợ năng chat; hoàn thiện Landing theo các mục P0 còn thiếu. Thêm kiểm thử evidence/review đồng thời, snapshot/quyền báo cáo và biên nộp/nghiệm thu.
- Sau fetch: main mới `5e30442`, TV3 mới `a20ac46`. Chưa ghép auth/Coordinator workspace/DOCX/Excel/ảnh mới vào bản MVP này. Migration và session giữa hai bản cần tích hợp riêng; không có merge đang dở hoặc marker conflict ở working tree.
- Target `origin/tv1_hung` đang ở `76a5106`, là tổ tiên của nhánh tích hợp. Xuất bản theo fast-forward, không force push, không sửa main hay nhánh đồng nghiệp. Không đưa `.env.local`, DB, master key hoặc ảnh/log `.cache/` vào commit.
- Phạm vi PASS là production cục bộ với PGlite và AI mẫu, chưa phải Neon/AI thật. Các phần bên dưới là nhật ký lịch sử của các phiên trước.

## Bổ sung sau phiên kiểm tra pull: cấu hình OpenAI cá nhân

- Thêm **Cấu hình AI** trong sidebar tại `/app/settings/ai`, ô nhập key che bằng mật khẩu, chọn model và mode theo user; kiểm tra khóa/model, chạy thử bốn trợ lý có ghi rõ phí API có thể phát sinh.
- Khóa lưu mã hóa AES-256-GCM theo user, không echo hoặc lưu trong trình duyệt; được nối vào Planner/Coordinator/Reviewer/Report qua AsyncLocalStorage. Khóa/mode tài khoản khác không bị thay đổi.
- Migration bổ sung `0004_user_ai_settings.sql`; chưa áp Neon chung. Chi tiết bảo vệ khóa, quyền và vận hành ở [AI_SETTINGS](docs/AI_SETTINGS.md).
- Kiểm tra mới nhất của tính năng: unit tests hiện gồm **38 test**; check/build và UI fixture đã đạt. Rehearsal được mở rộng để lưu khóa giả ở mode mock và kiểm tra persistence/quyền riêng; không dùng khóa thật hoặc tự gọi mô hình có tính phí trong kiểm thử.
- Phần kiểm tra main/conflict bên dưới là snapshot của phiên trước tính năng này; không coi số file dự báo là bản kiểm tra lại sau mọi thay đổi mới.

Cập nhật ngày **07/11/2026**. Đây là nhật ký trạng thái và bằng chứng; hướng dẫn làm việc nằm trong [AGENTS.md](AGENTS.md). File `markdown.md` chưa tồn tại trước phiên này và được tạo theo yêu cầu người dùng; dùng `AGENTS.md` sẵn có, không tạo bản `agent.md` trùng chức năng.

## Những việc đã làm

| Nhóm | Nội dung đã triển khai |
|---|---|
| TV1 | Shell chung, Landing P01, wizard P03, sửa/duyệt P04, API project/member/plan/publish; kiểm version, phụ thuộc vòng, quyền leader và chống task trùng |
| Tích hợp | Ghép TV1/TV2/TV3 trên nhánh riêng; nối DeliverySlot vào P06; dùng session server chung, bỏ fallback nhận quyền demo qua URL/header |
| Lưu dữ liệu | Thay delivery fixture trong bộ nhớ bằng Drizzle DB chung; submit/review/accept/report có transaction, replay, version/revision và kiểm quyền hiện tại |
| Timeline/tiến độ | Timeline ở đầu workspace và trang mentor; thanh tiến độ tính task đã nghiệm thu / task đã công bố; không suy phần trăm từ chat |
| Planner | Hỏi rõ phạm vi/rủi ro/điều kiện thành công; lưu câu trả lời; đề xuất việc theo kỹ năng/khối lượng với bước thực hiện, lý do phân công, tiêu chí, ước lượng và cảnh báo khả dụng |
| Mentor/thông báo | Tài khoản MENTOR, grant chỉ đọc, cấp/thu hồi quyền; thông báo lưu DB khi ≥80% thời gian và ≤80% tiến độ nghiệm thu; chống trùng, đánh dấu đã đọc và quét nền |
| Tác phong agent | Input là dữ liệu không phải lệnh; Coordinator hỏi lại khi mơ hồ, không tự ghi done; Reviewer yêu cầu bằng chứng và đúng revision; dữ liệu mẫu/thật ghi nhãn rõ |
| Báo cáo | Snapshot số liệu/nguồn đã lưu; bỏ tên và số liệu giả; mở được nguồn thực có kiểm quyền; Task hiện tại không ghi đè số liệu báo cáo cũ |
| Diễn tập | PGlite lưu bền dưới `.cache/`, AI mẫu có nhãn, chạy không cần Docker/mạng sau khi đã cài/build; giữ dữ liệu và quyền sau restart |

Chi tiết: [BACKEND_UPGRADE](docs/BACKEND_UPGRADE.md), [DEMO_RUNBOOK](docs/DEMO_RUNBOOK.md), [bàn giao TV1](docs/TV1_HANDOFF.md), [bàn giao TV2](docs/TV2_HANDOFF.md).

## Kiểm tra sau lần pull

Các thông tin sau được đọc trực tiếp từ Git trong workspace này, không suy từ tên nhánh:

| Mục | Kết quả |
|---|---|
| Nhánh đang mở | `codex/integration-tv1-tv2-tv3` |
| HEAD hiện tại | `ac9b64f` — bản ghép thử, chưa bao gồm các nâng cấp chưa commit trong working tree |
| Remote main đang có trong repo | `origin/main` tại `53ee45a` — `feat(delivery): integrate delivery workspace, AI reviewer and weekly reports with database` |
| Local main | `5d6f9ee`, đang chậm hơn `origin/main` 7 commit |
| Hai nhánh đã phân kỳ | HEAD có 2 commit riêng; origin/main có 5 commit riêng (`git rev-list --left-right --count HEAD...origin/main`) |
| Conflict Git đang chờ xử lý | Không có entry unmerged (`git ls-files -u` rỗng) |
| Merge/rebase/cherry-pick đang dở | Không phát hiện trong workspace |
| Dấu conflict trong mã/tài liệu được quét | Không có `<<<<<<<`, `=======`, `>>>>>>>` |
| Working tree | Còn nhiều thay đổi nâng cấp chưa commit và file mới; không được coi là bản đã có trên main |

**Kết luận:** lần cập nhật remote đã đem main mới vào các ref của repo, nhưng nhánh/thư mục đang mở chưa ghép main mới vào. Không có conflict hiện tại không có nghĩa là ghép main mới sẽ sạch.

## Mô phỏng ghép main với toàn bộ mã hiện tại

Chỉ ghép văn bản trong `.cache/conflict-audit/`; không sửa index, ref, commit hoặc source thực tế. Phép kiểm tra có tính cả file chưa commit/file mới, chuẩn hóa CRLF/LF (`core.autocrlf=true`) và tái tạo base chung từ **cả hai merge base** `76a5106` (TV1), `466594b` (TV3), qua tổ tiên `5d6f9ee`. Dùng riêng một merge base sẽ báo nhầm add/add đối với các file TV3 đã cùng có ở hai nhánh.

- Main có **90 file khác virtual base chung**.
- Có **28 file cùng thay đổi ở hai phía**.
- **24 file có conflict văn bản**, **1 file add/add cần đối chiếu thủ công**.
- **2 file ghép văn bản tự động được**, **1 file nội dung giống nhau**.
- Đây là dự báo dựa trên trạng thái hiện tại, chưa phải kết quả một lệnh merge thực tế. Merge còn phải kiểm tra contract và chạy test sau khi xử lý.

### 25 file dự kiến cần xử lý thủ công

| Nhóm | File |
|---|---|
| Cấu hình/tài liệu | `.env.example`, `README.md`, `next.config.ts`, `package.json` |
| API | `src/app/api/projects/[projectId]/reports/route.ts`, `src/app/api/session/route.ts`, `src/app/api/submissions/[submissionId]/review/route.ts`, `src/app/api/tasks/[taskId]/accept/route.ts`, `src/app/api/tasks/[taskId]/submissions/route.ts` |
| Delivery UI | `src/features/delivery/components/ReportSourcesDrawer.tsx`, `ReviewPanel.tsx`, `SubmissionForm.tsx`, `WeeklyReportView.tsx` trong cùng thư mục |
| Delivery server | `src/features/delivery/server/api-response.ts`, `auth-helper.ts`, `repository.ts`, `service.ts` trong cùng thư mục |
| Tracking UI | `src/features/tracking/components/session-bar.tsx`, `tracking.module.css` |
| AI | `src/server/ai/index.ts`, `real-provider.ts`, `validator.ts` |
| DB | `src/server/db/client.ts`, `src/server/db/schema/index.ts` |
| Kiểm thử add/add | `tests/delivery.test.ts` — hai bên cùng có file mới với nội dung khác nhau |

Hai file ghép văn bản tự động: `src/server/auth/session.ts`, `tests/tracking.test.ts`. File giống nhau: `src/features/delivery/index.ts`. Không coi kết quả này là xác nhận tương thích nghiệp vụ.

### Điểm cần thống nhất khi tích hợp

1. **Session:** bản hiện tại nhận `{account, accessCode}`, có MENTOR và phát sự kiện đổi phiên cho hộp thông báo. Main mới nhận `account` hoặc `demoAccount`, không nhận accessCode, chỉ có TV1/TV2/TV3. Nếu chỉ lấy form/helper từ một bên, đăng nhập có thể lỗi hoặc mất lớp kiểm tra mã và quyền mentor. `session.ts` ghép chữ được nhưng chữ ký helper vẫn cần đối chiếu với route.
2. **Delivery:** main mới cũng đã chuyển sang DB, triển khai trong `server/service.ts` và thêm `getReportSource`. Bản nâng cấp hiện tại tách `server/implementation.ts`, có timeout/revision/tiến độ và endpoint nguồn riêng. Cần chọn một luồng nhất quán, giữ các bất biến đã kiểm chứng; không duy trì hai runtime song song hoặc chỉ chọn ours/theirs toàn bộ.
3. **DB/migration:** main có alias/type và công cụ nâng cấp legacy mới; bản hiện tại thêm PGlite, mentor/notifications và migration 0003. Phải giữ đủ schema/grant/invariants, kiểm tra journal và script migration; không tự chạy upgrade legacy hoặc migrate Neon để thử.
4. **AI/Planner:** giữ bước làm rõ, thông tin phân công chi tiết, kiểm chứng bằng chứng, mode thật/mẫu và lỗi an toàn khi đối chiếu các thay đổi provider mới.
5. **Scripts/tests:** ghép có chọn lọc các lệnh test/legacy/tracking từ main với demo/worker/rehearsal hiện tại; đồng bộ package-lock sau khi chốt dependencies. Chạy lại check/build và các bộ test của cả hai bên trên bản đã tích hợp.

## Kết quả kiểm tra thực chạy trong phiên cập nhật này

| Kiểm tra | Kết quả/phạm vi |
|---|---|
| `npm run check` | Đạt lint và typecheck trên working tree hiện tại |
| `npm test` | **33/33 đạt**, gồm nghiệp vụ DB, AI policy, Planner, mentor và thông báo |
| `npm run build` | Đạt, toàn bộ route hiện tại biên dịch thành công |
| `git diff --check` | Không phát hiện lỗi whitespace; các cảnh báo chuyển LF/CRLF không phải conflict |
| Kiểm tra marker/unmerged | Không phát hiện trong source thực tế |
| Mô phỏng ghép | Phát hiện 25 file dự kiến cần xử lý thủ công; source thực tế được giữ nguyên |

Các bộ browser fixture và rehearsal production đã đạt ở phiên nâng cấp trước, được ghi chi tiết trong BACKEND_UPGRADE. Phiên cập nhật tài liệu/kiểm tra pull này không tuyên bố đã chạy lại browser hoặc kiểm thử main sau merge. Chưa kiểm chứng Neon chung hoặc AI thật.

## Trạng thái bàn giao

- Đã cập nhật `AGENTS.md` và tạo nhật ký này theo yêu cầu.
- Chưa merge/rebase main mới vào nhánh tích hợp; chưa xử lý thay đổi nghiệp vụ giữa hai bản vì đây là phiên kiểm tra và cập nhật tài liệu.
- Không reset/clean/stash/checkout đè mã, không chạy migration Neon, không commit/push hoặc đổi nhánh.
- Mã truy cập và cấu hình riêng nằm trong `.env.local` được Git ignore; không ghi giá trị vào nhật ký.
- Trước lần tích hợp tiếp theo, bảo toàn toàn bộ thay đổi nâng cấp và file mới, thống nhất các điểm trên rồi mới ghép và kiểm chứng lại. Không pull đè working tree hiện tại.
