# TV2 — Bàn giao triển khai Tracking, Neon và Session

Phạm vi: phần TV2 theo [nhiệm vụ](tasks/TV2_TRACKING.md), [AGENTS](../AGENTS.md) và [contracts](CONTRACTS.md). Giữ stack Next.js 16.4.5, React 19.3.1, TypeScript strict, Tailwind v4, Drizzle 0.45.4/Kit 0.31.11 và Neon.

## Trạng thái và giới hạn

Đã triển khai nền DB/session/quyền, API tracking, P02 dữ liệu/phiên demo, P05 bảng task, P06 shell responsive, P07 chat/resolve. Không thay API planning/delivery hoặc provider AI của TV1/TV3.

- Schema 12 bảng, entry `src/server/db/schema/index.ts`; cấu hình `drizzle.config.ts` dùng `DATABASE_DIRECT_URL` direct/unpooled. Chạy `npm run db:migrate` theo journal, chỉ TV2 áp dụng lên DB chung.
- Migration `0000_rare_logan.sql` / `0000_tracking_foundation.sql`, `0001_romantic_starjammers.sql` và `0002_invariants.sql` tạo 10 bảng entity và 2 bảng kỹ thuật (`sessions`, `mutation_requests`/`mutation_results`).
- Seed chỉ thêm ba tài khoản TV1/TV2/TV3 (`demo-tv1`, `demo-tv2`, `demo-tv3`), không overwrite và không tạo project/task sản phẩm. Không có role toàn cục; role và canAccept nằm trên membership do luồng planning quản lý.
- Đã triển khai session demo, quyền server, project/member readers, task list/detail và chat/resolve có persistence thật.
- Coordinator mặc định là quy tắc demo có nhãn mock, chưa phải AI thật. Không sửa lớp AI của TV3. Chế độ real không tự fallback khi provider lỗi.
- Planning/create/publish của TV1, submission/review/accept/report của TV3 vẫn là 501.

## Bản đồ entry và ownership

| Entry | Owner | Cách dùng / đầu ra |
|---|---|---|
| `src/features/tracking/index.ts` | TV2 | Public UI: `ProjectsPage`, `TaskList`, `TaskDetail`, `ProjectChat`, `TrackingWorkbench`, `SessionBar` |
| `src/features/tracking/components/` | TV2 | P02/P05/P06/P07, CSS module dùng token gốc; không sửa thư viện UI của TV1 |
| `src/features/tracking/server/service.ts` | TV2 | Interface ổn định; implementation tại `implementation.ts` |
| `src/features/tracking/server/neon-repository.ts` | TV2 | Query/ghi tracking; ghi phải nằm trong transaction idempotency |
| `src/features/tracking/server/policy.ts` | TV2 | Quyết định bảo thủ: đúng task/quyền/trạng thái/bằng chứng blocker mới ghi |
| `src/features/tracking/server/coordinator.ts` | TV2 | Nối interface TV3, timeout/output schema hoặc mode mock được chọn rõ |
| `src/features/tracking/server/handlers.ts` | TV2 | HTTP adapter, strict body, giới hạn input, session/origin/key |
| `src/server/db/schema/index.ts` | TV2 | Một nguồn schema cả nhóm; không tạo schema độc lập ở feature khác |
| `src/server/db/client.ts` | TV2 | Lazy `getDb()` trả Drizzle Neon WebSocket/Pool, hỗ trợ transaction tương tác |
| `src/server/db/mappers.ts` | TV2 | toUser/Project/Plan/Task/Message/ProgressUpdate/Submission/Review/WeeklyReport |
| `src/server/db/idempotency.ts` | TV2 | findMutationResult/runIdempotent: key theo user + method/path, fingerprint, transaction lock và replay |
| `src/server/auth/index.ts` | TV2 | requireSession/sessionProvider, requireMembership, authorizationProvider |
| `src/server/auth/demo-session.ts` | TV2 | Session opaque 8 giờ, hash token trong DB, cookie HttpOnly/SameSite |
| `src/server/data/project-queries.ts` | TV2 | ProjectSummary, member readers, danh sách User demo |
| `src/server/http/api-error.ts` | TV2 | ApiError, apiHandler, readJson, assertSameOrigin |

## Chuẩn bị môi trường và dữ liệu

1. Cấu hình `DATABASE_URL` pooled và `DATABASE_DIRECT_URL` direct trong `.env.local`; không gửi credentials vào chat hoặc commit.
2. TV2 là người duy nhất chạy `npm run db:migrate` trên DB chung. Đọc SQL trước khi áp dụng; không dùng `push`/wipe/reset database.
3. Chạy `npm run db:seed`: chỉ thêm `demo-tv1`, `demo-tv2`, `demo-tv3` nếu chưa có; không tạo project/plan/task được công bố giả.
4. Bật `ENABLE_DEMO_AUTH=true`, đặt `DEMO_ACCESS_CODE` tối thiểu 16 ký tự. Mã này là quyền truy cập chế độ demo có chủ ý; mọi người biết mã có thể chọn ba danh tính demo.
5. Tại `/app`, nhập mã và chọn TV1/TV2/TV3. Nhãn trong bộ chọn là vai trò gợi ý của dữ liệu demo; quyền thực tế luôn từ ProjectMember của từng project.

## Interface bàn giao TV1
- `src/server/auth`: `requireSession()`, `sessionProvider`, `authorizationProvider`. Helpers đọc lại membership phía DB.
- `src/server/db/client`: `getDb()`, `Database`, `Transaction`, `DataConnection`.
- `src/server/db/schema`: export 12 bảng entities.
- `src/server/db/mutations`: `mutationIdentity` và `commitMutation`.
- `listSessionProjects(session)` cung cấp project và số task thực cho P02.

## Interface bàn giao TV3
- Giữ nguyên `generate('coordinator', input)` và output ở `src/server/ai/contracts.ts`.
- Public UI `src/features/tracking`: `TrackingWorkbench`, `TaskDetailPanel`, `DeliverySlotProps`, `WorkspaceData`, `DemoSessionBar`.
- Gắn UI Delivery qua prop `renderDelivery` của Workbench hoặc `deliverySlot` của TaskDetailPanel.
- `readReportSnapshot(session, projectId)` trong `src/server/db/report-snapshot.ts` trả `{asOf,sources}`.

## Kiểm chứng
- `npm test`: PostgreSQL PGlite áp toàn bộ migration rồi kiểm tra quyền, session, chat/resolve, atomic rollback, retry/concurrency, version, timeout/output AI.
- `npm run test:ui`: kiểm tra filter, drawer/focus/dirty form, responsive 360px, IME, retry giữ input/key, resolve và escape nội dung.
- `npm run check` và `npm run build`: bắt buộc trước bàn giao.
