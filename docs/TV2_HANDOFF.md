# TV2 — bàn giao triển khai

## Trạng thái và giới hạn

Đã triển khai nền DB/session/quyền, API tracking, P02 dữ liệu/phiên demo, P05 bảng task, P06 shell responsive, P07 chat/resolve. Không thay API planning/delivery hoặc provider AI của TV1/TV3. Các tài liệu cũ mô tả giai đoạn trước scaffold không phải trạng thái triển khai hiện tại.

Chưa kiểm chứng Neon thật vì workspace chưa có `.env.local`. Chưa kiểm chứng vòng planning → tracking → delivery → report thật vì các module/API TV1/TV3 hiện vẫn là stub. Không gọi dữ liệu UI kiểm thử hoặc PGlite là dữ liệu Neon. Không đánh dấu checkpoint phút 135 hoặc toàn bộ MVP hoàn thành.

## Chuẩn bị môi trường và dữ liệu

1. Cấu hình `DATABASE_URL` pooled và `DATABASE_DIRECT_URL` direct trong `.env.local`; không gửi credentials vào chat hoặc commit.
2. TV2 là người duy nhất chạy `npm run db:migrate` trên DB chung. Đọc SQL trước khi áp dụng; không dùng `push`/wipe/reset database.
3. Chạy `npm run db:seed`: chỉ thêm `demo-tv1`, `demo-tv2`, `demo-tv3` nếu chưa có; không tạo project/plan/task được công bố giả.
4. Bật `ENABLE_DEMO_AUTH=true`, đặt `DEMO_ACCESS_CODE` tối thiểu 16 ký tự. Mã này là quyền truy cập chế độ demo có chủ ý; mọi người biết mã có thể chọn ba danh tính demo. Để tắt demo, đặt `false` và thu hồi phiên đã phát nếu cần. Cookie httpOnly, SameSite=Lax, Secure ở production; token băm được lưu DB và hết hạn sau 8 giờ.
5. Tại `/app`, nhập mã và chọn TV1/TV2/TV3. Nhãn trong bộ chọn là vai trò gợi ý của dữ liệu demo; quyền thực tế luôn từ ProjectMember của từng project, không phải tên tài khoản.
6. Khi chờ AI TV3, có thể đặt `TRACKING_AI_MODE=mock` rõ ràng. Bỏ biến này để dùng `aiProvider.generate('coordinator', input)` của TV3. Không tự chuyển sang mock khi provider lỗi.

Reset demo an toàn: tạo project demo mới qua luồng TV1, giữ nguyên dữ liệu khác. Seed lặp lại không xóa project, chat hoặc lịch sử. Chưa có chức năng xóa/reset toàn bộ DB.

## Interface bàn giao TV1

- `src/server/auth`: `requireSession()`, `sessionProvider`, `authorizationProvider`. Helpers đọc lại membership phía DB, không tin bản role/memberships gửi từ client.
- `src/server/db/client`: `getDb()`, `Database`, `Transaction`, `DataConnection`. Kết nối lazy dùng Neon Pool/WebSocket để hỗ trợ interactive transaction trên Node 24. Không gọi AI trong transaction.
- `src/server/db/schema`: export `users`, `projects`, `projectMembers`, `plans`, `tasks`, `messages`, `progressUpdates`, `submissions`, `reviews`, `weeklyReports`, `sessions`, `mutationResults`. Tên field camelCase khớp contracts; timestamps trao đổi ISO UTC.
- `src/server/db/mutations`: tạo `mutationIdentity(session.user.id, 'POST /api/...', key, input)`; kiểm quyền hiện tại, `replay` trước AI nếu có; `commitMutation(db, identity, async tx => result)` để ghi nghiệp vụ và kết quả replay cùng transaction. Không truyền key thô vào repository rồi bỏ qua identity/fingerprint. Key scope gồm user, method/path và key; replay không thay thế kiểm quyền.
- Publish phải validate draft/criteria/dependency/version và leader trước khi tạo task. Trong một transaction, chuyển Plan sang published và insert task giữ nguyên ID draft. Trigger deferred cho phép thứ tự insert/update linh hoạt nhưng commit không được có task thuộc draft. Nội dung task đã tạo bị khóa; chỉ thay status/version/các field nghiệm thu theo luồng được phép.
- `listSessionProjects(session)` cung cấp project và số task thực cho P02. Adapter P02 hiện gọi `ProjectsEntry`; TV1 có thể tái sử dụng dữ liệu và `DemoSessionBar` khi thay shell/UI chung.

## Interface bàn giao TV3

