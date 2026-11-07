# Bàn giao triển khai TV2 — Tracking, Neon và session

Phạm vi: phần TV2 theo [nhiệm vụ](tasks/TV2_TRACKING.md), [AGENTS](../AGENTS.md) và [contracts](CONTRACTS.md). Giữ stack Next.js 16.4.5, React 19.3.1, TypeScript strict, Tailwind v4, Drizzle 0.45.4/Kit 0.31.11 và Neon. Không thêm dependency, không thay lockfile, không commit/push/nhánh/remote.

## Hiện trạng

- Đã tạo và áp dụng migration `0000_tracking_foundation`: 10 bảng entity, 2 bảng kỹ thuật (`sessions`, `mutation_requests`). Trước khi áp dụng đã xác nhận database Neon chưa có bảng public. Không reset hoặc thay đổi cấu trúc dữ liệu có sẵn.
- Seed chỉ thêm ba tài khoản TV1/TV2/TV3, không overwrite và không tạo project/task sản phẩm. Không có role toàn cục; role và canAccept nằm trên membership do luồng planning quản lý.
- Đã triển khai session demo, quyền server, project/member readers, task list/detail và chat/resolve có persistence thật.
- Coordinator mặc định là **quy tắc demo có nhãn mock**, chưa phải AI thật. Không sửa lớp AI của TV3. Chế độ real không tự fallback khi provider lỗi.
- Planning/create/publish của TV1, submission/review/accept/report của TV3 vẫn là 501. Chưa có vòng sản phẩm xuyên cả ba luồng, chưa đạt checkpoint tích hợp phút 135.

## Bản đồ entry và ownership

| Entry | Owner | Cách dùng / đầu ra |
|---|---|---|
| `src/features/tracking/index.ts` | TV2 | Public UI: ProjectsPage, TaskList, TaskDetail, ProjectChat; không export server |
| `src/features/tracking/components/` | TV2 | P02/P05/P06/P07, CSS module dùng token gốc; không sửa thư viện UI của TV1 |
| `src/features/tracking/server/service.ts` | TV2 | Interface ổn định; implementation tại `implementation.ts` |
| `src/features/tracking/server/neon-repository.ts` | TV2 | Query/ghi tracking; ghi phải nằm trong transaction idempotency |
| `src/features/tracking/server/policy.ts` | TV2 | Quyết định bảo thủ: đúng task/quyền/trạng thái/bằng chứng blocker mới ghi |
| `src/features/tracking/server/coordinator.ts` | TV2 | Nối interface TV3, timeout/output schema hoặc mode mock được chọn rõ |
| `src/features/tracking/server/handlers.ts` | TV2 | HTTP adapter, strict body, giới hạn input, session/origin/key |
| `src/server/db/schema/index.ts` | TV2 | Một nguồn schema cả nhóm; không tạo schema độc lập ở feature khác |
| `src/server/db/client.ts` | TV2 | Lazy `getDb()` trả Drizzle Neon WebSocket, hỗ trợ transaction tương tác |
| `src/server/db/mappers.ts` | TV2 | toUser/Project/Plan/Task/Message/ProgressUpdate/Submission/Review/WeeklyReport: Date trong DB → ISO UTC ở DTO |
| `src/server/db/idempotency.ts` | TV2 | findMutationResult/runIdempotent: key theo user + method/path, fingerprint, transaction lock và replay |
| `src/server/auth/index.ts` | TV2 | requireSession/sessionProvider, requireMembership, authorizationProvider |
| `src/server/auth/demo-session.ts` | TV2 | Session opaque 8 giờ, hash token trong DB, cookie HttpOnly/SameSite, mã truy cập server |
| `src/server/data/project-queries.ts` | TV2 | ProjectSummary, member readers, danh sách User demo |
| `src/server/http/api-error.ts` | TV2 | ApiError, apiHandler, readJson, assertSameOrigin; không trả stack/SQL/secret |
| `src/contracts/auth.ts`, phần bổ sung project/tracking | TV2 | SessionData, ProjectSummary, TaskListItem; giữ nguyên Task/field/enum gốc |
| `src/app/app/`, các route tracking | TV2 | Adapter mỏng. Chỉ sửa P02/P05/P06/P07 và API do TV2 sở hữu |
| UI shell / primitive chung | TV1 | Giữ nguyên; TV2 dùng CSS riêng tạm thời để không cùng sửa shared UI |
| `src/server/ai/`, delivery UI/service/API | TV3 | Giữ nguyên; provider đang ném FeatureNotImplementedError |

