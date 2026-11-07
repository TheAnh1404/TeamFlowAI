# Coordinator V2 — triển khai và vận hành

Ngày 07/11/2026. Frontend chung đang được triển khai ở phiên khác theo xác nhận của người dùng. Không coi component mẫu hoặc transport test là hệ thống production đã chạy.

## Đã có trong mã

ChatPost lưu cùng job trong transaction, trả 201 sau commit; social chat không cần AI. Feed union có cursor, lấy cũ 50/tối đa 100 item, incremental có overlap để không mất timestamp tie, Message sinh từ ChatPost không hiện trùng. Legacy messages/resolve/reports giữ response V1.

Worker đọc tác giả thật từ nguồn, kiểm membership/quyền/task version, tái dùng policy tracking. Tin quá 30 phút hoặc task version thay đổi cần xác nhận; blocker cần có trong nội dung. Completion claim/instruction-like text không tự đổi task. Raw content được bảo vệ khỏi sửa, system event không đi vào pipeline AI.

Check-in có draft/version, revision append-only, nguồn của chính tác giả, ngày hôm nay và 6 ngày trước theo timezone dự án, work item ID ổn định, phút tùy chọn/tổng tối đa 1.440. Nguồn chat/progress/submission có API gợi ý để thành viên chọn vào draft; không gọi LLM để suy giờ, không tự nhận thành tích. Bản draft chỉ tác giả; submitted revision cho thành viên dự án xem. Chỉ latest submitted revision tại snapshot được tính.

Schedule có version/effectiveAt/cursor, workdays/ngày nghỉ, pause, opt-in/tạm nghỉ từng member, sáng/cuối ngày/nhắc lại/tuần. Một slot có một tin chung; người đã submit không bị tạo lời nhắc cá nhân cuối ngày. Requests giữ roster kỳ vọng lịch sử. Mốc đến hạn dùng unique key ổn định qua retry và đổi version lịch; occurrence cũ không còn hiệu lực bị bỏ qua. Lịch bị gián đoạn tối đa một tuần được ghi nhận lại; reminder quá 60 phút expired, weekly quá 24 giờ attention, meeting quá giờ họp không chạy.

Queue claim transaction ngắn/SKIP LOCKED, lease 90 giây, fencing token, tối đa 5 attempts; backoff có jitter, tôn trọng Retry-After. Tối đa hai AI job running giữa các tick. Mỗi project có quota attempts/ngày. Không dùng setInterval trong backend làm scheduler.

