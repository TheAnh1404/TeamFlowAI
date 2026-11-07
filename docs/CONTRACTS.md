# Contracts thiết kế MVP

## Phụ lục phạm vi Coordinator V2 — 07/11/2026

Contracts V1 giữ nguyên. V2 ở `src/contracts/coordinator.ts` (export qua `@/contracts`), DTO/API cụ thể tại [COORDINATOR_FRONTEND_HANDOFF](COORDINATOR_FRONTEND_HANDOFF.md). Đây là phần mở rộng đã được người dùng yêu cầu, cho phép scheduler tạo report **draft**, không tự publish hoặc nghiệm thu task.

- ChatPost riêng với analysisStatus; feed discriminated union `kind: post | event | legacy`. Lưu chat + enqueue atomic, HTTP 201 sau commit. Message có `chatPostId` nullable unique ở DB; V1 caller không cần field này. System không giả User/ProjectMember.
- CheckinPayload gồm plannedWork/completedWork/noWorkUpdate/blockers/nextActions/sourcePostIds/sourceEvidence. Work item id ổn định, taskId/minutes nullable; sourceEvidence chỉ ProgressUpdate/Submission của chính tác giả. Draft expectedVersion bắt đầu 0, submit thêm revision append-only. Không đổi Task.done.
- Schedule timezone/workdays/holidays/times/weeklyMode/channels/participant IDs, expectedVersion và effectiveAt. Timezone dùng IANA; Instant UTC. Occurrence key không đổi theo retry/schedule version; payload version được kiểm lại trước side effect.
- Job nội bộ có type allowlist, claimToken/lease/attempts/runAt/expiresAt. AutomationExecutionContext không nhận từ JSON browser, không phải session leader. Email recipient từ User DB, verified/opt-in/suppression; email link không cấp quyền.
- ReportArtifact V2 nằm trong coordinator_report_runs, có status queued/generating/failed/attention/draft/published/canceled, version, snapshotHash, snapshot/metrics/summary, summaryHistory, aiMode, metadata thời điểm và publishedAt/by. Draft leader-only, member chỉ published; source V2 gồm ChatPost/CheckinRevision/TaskActivityEvent/CheckinRequest và nguồn V1. Source API đọc snapshot, không đọc bản hiện tại. `hasUpdatesAfterSnapshot` là cờ riêng, không thay snapshot.
- Mọi mutation có strict JSON/origin/body bounds; các operation tạo phiên bản dùng Idempotency-Key và expectedVersion. Quyền hiện tại được kiểm trước replay. Không nhận author/userId/role từ client làm actor.

Chi tiết schema/migration/scheduler/email, tests và phần chưa kiểm chứng thật: [COORDINATOR_OPERATIONS](COORDINATOR_OPERATIONS.md).

> **Trạng thái phiên TV2:** data shapes đã có tại `src/contracts/`; tracking/auth và các read model bổ sung ở cuối tài liệu đã được triển khai. TV1/TV3 còn giữ stub. Đặc tả nghiệp vụ gốc bên dưới vẫn là nguồn tên trường/enum, không có nghĩa mọi API đã hoạt động. Xem [TV2_HANDOFF](TV2_HANDOFF.md).

**Chỉ là đặc tả dự kiến trong Markdown.** Chưa tạo type, schema, migration, endpoint, wrapper AI hay database thật. Stack, kiểu ID vật lý, session, provider/model AI **chưa chốt**. TV2 điều phối contract/dữ liệu; TV1 xác nhận planning/UI; TV3 xác nhận AI/delivery/report. Đọc cùng [quy tắc](PROJECT_RULES.md) và [timeline](TIMELINE_4H.md).

## 1. Quy ước chung

| Ký hiệu | Ý nghĩa dự kiến |
|---|---|
| `Id` | Chuỗi opaque do server sinh; JSON dùng ID ngắn để dễ đọc, không áp đặt UUID hay thư viện |
| `Instant` | Chuỗi ISO 8601 có múi giờ; lưu/trao đổi UTC, UI mặc định `Asia/Ho_Chi_Minh` |
| `T?` | Có thể `null`; field khác bắt buộc trừ khi request nói rõ tùy chọn |
| `version` | Số nguyên dương để kiểm tra cập nhật đồng thời; client gửi `expectedVersion` hoặc `expectedTaskVersion` |
| `createdAt` | Thời điểm server ghi nhận; entity nào có trường này thì dùng thời gian server |
| JSON thành công | `{ "data": ... }`; danh sách là `{ "data": [...] }`, MVP chưa cần phân trang |
| JSON lỗi | `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }` |

Không có field phần trăm tiến độ. Giới hạn độ dài, số task/tiêu chí và timeout AI sẽ chốt phút 0–30; server và UI dùng cùng giới hạn, không để request không giới hạn. Mọi ID liên quan phải được kiểm tra tồn tại và cùng project. Body không được dùng `userId`/`role` để quyết định người đang thao tác.

## 2. Enum và quyền