GET `/api/projects` và GET `/api/projects/:id/members` được thêm tương thích vào file có POST planning; POST giữ nguyên stub TV1. Chi tiết request/response/quyền nằm ở mục bổ sung TV2 trong contracts. Các endpoint TV2 thực thi đều lấy actor từ session server, không dùng userId/role client tự khai.

## TV1 làm tiếp ở đâu

1. Tự triển khai API/service/repository planning, dùng `getDb()` và schema có sẵn. Drizzle nhận Date cho cột thời gian; đổi sang ISO qua mapper khi trả API.
2. Gọi `requireSession()` ở request, dùng membership/quyền server. Tạo Project và leader membership trong một transaction; không gán quyền từ client. Tài khoản demo đã có nhưng chưa thuộc project nào trước khi TV1 tạo/thêm membership.
3. Plan draft lưu JSON `DraftTask[]`, không tạo Task chính thức. Khi duyệt, insert Task và cập nhật Plan published/version trong cùng transaction; chống retry bằng helper idempotency hoặc quy ước tương thích trong contracts.
4. P05/P06/P07 chỉ đọc Task thuộc Plan published. Giữ ID task/criterion ổn định, assigneeMemberId trỏ membership, không phải User.
5. Gắn shell/primitive chung qua phối hợp, không sao chép lại UI tracking. P02 hiện do TV2 triển khai theo AGENTS/UI rules; chưa có hành vi tạo project thay TV1.

## TV3 làm tiếp ở đâu

1. Giữ interface `aiProvider.generate(kind, input)` tại `src/server/ai/contracts.ts`. Tracking gọi kind coordinator với message/task đã được server lọc theo project; không có key/role trong input.
2. Chỉ chuyển `COORDINATOR_MODE=real` khi provider thực sự sẵn sàng. Provider lỗi/timeout/schema sai → không lưu Message/Task/ProgressUpdate; UI giữ nội dung. Mock không được dùng để che lỗi real.
3. Cung cấp component delivery qua public entry. `TaskDetail` của tracking nhận `children`; TV2 sẽ ghép component TV3 vào P06 mà không cùng sửa file adapter. Hiện P06 là full page, chưa làm Drawer desktop.
4. Tự triển khai submission/review/accept/report trên schema chung. AuthorizationProvider chỉ kiểm quyền; kiểm revision/criteria, chuyển trạng thái, tăng Task.version và metrics/thời hạn thuộc service TV3.
5. Nguồn báo cáo: Task/Message/ProgressUpdate đã lưu, cùng các entity TV3. Không dùng số chat để suy không làm việc; tách submittedAt/acceptedAt; snapshot asOf/khoảng kỳ rõ ràng.

## Cấu hình và chạy

`.env.local` chứa URL pooled, URL direct và mã truy cập riêng; Git bỏ qua, không in hoặc copy giá trị vào tài liệu. URL direct của phiên này được suy ra từ cùng endpoint pooled bằng cách bỏ hậu tố `-pooler` ở hostname; không tạo database/branch Neon mới. `.env.example` chỉ có field trống và mode mock.

- `DATABASE_URL`: runtime Neon pooled.
- `DATABASE_DIRECT_URL`: migration Neon direct/unpooled.
- `DEMO_ACCESS_CODE`: ít nhất 16 ký tự; đã tạo mã ngẫu nhiên riêng trong file local, không hiển thị trong API/UI/log. Mở file riêng để lấy mã rồi vào `/app` chọn tài khoản.
- `COORDINATOR_MODE`: mock mặc định hoặc real. `OPENAI_API_KEY/OPENAI_MODEL` vẫn chờ TV3.

