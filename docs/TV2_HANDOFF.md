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
4. Bật `ENABLE_DEMO_AUTH=true`; chế độ demo không yêu cầu mã truy cập.
5. Tại `/app`, chọn TV1/TV2/TV3 rồi vào phiên demo. Nhãn trong bộ chọn là vai trò gợi ý của dữ liệu demo; quyền thực tế luôn từ ProjectMember của từng project.

### Sửa lỗi đăng nhập và nâng cấp foundation cũ

- “Đăng nhập demo chưa được bật trên server” là HTTP **403**, do thiếu `ENABLE_DEMO_AUTH=true`, không phải 404. Cờ chỉ bật trong `.env.local` của môi trường demo được yêu cầu; `.env.example` tiếp tục mặc định false. Đã bỏ yêu cầu mã truy cập theo yêu cầu hiện tại; session và kiểm tra quyền theo project được giữ nguyên.
- Sau khi bật cờ, phát hiện HTTP 500 do Neon còn cột snake_case của `0000_tracking_foundation.sql`, trong khi bản code hiện tại dùng cột camelCase và một số field JSONB. Không sửa ORM bằng alias tạm hoặc xóa/tạo lại bảng.
- `scripts/upgrade-legacy-database.mjs` cùng helper `scripts/lib/legacy-schema-upgrade.mjs` nhận diện đúng hash migration cũ; chỉ hỗ trợ foundation chưa có dữ liệu nghiệp vụ. Có project/task/message/mutation hoặc lịch sử không nhận diện thì dừng để review riêng.
- Script dùng một transaction và khóa các bảng, đổi tên cột/bảng kỹ thuật, chuyển array sang JSONB, bổ sung constraints/invariants của bộ migration hiện hành. Giữ nguyên User/session và kiểm tra số bản ghi trước/sau. Lịch sử foundation cũ được giữ; chỉ ghi nhận baseline hiện hành sau khi toàn bộ chuyển đổi tương đương và hai migration tiếp theo thành công.
- Các cột/constraints legacy bổ sung được giữ để tránh xóa dữ liệu. TV2 cần xét chúng khi làm thay đổi schema tiếp theo; script này không thay thế cơ chế migration thường xuyên.

```bash
# Chỉ tạo kế hoạch tại .cache/legacy-schema-upgrade/plan.sql, chưa đổi schema
npm run db:upgrade-legacy
# Chỉ áp dụng khi đúng foundation cũ, chưa có dữ liệu nghiệp vụ
npm run db:upgrade-legacy -- --apply
npm run test:legacy-schema
```

Database Neon của phiên sửa lỗi đã được nâng cấp thành công, bảo toàn 3 User và 1 session trước đó; không reset dữ liệu, không tạo project/task. Kiểm tra thực tế: đăng nhập TV2, GET session, GET projects và GET `/app` đều HTTP 200; session do kiểm tra tạo được đăng xuất riêng. Ba kiểm tra regression bao phủ preview, bảo toàn/idempotence, từ chối dữ liệu nghiệp vụ và lịch sử lạ. Database mới dùng migration chuẩn, không chạy script legacy.

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