| Tên | Giá trị chính xác |
|---|---|
| `ProjectMember.role` | `leader`, `member` |
| `Plan.status` | `draft`, `published` |
| `Task.status` | `todo`, `in_progress`, `blocked`, `in_review`, `changes_requested`, `done` |
| Kết quả từng criterion trong Review | `met`, `not_met`, `insufficient_evidence` |
| `Message.resolution` | `clarification_required`, `applied`, `no_change` |
| `Submission.contentType` | `text`, `markdown`, `code` |
| `aiMode` của output AI đã lưu | `real`, `mock` |

Session cụ thể chưa chốt; interface dự kiến trả User hiện hành đã xác thực. Một Project có một leader trong MVP; nguồn quyền là ProjectMember lưu server. Leader có mọi quyền trong project; member có `canAccept: true` được nghiệm thu nhưng không có quyền duyệt kế hoạch hoặc quản lý thành viên. Session chưa có membership thì chỉ được tạo project mới; tạo project tự thêm người tạo làm leader. Không triển khai OAuth trong MVP.

| Hành động | Quyền server kiểm tra |
|---|---|
| Đọc project, task, chat, submission/review/report | Thành viên của project |
| Nhập/sửa project và thành viên, tạo/sửa/duyệt/công bố plan | Leader; tạo project yêu cầu session hợp lệ |
| Gửi chat | Thành viên; chat của người không phụ trách vẫn được lưu nhưng không được đổi task nếu không phải leader |
| Ghi progress hoặc nộp bài/yêu cầu review | Người phụ trách task hoặc leader |
| Nghiệm thu `done` | Leader hoặc member có `canAccept: true` |
| Bấm tạo báo cáo tuần | Leader; mọi thành viên đọc báo cáo đã lưu |

## 3. Entity và quan hệ dự kiến

Các object con như criterion, evidence, task nháp và metrics có thể lưu JSON hoặc chuẩn hóa theo database được chốt. Đây là đơn giản hóa thiết kế, không yêu cầu tạo thêm bảng.

### User

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id` | Id | Danh tính đã xác thực từ session |
| `displayName` | string | Tên hiển thị; dữ liệu mẫu dùng TV1/TV2/TV3 |
| `createdAt` | Instant | Do server sinh |

Không lưu role toàn cục trên User để thay thế role theo project. Tài khoản demo được chuẩn bị phía server ở phiên triển khai; không có API cho client tự nhận một User bất kỳ. Cách đăng nhập/session demo cụ thể chưa chốt.

### Project

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id` | Id | Khóa project |
| `name`, `goal` | string | Tên và mục tiêu |
| `deliverables` | string[] | Đầu ra mong muốn, ít nhất một |
| `deadline` | Instant | Deadline chung |
| `timeZone` | string | Múi giờ IANA, mặc định `Asia/Ho_Chi_Minh` |
| `createdAt` | Instant | Do server sinh |

### ProjectMember

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id` | Id | ID membership; các field `...MemberId` trỏ tới ID này |
| `projectId`, `userId` | Id | FK Project, User; duy nhất cặp `(projectId, userId)` |
| `role` | enum | `leader` hoặc `member` |
| `canAccept` | boolean | Quyền nghiệm thu; leader luôn có quyền này |
| `skills` | string[] | Kỹ năng cung cấp cho Planner |
| `availableHoursPerWeek` | number | Số giờ khả dụng trong tuần, không âm; không phải phần trăm tiến độ |

MVP thêm tài khoản đã có bằng `userId`, không có lời mời/OAuth. Đây là ID đối tượng được leader quản lý, không phải danh tính tự khai của người gọi API. MVP không có API xóa thành viên/đổi leader để tránh tham chiếu treo.

### Plan

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId` | Id | Plan thuộc Project |
| `status` | enum | `draft` hoặc `published` |
| `version` | integer | Tăng khi sửa/công bố |
| `draftTasks` | DraftTask[] | Nháp được server kiểm tra/lưu; chưa phải Task chính thức |
| `aiMode` | enum | `real` hoặc `mock`, nguồn lần tạo nháp |
| `approvedByMemberId` | Id? | Leader duyệt; null khi draft |
| `publishedAt` | Instant? | Null khi draft |
| `createdAt` | Instant | Do server sinh |

`DraftTask` có `id`, `title`, `description`, `assigneeMemberId`, `deadline`, `criteria`, `dependencyTaskIds` giống phần nội dung Task. ID của draft task/criterion được server cấp khi lưu, giữ nguyên qua chỉnh sửa và công bố; AI không quyết định ID tin cậy. Mỗi project chỉ một Plan trong MVP; muốn tạo lại khi còn draft thì sửa/thay nội dung draft có kiểm tra version, không tạo thêm Plan. Sau published đóng băng nội dung kế hoạch, không tái lập kế hoạch ở MVP.