Email dùng Resend, verified address do DB đọc, opt-in/suppression/allowlist, digest theo user + local date + morning/eod slot để gộp nhiều dự án. Nội dung tối thiểu và link đăng nhập. Email outbox lưu request bất biến/provider key; timeout có thể là uncertain. Ứng dụng giữ dedupe lâu hơn [cửa sổ idempotency 24 giờ của Resend](https://resend.com/docs/dashboard/emails/idempotency-keys), tự retry dừng trước 23 giờ. Webhook kiểm HMAC SHA-256 raw body, timestamp ±5 phút và event ID; so khớp vector theo [Svix](https://docs.svix.com/receiving/verifying-payloads/how-manual). Accepted khác delivered; bounce/complaint chặn email tiếp theo. Không dùng open/read để đánh giá công việc.

Xác minh email dùng token ngẫu nhiên, DB chỉ lưu hash, hết hạn 60 phút, kiểm user và địa chỉ hiện tại, token dùng một lần/idempotent. GET link chỉ điều hướng; xác minh bằng POST có session/origin. Yêu cầu xác minh giới hạn một phút/lần và cũng dùng outbox.

Report V2 chụp repeatable-read/DB timestamp và lưu snapshot/metrics trước AI; nguồn, kỳ và metrics không sửa sau đó. Task activity trigger cùng transaction cho publish/progress/submission/review/acceptance; dữ liệu cũ chỉ có baseline, không dựng lịch sử quá khứ. Engine metrics V1 được tái dùng; V2 bổ sung distinct submission/acceptance, check-in/member rollup, phút tự khai/unknown và thời gian lịch nếu có event bắt đầu. Lịch weekly/meeting kiểm version và quyền người cấu hình cả trước và sau AI. Model output kiểm source refs/quote/metric keys/số liệu. AI lỗi vẫn giữ snapshot/metrics, không tự fallback mock. Draft chỉ leader, sửa diễn giải có history, publish đúng expectedVersion và tạo event/outbox. Source API đọc nguồn tại snapshot; `hasUpdatesAfterSnapshot` tách cập nhật hiện tại.

## Cấu hình server

Giữ DB/auth hiện có. `.env.example` đã bổ sung:

```dotenv
APP_ORIGIN=https://your-app.example
COORDINATOR_AUTOMATION_ENABLED=false
COORDINATOR_SERVICE_SECRET=
COORDINATOR_DAILY_AI_JOB_LIMIT=100
EMAIL_PROVIDER=resend
RESEND_API_KEY=
EMAIL_FROM=
RESEND_WEBHOOK_SECRET=
EMAIL_SANDBOX_ALLOWLIST=
```

Secret tối thiểu 32 ký tự, sinh/lưu qua secret manager. Không thêm NEXT_PUBLIC hoặc in credential vào log. Resend cần domain/from được xác minh. Ngoài production (kể cả preview) chỉ cho phép email trong allowlist, đồng thời vẫn phải verified và opt-in đối với reminder/report. Verification mail là yêu cầu xác minh do chính người dùng bấm, được phép gửi trước verified.

AI hiện dùng provider chung của TV3. `TRACKING_AI_MODE`/`COORDINATOR_MODE=real` yêu cầu kết quả real; provider lỗi/thiếu cấu hình không thay bằng mock. Report dùng AI_MODE/provider config hiện có; nhãn aiMode được lưu đúng kết quả. Chỉ nghiệm thu real sau khi chạy provider thật.

## Migration

0003 là thay đổi auth đã có trong working tree trước phiên này, giữ nguyên. Đã tạo snapshot tương ứng; 0004 thêm bảng Coordinator/FK/index; 0005 event/baseline/append-only/frozen snapshot; 0006 verification/source immutability. Journal tăng theo thứ tự, không reset hoặc sửa SQL đã áp ở môi trường thật.

Trước khi migrate: dùng database test riêng/Neon branch, kiểm journal đang áp đến đâu, backup theo quy trình nhóm. Không chạy hai migrator đồng thời. Sau khi xác minh test branch, TV2 điều phối `npm run db:migrate` với DATABASE_DIRECT_URL đúng môi trường. Legacy helper chỉ nhận danh sách migration đã review và vẫn từ chối foundation có dữ liệu nghiệp vụ; không dùng để chuyển đổi database sản phẩm đang có project.

**Phiên này không chạy migration lên Neon chung.** Migration đã được thực thi trong database PGlite cô lập qua tests, gồm upgrade schema cũ và bảo toàn account/session.

## Scheduler adapter đã chọn

Adapter HTTP có xác thực, độc lập nhà cung cấp. Managed scheduler bên ngoài Next.js gọi:

```text
POST https://your-app.example/api/internal/coordinator/tick
Authorization: Bearer <COORDINATOR_SERVICE_SECRET>
```

Lịch `* * * * *`, timezone UTC, HTTP deadline 60 giây. Endpoint maxDuration 60, worker budget 45 giây, batch 6 job và hai tác vụ song song; rate limit bền 45 giây. Chọn dịch vụ hosting/scheduler đáp ứng nhịp một phút, không dựa vào browser hoặc cron của gói hosting chưa xác minh. Hạ tầng ngoài chưa được cấp tài khoản/cấu hình trong phiên này nên chưa có lịch managed thực được tạo.

Đặt lịch tick ngay cả khi automation flag false để xử lý chat/manual report/verification. Flag false chặn schedule dispatcher và side effect nhắc lịch; manual chat/check-in/report vẫn dùng được. Scheduler credential thiếu/sai bị từ chối trước DB. Service context không phải session leader.

Preview không gửi:

```text
POST /api/internal/coordinator/tick?dryRun=1
```

Trả mốc dự kiến/eligible member IDs, không enqueue hoặc gửi. Có thể gọi bằng `npm run coordinator:tick -- --dry-run` khi đã có server/credential; script chỉ gọi một lần, không tự tạo lịch.

Webhook provider: POST `/api/webhooks/email`, đăng ký events delivered/bounced/complained và signing secret. Webhook đến trước response provider được trả lỗi tạm thời để provider retry, không đánh rơi event âm thầm.

## Rollout

1. Ghép frontend theo [handoff](COORDINATOR_FRONTEND_HANDOFF.md), giữ fixture riêng và ghi mock.
2. Migrate DB test; hai user có session thật chat/check-in/resolve/reload. Cố tình làm AI lỗi và kiểm raw còn tồn tại.
3. Cấu hình scheduler test và secret; dry-run so giờ/timezone/ngày nghỉ/roster. Đóng mọi tab, kiểm tick vẫn chạy và reclaim sau kill worker.
4. Bật app/chat trên một project test. Đối chiếu đúng một event/slot; submit sát giờ không tạo reminder cá nhân mới.
5. Bật Resend sandbox/verified recipient/allowlist, opt-in; kiểm actual provider accepted/delivered, signed webhook, bounce suppression và uncertain retry.
6. Soạn report tuần/meeting, kiểm số liệu với nguồn, sửa check-in sau snapshot, đối chiếu nguồn cũ vẫn giữ nguyên. Member không đọc được draft; leader publish thì mới đọc.
7. Đo p95 lưu chat, độ trễ reminder/draft, backlog và chi phí trên deployment thật. Chưa công bố đạt SLO trước khi đo.

## Pause, lỗi và khôi phục

Leader PATCH settings `{expectedVersion,settings:{...enabled:false}}` để pause project; version mới làm job lịch cũ invalid. Global flag false chặn reminder tự động trên deployment, vẫn cho chat/check-in thủ công. Không xóa dữ liệu để pause.

Leader GET coordinator-settings thấy recent jobs/status/error code, lastRunAt/nextRunAt. Queued quá lâu: kiểm scheduler invocations, flag/secret, function timeout và DB. Running quá 90 giây: tick sau reclaim với token mới. Worker cũ không được ghi kết quả/failure metadata.

Attention do cấu hình/validation: sửa nguyên nhân rồi POST project job retry còn hiệu lực. Không revive reminder expired; report expired tạo request mới với kỳ rõ. Report retry giữ snapshot, không tái query nguồn khác. Email uncertain quá cửa sổ: tra provider ID/dashboard trước quyết định thủ công; endpoint từ chối resend mù.

Theo dõi SQL jobs theo status/runAt/attempts/createdAt/completedAt, reports metadata startedAt/completedAt/asOf và email delivery status. Không log chat/email/token/cookie/raw error/connection string. Đây là telemetry vận hành, không phải xếp hạng thành viên.

## Kiểm chứng trong phiên

- `npm run test:managed`: **68/68** (auth/planning/tracking/delivery/Coordinator).
- `npm run test:coordinator`: **28/28**, PGlite + fake transport/clock inputs, gồm race/dedupe/lease/DST/credentials/verification/webhook.
- `npm run test:tracking`: **18/18**; Node có warning MODULE_TYPELESS_PACKAGE_JSON cũ.
- `npm run test:legacy-schema`: **3/3**, gồm migration mới và giữ user/session.
- ESLint riêng các module Coordinator: pass.
- `npm run check`: **pass** (lint + typecheck). Các lỗi contract xuất hiện trong lúc frontend sửa song song đã được phiên frontend khắc phục; backend không sửa đè các file đó.
- `npm run build`: **pass** với `NEXT_BUILD_WORKER_THREADS=1` theo hướng dẫn môi trường managed của repo; không tắt TypeScript.
- `npm run test:ui` bị môi trường chặn `spawn EPERM` của tsx/esbuild; chưa xác minh browser E2E. Chưa áp Neon, chưa gọi AI/email thật, chưa tạo managed scheduler thật, chưa đo SLO/chi phí.

Các điều kiện triển khai ngoài ở trên còn cần cấu hình và kiểm chứng. Không đánh dấu toàn bộ Definition of Done của kế hoạch đã nghiệm thu production.