- Giữ nguyên `generate('coordinator', input)` và output ở `src/server/ai/contracts.ts`. Tracking kiểm tra shape, task/project, quyền và version; timeout mặc định 20 giây, trả 502/504, không ghi nửa chừng. Provider còn stub trả 501 rõ ràng.
- Public UI `src/features/tracking`: `TrackingWorkbench`, `TaskDetailPanel`, `DeliverySlotProps`, `WorkspaceData`, `DemoSessionBar`. Không import nội bộ delivery từ tracking.
- Gắn UI Delivery qua prop `renderDelivery({task,currentMember,onTaskChange,onDirtyChange})` của Workbench, hoặc `deliverySlot` của TaskDetailPanel. TV3 export component từ `src/features/delivery/index.ts`; TV2 nối adapter sau khi export có thật. `onDirtyChange` báo có bản đang soạn để chặn đóng drawer; `onTaskChange` nạp lại dữ liệu server. Chưa có component Delivery được gắn trong adapter thực tế.
- `readReportSnapshot(session, projectId)` trong `src/server/db/report-snapshot.ts` trả `{asOf,sources}` từ một transaction repeatable-read/read-only, nguồn chỉ trong project và đã lưu. TV3 tính metrics và lưu report từ snapshot này; không đọc lại từng nguồn ở thời điểm khác để tính metrics.
- Schema có unique submission revision theo task, một review/submission, foreign key nghiệm thu trỏ đúng submission/task/project. TV3 vẫn phải kiểm review all-met, revision mới nhất và quyền trước nghiệm thu; DB constraints không thay logic đó.

## API và lỗi

Các API GET session/users/tasks/task/messages/progress và POST messages/resolve khớp CONTRACTS. Bổ sung tương thích `POST /api/session` với `{account:'TV1'|'TV2'|'TV3',accessCode}` và `DELETE /api/session`; không nhận role/userId để cấp quyền. Mutation từ trình duyệt phải cùng Origin, body JSON tối đa 32 KB. Chat tối đa 8.000 ký tự, blocker 2.000; ID 1–128 ký tự, version nguyên dương. Chat/resolve yêu cầu `Idempotency-Key` 8–128 ký tự chữ/số/gạch ngang/gạch dưới. Cùng key khác body trả 409; retry thành công trả kết quả cũ.

`GET /api/session` thiếu phiên trả 401. Ngoài membership trả 404 để không lộ project; sai quyền trong project trả 403; validation 422; version/state/key conflict 409. Nội dung chat render dạng text, không thực thi HTML/code/link. Chat chỉ cập nhật todo/in_progress/blocked → in_progress/blocked. Các trạng thái review/done phải qua Delivery.

## Kiểm chứng

- `npm test`: PostgreSQL PGlite áp toàn bộ migration rồi kiểm tra quyền, session, chat/resolve, atomic rollback, retry/concurrency, version, timeout/output AI, ràng buộc DB và snapshot nguồn. Không thay cho test kết nối Neon.
- `npm run test:ui`: trình duyệt Edge trên Windows (Chromium trên hệ khác), fixture riêng không có endpoint ứng dụng mới. Kiểm tra filter, drawer/focus/dirty form, responsive 360px, IME, retry giữ input/key, resolve và escape nội dung. Ảnh ở `.cache/ui/`, không commit.
- `npm run check` và `npm run build`: bắt buộc trước bàn giao; ghi kết quả thực chạy ở báo cáo phiên.
- Cần chạy tiếp trên Neon: migrate/seed hai lần an toàn, đổi session TV1/2/3, tạo và publish bằng TV1, chat/resolve/reload bằng TV2, nộp/review/nghiệm thu/report bằng TV3. Chỉ xác nhận vòng tích hợp sau khi các API tương ứng thực sự hoạt động.


## Đối chiếu nghiệm thu ngày 07/11/2026

| Yêu cầu | Bằng chứng hiện tại | Phần còn cần kiểm chứng |
|---|---|---|
| DB/schema/migration/seed | 12 bảng; toàn bộ migration và seed lặp lại chạy được trên PostgreSQL PGlite | Migration/seed trên Neon thật; reload qua ứng dụng thật |
| Session/quyền | Kiểm thử token, hết hạn/thu hồi, membership, leader/canAccept, ID ngoài project; HTTP production thiếu session 401/demo tắt 403 | Đăng nhập và đổi ba tài khoản trên Neon |
| P05/P06 | Trình duyệt kiểm tra lọc, 360px, drawer/direct URL, Tab/Escape/hoàn trả focus, cảnh báo bài đang soạn | Dữ liệu task do API publish TV1 tạo; Delivery TV3 gắn slot |
| Chat/resolve | Kiểm thử mơ hồ, quyền, version, retry/concurrency, rollback, lỗi AI; mock so khớp đầy đủ mã task và chỉ nhận blocker rõ | Coordinator thật của TV3 và chat lưu Neon/reload |
| Không làm mất nội dung chat | Trình duyệt kiểm tra HTTP lỗi và cả HTTP 200 sai cấu trúc đều giữ nội dung; chỉ xóa khi response đúng schema | Cùng cơ chế này với provider/DB thật |
| Bàn giao TV1/TV3 | Helpers auth/DB/transaction, public UI slot, nguồn report snapshot và tài liệu interface | Tích hợp vòng planning → tracking → delivery → report với module thật |

Lần kiểm tra gần nhất: npm test **17/17 đạt**; npm run test:ui, npm run check, npm run build **đạt**. Kiểm tra cấu hình chỉ báo có/thiếu, không in secret: DATABASE_URL, DATABASE_DIRECT_URL, ENABLE_DEMO_AUTH và DEMO_ACCESS_CODE đều chưa có giá trị trong môi trường được nạp. Không coi các kiểm chứng cục bộ là Neon hoặc vòng MVP thật đã hoàn thành.