### Task

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId`, `planId` | Id | ID giữ từ DraftTask; FK Project/Plan đã published |
| `title`, `description` | string | Công việc và đầu ra |
| `assigneeMemberId` | Id | ProjectMember cùng project, một người phụ trách |
| `deadline` | Instant | Không sau deadline Project |
| `criteria` | `{id: Id, text: string}[]` | Ít nhất một; ID ổn định, không dựa vào vị trí mảng |
| `dependencyTaskIds` | Id[] | Task cùng plan/project; không tự trỏ, không chu trình |
| `status` | enum | Sáu trạng thái đã nêu; khởi tạo `todo` |
| `version` | integer | Tăng khi đổi trạng thái, nộp bài, nghiệm thu |
| `acceptedSubmissionId` | Id? | Submission được người có quyền nghiệm thu |
| `acceptedByMemberId` | Id? | ProjectMember đã nghiệm thu |
| `acceptedAt` | Instant? | Thời điểm nghiệm thu do server ghi; không phải thời điểm nộp |
| `createdAt` | Instant | Thời điểm công bố |

Dependency hiển thị cho người dùng, cảnh báo nếu chưa hoàn thành; MVP không tự dịch deadline hoặc tự chuyển trạng thái theo dependency. Ba field nghiệm thu cùng null trước `done`, cùng có giá trị khi `done`. Nội dung task/criteria/deadline/assignee đóng băng sau publish trong MVP.

### Message

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId` | Id | Chat nội bộ project |
| `authorMemberId` | Id | Từ session và membership server |
| `content` | string | Văn bản gốc; dữ liệu không tin cậy cho agent |
| `taskId` | Id? | Task đã xác định chắc chắn; null khi chưa rõ |
| `candidateTaskIds` | Id[] | Các task cùng project gợi ý để hỏi lại, không tự cập nhật |
| `resolution` | enum | `clarification_required`, `applied`, `no_change` |
| `clarificationQuestion` | string? | Bắt buộc nếu cần hỏi lại |
| `aiMode` | enum | Nhận diện bằng AI thật hay mock |
| `createdAt` | Instant | Do server sinh |

### ProgressUpdate

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId`, `taskId` | Id | FK Task cùng project |
| `messageId` | Id | FK Message; tối đa một update cho mỗi message ở MVP |
| `authorMemberId` | Id | Người gửi cập nhật, server xác định |
| `statusBefore`, `statusAfter` | Task.status | Chuyển trạng thái được backend cho phép |
| `note` | string | Nội dung tiến độ có nguồn từ chat |
| `blocker` | string? | Trở ngại; bắt buộc có mô tả nếu `statusAfter=blocked` |
| `createdAt` | Instant | Thời điểm cập nhật server |

Không sinh ProgressUpdate cho chat chỉ trao đổi hoặc chưa rõ. Không dùng thiếu ProgressUpdate để đánh giá không làm việc.

### Submission

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId`, `taskId` | Id | FK Task |
| `authorMemberId` | Id | Người nộp hợp lệ từ session |
| `revision` | integer | Tăng trong cùng task; không ghi đè bài trước |
| `contentType` | enum | `text`, `markdown`, `code` |
| `content` | string | Chỉ nội dung dán trực tiếp, không tải link/tệp/repo |
| `criteriaSnapshot` | `{id: Id, text: string}[]` | Snapshot tiêu chí Task tại thời điểm nộp |
| `submittedAt` | Instant | Server ghi khi lưu thành công |