```bash
npm ci
npm run dev
npm run check
npm run test:tracking
npm run test:tracking:integration
```

Integration cần server TeamFlow AI tại localhost:3000 (hoặc TV2_TEST_BASE_URL là loopback khác) và Neon đã migrate/seed. Nó tạo hai project có nhãn kiểm thử, session/key riêng, rồi dọn đúng ID do lượt chạy tạo; không reset hoặc xóa dữ liệu khác. Manifest không có secret nằm trong `.cache/tv2/` để truy vết cleanup nếu có lỗi. Seed bình thường không tạo các fixture này.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

TV2 điều phối duy nhất migration trên DB chung. Generation dùng API chính thức của Drizzle Kit và transpile schema/enum vào cache local vì CLI esbuild bị `spawn EPERM` trong môi trường này. Không kết nối DB khi generate. Migration dùng migrator Neon WebSocket để toàn bộ ghi migration nằm trong transaction; không dùng vòng HTTP ghi từng câu DDL rời.

Build mặc định trong môi trường quản lý này gặp `spawn EPERM` ở checker subprocess. Chế độ tùy chọn dùng worker threads và TypeScript API checker, vẫn kiểm tra đầy đủ:

```powershell
$env:NEXT_BUILD_WORKER_THREADS = '1'
npm run build
```

Không bật ignoreBuildErrors. Ngoài môi trường bị hạn chế, `npm run build` giữ cấu hình Next mặc định. Native Node tests dùng test-isolation=none vì cùng giới hạn child process; không thêm test framework.

## Kiểm chứng và giới hạn

| Kiểm tra | Kết quả cuối phiên |
|---|---|
| Migration/seed Neon | Đã áp dụng 12 bảng public, seed ba User; không project/task sản phẩm |
| Session login/read/logout qua API thật | Đã xác nhận HTTP 200, actor TV2, danh sách ba User |
| Unit policy/security | 19 kiểm tra đã qua; không gọi DB/AI |
| Integration API/Neon | 16 case đã qua với fixture tạm; retry, concurrency, quyền, ambiguity, draft visibility, persistence |
| npm run check | Đạt lint và typecheck trên bản cuối |
| Build có worker threads, không secret | Đạt compile, TypeScript và prerender; đã kiểm tra không có DB/demo/AI credential khả dụng trong environment của build |
| Browser trực quan | Chưa kiểm tra được: browser access host không sẵn sàng |

Nguồn chính thức đã đối chiếu cho lựa chọn transport/transaction: [Drizzle Neon](https://orm.drizzle.team/docs/connect-neon), [Drizzle transactions](https://orm.drizzle.team/docs/transactions). Cấu hình worker/checker đã đối chiếu với types/source của Next 16.4.5 đang cài.

## Mốc phối hợp còn lại

- Phút 90: code/API phần TV2 hoạt động độc lập với dữ liệu kiểm thử đã lưu và Coordinator mock có nhãn. Chưa có sản phẩm tạo task thật từ planning của TV1.
- Phút 135: **chưa đạt**; cần TV1 tạo/publish project/task thật và TV3 nộp/review/report trên cùng dữ liệu. Không đánh dấu toàn bộ checklist nhóm hoàn thành.
- Chưa có AI thật, OAuth/đăng nhập production, Drawer desktop, scheduler, tích hợp Google hoặc bot ngoài ứng dụng. Không mở rộng các phần này trong phiên TV2.

Trước tích hợp nhóm cần chốt người được canAccept, giới hạn planning/provider, cơ chế composition UI TV3 và thời điểm chuyển Coordinator real. TV1 đối chiếu thêm quy tắc chỉ leader đọc nội dung draft ở UI rules khi triển khai GET Plan.

Tự review bằng git status/diff và các lệnh kiểm tra trên; stage đúng file thuộc lượt TV2 sau khi đọc diff. `next-env.d.ts` có thay đổi từ trước phiên, được bảo toàn; không stage theo thói quen toàn bộ repo. Không có commit/push do agent thực hiện.