### Review

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId`, `taskId`, `submissionId` | Id | Trỏ đúng revision bài nộp |
| `results` | CriterionResult[] | Chính xác một kết quả cho mỗi ID trong `criteriaSnapshot` |
| `summary` | string | Tổng hợp có căn cứ, không tự nghiệm thu |
| `aiMode` | enum | `real` hoặc `mock` |
| `createdAt` | Instant | Server ghi khi output hợp lệ được lưu |

`CriterionResult`: `criterionId: Id`, `verdict: met|not_met|insufficient_evidence`, `evidence: {submissionId: Id, quote: string}[]`, `missing: string`, `suggestion: string`. Quote phải là đoạn thực có trong Submission tương ứng. `met` phải có evidence hỗ trợ; `not_met` cần evidence chỉ ra nội dung trái yêu cầu hoặc chứng minh thiếu so với toàn bài được cung cấp. Không đủ dữ liệu để kết luận thì dùng `insufficient_evidence` và nêu dữ liệu cần bổ sung, không bịa evidence. Backend kiểm tra ID/quote/đủ tiêu chí; đánh giá ngữ nghĩa vẫn có giới hạn và cần người nghiệm thu.

MVP tối đa một Review lưu thành công cho mỗi Submission; retry trả lại bản đã có. Nộp lại tạo Submission mới và Review mới, giữ lịch sử trước đó.

### WeeklyReport

| Field | Type | Quan hệ/ý nghĩa |
|---|---|---|
| `id`, `projectId` | Id | Báo cáo Coordinator, TV3 triển khai |
| `generatedByMemberId` | Id | Leader bấm nút |
| `periodStart`, `periodEnd` | Instant | Khoảng `[start, end)`, kỳ tuần theo múi giờ Project |
| `asOf` | Instant | Mốc server chụp dữ liệu; `periodEnd <= asOf` |
| `metrics` | ReportMetrics | Số liệu backend tính, AI không ghi đè |
| `sourceRefs` | SourceRef[] | Nguồn đã lưu, cùng project, đủ cho metrics/summary |
| `summary` | SummaryItem[] | Các ý tóm tắt kèm nguồn |
| `aiMode` | enum | `real` hoặc `mock` |
| `createdAt` | Instant | Khi lưu báo cáo thành công |

`SourceRef = {entity: "Task"|"Message"|"ProgressUpdate"|"Submission"|"Review", id: Id}`. `SummaryItem = {text: string, sourceRefs: SourceRef[], metricKeys: string[]}`. Mỗi ý có ít nhất nguồn hoặc metric; mọi ref/key phải thuộc snapshot backend đã chọn. UI mở được nguồn đã lưu và hiển thị mốc snapshot. Khi mở nguồn Task đã thay đổi sau asOf, ghi rõ đó là trạng thái hiện tại, không dùng nó để tính lại report cũ. Không lấy nội dung từ web/link/repository.

`ReportMetrics` gồm các field dưới; tất cả là số nguyên không âm trừ `statusCounts` là object. Backend tính trong cùng snapshot đọc, lưu cùng nguồn; không lấy thời gian client làm căn cứ.

| Field | Công thức dự kiến |
|---|---|
| `statusCounts` | Số Task đã công bố theo từng trong sáu status tại `asOf`; đủ key kể cả giá trị 0 |
| `dueInPeriodTotal` | Số Task có deadline trong `[periodStart, periodEnd)` |
| `submittedOnTimeTotal` | Trong nhóm `dueInPeriodTotal`, số task có lần nộp đầu tiên `submittedAt <= deadline` |
| `acceptedOnTimeTotal` | Trong cùng nhóm, số task có `acceptedAt <= deadline` |
| `overdueOpenTotal` | Tại `asOf`, số task `deadline < asOf` và status khác `done` |
| `submissionsInPeriodTotal` | Số Submission có `submittedAt` trong kỳ, gồm cả nộp lại |
| `progressUpdatesInPeriodTotal` | Số ProgressUpdate có `createdAt` trong kỳ |

Đúng bằng deadline tính đúng hạn; thiếu nộp/thiếu nghiệm thu phải hiện riêng trên danh sách nguồn, không tự gọi là “đã nộp trễ”. Bài đầu nộp đúng hạn nhưng nghiệm thu sau hạn được thể hiện là hai kết quả riêng; chỉ số nộp không khẳng định bài đã đạt. `statusCounts`/`overdueOpenTotal` là ảnh chụp hiện tại ở `asOf`, không phải lịch sử trạng thái cuối kỳ. Report cũ giữ snapshot cũ, không tự tính lại khi task đổi. MVP không cần event sourcing để dựng lại trạng thái quá khứ. Khoảng tuần mặc định có thể là tuần hiện tại đến thời điểm bấm nút; UI luôn ghi khoảng thực tế, không nói đủ cả tuần nếu chưa kết thúc.

## 4. Trạng thái và transaction

| Trigger | Từ → đến | Điều kiện |
|---|---|---|
| Publish | Plan `draft → published`; tạo Task `todo` | Leader duyệt bản version hiện tại; mọi field/ID/dependency hợp lệ; tất cả trong một transaction |
| Chat rõ ý bắt đầu/tiếp tục | Task `todo/in_progress/blocked → in_progress` | Assignee hoặc leader; task chắc chắn, không suy trạng thái từ lời mơ hồ |
| Chat rõ trở ngại | Task `todo/in_progress/blocked → blocked` | Assignee hoặc leader; có blocker cụ thể |
| Chat trao đổi hoặc mơ hồ | Không đổi Task | Lưu Message; hỏi lại nếu đang muốn cập nhật nhưng thiếu task/ý định; không ProgressUpdate |
| Nộp mới/nộp lại | Task khác `done → in_review` | Assignee hoặc leader; lưu revision mới và đổi status trong một transaction |
| Review revision mới nhất có `not_met` | Task `in_review → changes_requested` | Review hợp lệ; không tự ghi done |
| Review chỉ có `met`/`insufficient_evidence` | Giữ `in_review` | UI nêu rõ phần chưa đủ bằng chứng hoặc chờ nghiệm thu |
| Nghiệm thu | Task `in_review → done` | Leader/`canAccept`; revision mới nhất có Review với tất cả criterion `met` |

Chat không chuyển các trạng thái `in_review/changes_requested/done`; người dùng nộp lại hoặc đi luồng review/nghiệm thu. Task `done` không mở lại trong MVP. Review revision cũ vẫn đọc được nhưng không đổi trạng thái task và không dùng để nghiệm thu revision mới. Nếu nộp bài mới trong lúc AI đang review bản cũ, server kiểm tra lại revision mới nhất trước khi áp dụng chuyển trạng thái. Không tạo UI cho AI tự nghiệm thu.

AI gọi ngoài transaction dài; server lấy snapshot → gọi AI → kiểm tra output/quyền → transaction ngắn để lưu. Với thao tác định thay đổi dữ liệu hiện hành, kiểm tra lại version/revision mới nhất; nếu version thay đổi thì trả lỗi xung đột, không áp output cũ lên dữ liệu mới. Ngoại lệ đã quy định: review bản cũ có thể lưu cho đúng Submission nhưng không đổi Task; report dùng snapshot cố định tại asOf, không cần các Task giữ nguyên đến lúc AI trả lời. Đọc/ghi kiểm tra cùng project kể cả truy cập trực tiếp bằng ID.

## 5. API dự kiến

**Mọi method/path trong phần này chỉ là đề xuất chưa triển khai.** Prefix `/api` cũng chưa tạo. Các object tên viết hoa bên dưới là shape ở mục 3, không phải type đã có. Owner tự làm API luồng mình; TV2 cung cấp helper session/quyền/data cho TV1/TV3.

Quy ước lỗi chung: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND` cho đối tượng không tồn tại/không được phép lộ, `422 VALIDATION_ERROR`, `409 VERSION_CONFLICT`/`INVALID_TRANSITION`/`IDEMPOTENCY_CONFLICT`, `502 AI_INVALID_OUTPUT`/`AI_UNAVAILABLE`, `504 AI_TIMEOUT`, `500 INTERNAL_ERROR`. Không trả secret hoặc stack trace. Chọn 403/404 theo chính sách thống nhất để tránh lộ dữ liệu project khác.

| Method/path dự kiến | Owner | Quyền | Request chính → `data` response | Lỗi đặc thù |
|---|---|---|---|---|
| `GET /api/session` | TV2 | Session hợp lệ | Không body → `{user: User, memberships: ProjectMember[]}` | 401 |
| `GET /api/users` | TV2 | Session hợp lệ, phạm vi danh sách demo đã chốt | Không body → `User[]` để leader chọn thành viên | 401/403 |
| `POST /api/projects` | TV1 | Session hợp lệ | `{name, goal, deliverables, deadline, timeZone}` → `{project: Project, member: ProjectMember}`; tự tạo leader | 422 |
| `GET /api/projects/:projectId` | TV1 | Member | Không body → `{project: Project, members: ProjectMember[]}` | 404 |
| `PATCH /api/projects/:projectId` | TV1 | Leader, chưa có Plan | Các field Project muốn sửa → `Project` | 409 nếu Plan đã tồn tại; 422 |
| `POST /api/projects/:projectId/members` | TV1 | Leader, chưa có Plan | `{userId, skills, availableHoursPerWeek, canAccept}` → `ProjectMember`, role mặc định member | 409 trùng user/Plan đã tồn tại; 422 |
| `PATCH /api/projects/:projectId/members/:memberId` | TV1 | Leader, chưa có Plan | `{skills?, availableHoursPerWeek?, canAccept?}` → `ProjectMember` | 409 Plan đã tồn tại; 422 |
| `POST /api/projects/:projectId/plan` | TV1 | Leader; chưa có Plan | Không body; đọc Project/members đã lưu → `Plan` draft có gắn `aiMode` | 409 đã có Plan; 422 thiếu input; 502/504 |
| `GET /api/projects/:projectId/plan` | TV1 | Member | Không body → `Plan` hoặc null nếu chưa có | 404 project |
| `PUT /api/plans/:planId/draft` | TV1 | Leader, draft | `{expectedVersion, draftTasks}` → `Plan` đã validate; ID mới để null cho server cấp | 409 version/published; 422 dependency/criteria |
| `POST /api/plans/:planId/publish` | TV1 | Leader | `{expectedVersion, approved: true}` + `Idempotency-Key` → `{plan: Plan, tasks: Task[]}` | 409 version/key; 422 chưa duyệt/input sai |
| `GET /api/projects/:projectId/tasks` | TV2 | Member | Không body → `Task[]` đã công bố | 404 project |
| `GET /api/tasks/:taskId` | TV2 | Member | Không body → `Task` | 404 |
| `GET /api/projects/:projectId/messages` | TV2 | Member | Không body → `Message[]` | 404 project |
| `GET /api/tasks/:taskId/progress-updates` | TV2 | Member | Không body → `ProgressUpdate[]` | 404 |
| `POST /api/projects/:projectId/messages` | TV2 | Member; update thêm kiểm tra assignee/leader | `{content, taskId?}` + key → `{message: Message, progressUpdate: ProgressUpdate?, task: Task?}` | 422 task ngoài project; 502/504 AI; không đổi task nếu thiếu quyền |
| `POST /api/messages/:messageId/resolve` | TV2 | Tác giả message, đồng thời assignee/leader của task | `{taskId, requestedStatus, blocker?, expectedTaskVersion}` + key → `{message, progressUpdate, task}` | 403; 409 version/đã resolve khác nội dung; 422 thiếu blocker |
| `POST /api/tasks/:taskId/submissions` | TV3 | Assignee/leader | `{contentType, content, expectedTaskVersion}` + key → `{submission: Submission, task: Task}` | 409 version/done; 422 |
| `GET /api/tasks/:taskId/submissions` | TV3 | Member | Không body → `Submission[]` theo revision | 404 |
| `POST /api/submissions/:submissionId/review` | TV3 | Assignee/leader | Không body, key → `{review: Review, task: Task}` | 502/504; không dùng bản cũ để đổi status |
| `GET /api/submissions/:submissionId/review` | TV3 | Member | Không body → `Review` hoặc null khi chưa có | 404 submission |
| `POST /api/tasks/:taskId/accept` | TV3 | Leader/`canAccept` | `{submissionId, expectedTaskVersion}` + key → `Task` đã nghiệm thu | 409 revision cũ/không in_review; 422 criterion chưa met |
| `POST /api/projects/:projectId/reports` | TV3 | Leader | `{periodStart, periodEnd}` + key → `WeeklyReport` | 422 khoảng kỳ; 502/504 |
| `GET /api/projects/:projectId/reports` | TV3 | Member | Không body → `WeeklyReport[]` | 404 project |
| `GET /api/reports/:reportId` | TV3 | Member | Không body → `WeeklyReport` và nguồn có thể mở qua API đọc | 404 |

`requestedStatus` khi resolve chỉ nhận `in_progress` hoặc `blocked`. Message không phải của người gọi không được resolve. POST chat thiếu quyền sửa task trả Message `no_change` và thông báo lý do, không tạo ProgressUpdate; xác định rõ task không đồng nghĩa được phép cập nhật. Chat mơ hồ trả thành công với `clarification_required`, không phải lỗi HTTP. Nếu AI lỗi, không lưu cập nhật nghiệp vụ; UI giữ nội dung nhập để retry và thông báo chưa lưu. Gửi lại chat đã xử lý phải replay, không phân tích AI lần hai làm đổi kết quả.

### Chống retry và ghi trùng

- Header `Idempotency-Key` là chuỗi client tạo một lần cho một thao tác, giữ lại khi retry. Scope theo người dùng đã xác thực + method/path + key; server lưu fingerprint request và kết quả thành công. Cùng key/cùng nội dung trả kết quả cũ; cùng key/khác nội dung trả `409 IDEMPOTENCY_CONFLICT`. Kiểm tra quyền hiện tại trước khi trả replay.
- Bắt buộc cho publish, chat/resolve, submission, review, accept và report như bảng. Với project/member/plan, dùng unique constraints và xử lý conflict; nếu bổ sung key phải giữ cùng quy ước.
- Publish: unique Task ID từ draft và một lần publish cho Plan; transaction gồm toàn bộ Task + Plan + kết quả key. Gọi lại Plan đã published với key mới nhưng vẫn duyệt hợp lệ trả bộ Task đã có, không tạo bộ mới. Replay hợp lệ được kiểm tra trước expectedVersion cũ; không cho sửa bản published.
- Review: unique `submissionId`; nếu đã có Review hợp lệ thì trả bản cũ, không gọi AI lại. AI lỗi chưa có Review thì có thể retry. Submission lưu và đổi trạng thái atomic; resolve lưu Message resolution, ProgressUpdate và Task atomic, unique `messageId` ngăn cập nhật hai lần.
- Chỉ lưu kết quả thành công để replay. UI không tự retry vô hạn khi 422/409; nạp dữ liệu mới và yêu cầu người dùng kiểm tra. Transaction, ràng buộc unique và cách lưu key do TV2 điều phối ở phiên triển khai.

## 6. Interface AI dự kiến và ranh giới tin cậy

TV3 cung cấp interface khái niệm `generate(kind, input)` với `kind=planner|coordinator|reviewer|weekly_report`; chữ ký mã cụ thể chưa chốt. Thành công trả `{proposal, aiMode}`; lỗi trả mã chuẩn để API ánh xạ 502/504. Không phải endpoint AI chung mở cho client.

| Kind | Input backend cung cấp | Proposal chưa tin cậy | Bên kiểm tra và lưu |
|---|---|---|---|
| planner | Project và ProjectMember đã lưu | Danh sách task nháp, member được gợi ý, deadline, tiêu chí và dependency bằng khóa tạm | TV1 kiểm tra member/time/criteria/cycle; server đổi khóa tạm thành ID, lưu Plan draft; không tạo Task |
| coordinator | Message và danh sách task người gọi được đọc | `taskId?`, `requestedStatus?`, `blocker?`, `clarificationQuestion?`, ý định cập nhật/trao đổi | TV2 kiểm tra task/ý định/quyền/chuyển trạng thái; chỉ lưu update chắc chắn |
| reviewer | Submission và criteriaSnapshot | Kết quả theo criterionId, evidence, missing, suggestion, summary | TV3 kiểm tra schema/ID/quote/độ đầy đủ; lưu Review; không nghiệm thu |
| weekly_report | metrics và nguồn từ snapshot DB | SummaryItem[] | TV3 kiểm tra ref/key, không cho đổi metrics; lưu WeeklyReport |

Output không hợp lệ không trở thành trạng thái đã lưu. Chặn prompt injection: chat/submission được đặt trong phần dữ liệu, không cho nó thay đổi system instruction, quyền, secret hoặc tool; không thực thi đoạn mã được nộp. Không render HTML/Markdown nguy hiểm. AI không tự gọi DB/API để ghi dữ liệu. Mock tuân cùng shape và ghi `aiMode=mock`, không âm thầm giả AI thật khi provider lỗi.

## 7. Ví dụ JSON dự kiến

Các ID dưới chỉ là dữ liệu mẫu để ba luồng thống nhất. Giả sử `p1`, `u1/u2/u3`, memberships `m1/m2/m3` đã lưu, m1 là leader, m2 là assignee. Không phải dữ liệu đã seed hay API đang chạy.

### Đề xuất AI chưa được duyệt/lưu

```json
{
  "proposal": {
    "tasks": [{
      "tempKey": "draft-a",
      "title": "Soạn nội dung demo",
      "description": "Nộp đoạn Markdown giới thiệu và cách sử dụng",
      "assigneeMemberId": "m2",
      "deadline": "2026-11-08T10:00:00Z",
      "criteria": ["Có mục tiêu", "Có hướng dẫn sử dụng"],
      "dependencyTempKeys": []
    }]
  },
  "aiMode": "mock"
}
```

### Plan nháp sau khi backend kiểm tra/lưu

```json
{
  "data": {
    "id": "pl1",
    "projectId": "p1",
    "status": "draft",
    "version": 1,
    "draftTasks": [{
      "id": "t1",
      "title": "Soạn nội dung demo",
      "description": "Nộp đoạn Markdown giới thiệu và cách sử dụng",
      "assigneeMemberId": "m2",
      "deadline": "2026-11-08T10:00:00Z",
      "criteria": [
        {"id": "c1", "text": "Có mục tiêu"},
        {"id": "c2", "text": "Có hướng dẫn sử dụng"}
      ],
      "dependencyTaskIds": []
    }],
    "aiMode": "mock",
    "approvedByMemberId": null,
    "publishedAt": null,
    "createdAt": "2026-11-07T02:00:00Z"
  }
}
```

Tại đây chưa có Task chính thức. Request publish dự kiến `{ "expectedVersion": 1, "approved": true }` cùng key `publish-pl1-1`; server tạo t1 `todo`, `version=1`, các field nghiệm thu null, Plan chuyển published/version 2. Retry phải trả đúng t1.

### Chat mơ hồ — chưa thay Task

```json
{
  "data": {
    "message": {
      "id": "msg1", "projectId": "p1", "authorMemberId": "m2",
      "content": "Phần đó đang bị chặn", "taskId": null,
      "candidateTaskIds": ["t1"], "resolution": "clarification_required",
      "clarificationQuestion": "Bạn đang nói task t1 và bị chặn bởi điều gì?",
      "aiMode": "mock", "createdAt": "2026-11-07T02:10:00Z"
    },
    "progressUpdate": null,
    "task": null
  }
}
```

Resolve dự kiến `{ "taskId": "t1", "requestedStatus": "blocked", "blocker": "Thiếu hướng dẫn sử dụng từ nhóm", "expectedTaskVersion": 1 }`. Sau kiểm tra quyền/version, server lưu `pu1` với `messageId=msg1`, `statusBefore=todo`, `statusAfter=blocked` và đổi Task version 2. Đây là cập nhật có nguồn, không suy phần trăm.

### Nộp và review theo criterion ổn định

Request nộp dự kiến `{ "contentType": "markdown", "content": "Mục tiêu: giới thiệu TeamFlow AI.", "expectedTaskVersion": 2 }`. Server lưu s1/revision 1, criteriaSnapshot c1/c2, submittedAt riêng; Task in_review/version 3. Một Review mock hợp lệ về shape:

```json
{
  "data": {
    "review": {
      "id": "r1", "projectId": "p1", "taskId": "t1", "submissionId": "s1",
      "results": [
        {"criterionId": "c1", "verdict": "met", "evidence": [{"submissionId": "s1", "quote": "Mục tiêu: giới thiệu TeamFlow AI."}], "missing": "", "suggestion": "Giữ mục tiêu này."},
        {"criterionId": "c2", "verdict": "insufficient_evidence", "evidence": [], "missing": "Chưa có nội dung chứng minh cách sử dụng.", "suggestion": "Bổ sung các bước sử dụng trong bài nộp lại."}
      ],
      "summary": "Có mục tiêu; cần bổ sung bằng chứng cho hướng dẫn sử dụng.",
      "aiMode": "mock", "createdAt": "2026-11-07T02:20:00Z"
    },
    "task": {
      "id": "t1", "projectId": "p1", "planId": "pl1",
      "title": "Soạn nội dung demo", "description": "Nộp đoạn Markdown giới thiệu và cách sử dụng",
      "assigneeMemberId": "m2", "deadline": "2026-11-08T10:00:00Z",
      "criteria": [{"id": "c1", "text": "Có mục tiêu"}, {"id": "c2", "text": "Có hướng dẫn sử dụng"}],
      "dependencyTaskIds": [], "status": "in_review", "version": 3,
      "acceptedSubmissionId": null, "acceptedByMemberId": null, "acceptedAt": null,
      "createdAt": "2026-11-07T02:05:00Z"
    }
  }
}
```

Không thể nghiệm thu ví dụ này khi còn `insufficient_evidence`. Có `not_met` thì chuyển `changes_requested`; nộp lại luôn tạo s2/revision 2, không sửa s1.

### Báo cáo snapshot mẫu, không phải scheduler

Giả sử tại mốc dưới chỉ có t1 in_review, một progress pu1 và một submission s1 như trên; task chưa đến deadline. JSON là toàn bộ shape WeeklyReport minh họa:

```json
{
  "data": {
    "id": "wr1", "projectId": "p1", "generatedByMemberId": "m1",
    "periodStart": "2026-11-01T17:00:00Z",
    "periodEnd": "2026-11-07T02:30:00Z",
    "asOf": "2026-11-07T02:30:00Z",
    "metrics": {
      "statusCounts": {"todo": 0, "in_progress": 0, "blocked": 0, "in_review": 1, "changes_requested": 0, "done": 0},
      "dueInPeriodTotal": 0, "submittedOnTimeTotal": 0, "acceptedOnTimeTotal": 0,
      "overdueOpenTotal": 0, "submissionsInPeriodTotal": 1, "progressUpdatesInPeriodTotal": 1
    },
    "sourceRefs": [{"entity": "Task", "id": "t1"}, {"entity": "ProgressUpdate", "id": "pu1"}, {"entity": "Message", "id": "msg1"}, {"entity": "Submission", "id": "s1"}, {"entity": "Review", "id": "r1"}],
    "summary": [{
      "text": "Có một bài nộp trong kỳ; hướng dẫn sử dụng vẫn cần bổ sung bằng chứng.",
      "sourceRefs": [{"entity": "Submission", "id": "s1"}, {"entity": "Review", "id": "r1"}],
      "metricKeys": ["submissionsInPeriodTotal"]
    }],
    "aiMode": "mock", "createdAt": "2026-11-07T02:30:05Z"
  }
}
```

## 8. Chốt trước khi triển khai

TV2 dẫn chốt stack/database/transaction, ID vật lý, session và tài khoản demo, helper quyền, lưu key retry và giới hạn input; TV1 xác nhận UI/publish/version; TV3 xác nhận wrapper AI, provider/model, timeout, output validation và nguồn báo cáo. Chốt `canAccept` cho từng tài khoản, cách hiển thị timezone và khoảng tuần mặc định. Giữ tên field/enum/shape thiết kế này hoặc cập nhật đồng bộ với bên sử dụng trước khi đổi phá vỡ; không dùng quyết định thiết kế để tuyên bố tính năng đã chạy.

## 9. Bổ sung tương thích trong phiên TV2

Giữ nguyên các field/enum gốc. Những API bổ sung dưới phục vụ P02 và nhãn thành viên tracking, không triển khai nghiệp vụ planning/delivery.

| Method/path | Owner | Quyền | Request → data response | Lỗi chính |
|---|---|---|---|---|
| `POST /api/session` | TV2 | Server bật `ENABLE_DEMO_AUTH=true`; cùng origin | `{demoAccount: "TV1" \| "TV2" \| "TV3"}` (chấp nhận alias `account`) → `{user: User, memberships: ProjectMember[]}`; cookie opaque HttpOnly | 403 demo tắt/khác origin; 422 body sai; 409 seed thiếu; 503 DB lỗi |
| `DELETE /api/session` | TV2 | Cookie hiện hành; kiểm tra cùng origin | Không body → `{signedOut: true}`, thu hồi session hiện hành | 403 khác origin; 503 DB lỗi |
| `GET /api/projects` | TV2 | Session hợp lệ | Không body → `ProjectSummary[]` chỉ project có membership | 401/503 |
| `GET /api/projects/:projectId/members` | TV2 | Member của project | Không body → `ProjectMember[]` | 401/404/503 |

`ProjectSummary` mở rộng Project bằng `planStatus: draft|published|null`, `memberCount: integer`, `taskCounts: {total, done, blocked}`; chỉ đếm Task thuộc Plan published. POST tạo project/thành viên tại cùng path vẫn do TV1 sở hữu và hiện chưa implement.

`GET /api/projects/:projectId/tasks` trả `TaskListItem[]`: giữ toàn bộ Task và thêm `latestProgressUpdate: ProgressUpdate|null`. Đây là read model tương thích để hiển thị blocker/cập nhật gần nhất, không thêm field vào entity Task hay tạo trạng thái mới. `GET /api/tasks/:taskId` vẫn trả Task gốc.

Session demo không có global role và không yêu cầu mã truy cập. Server kiểm tra `ENABLE_DEMO_AUTH=true`, chỉ ánh xạ ba `demoAccount` đã seed, lưu hash token ngẫu nhiên cùng hạn 8 giờ; quyền luôn đọc ProjectMember mới nhất. Không nhận role/userId từ client làm danh tính. Mọi mutation kiểm tra origin; đây là xác thực demo, chưa phải đăng nhập production.

Giới hạn đã dùng: request JSON tối đa 32 KB; chat/blocker tối đa 5.000 ký tự; taskId tối đa 200 ký tự khi mutation; `Idempotency-Key` 8–128 ký tự chữ/số/gạch nối/gạch dưới. Body mutation strict, không chấp nhận field userId/role thừa. Xử lý key hiện chỉ được triển khai cho tracking; TV1/TV3 phải nối helper khi thực hiện API của mình.

`COORDINATOR_MODE=mock` là chế độ quy tắc demo mặc định, luôn lưu `aiMode=mock`. `real` gọi đúng interface AI của TV3; provider hiện chưa implement nên báo lỗi, giữ input, không tự fallback. AI tự đoán task mà chat chưa chỉ rõ ID hoặc người dùng chưa chọn task sẽ phải hỏi lại. Không có phần trăm tiến độ, tự đổi deadline/assignee/criteria hay tự ghi done.
