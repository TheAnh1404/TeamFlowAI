# Điểm nối frontend — Coordinator V2

Cập nhật 07/11/2026. Backend trong phiên triển khai `TV2_CHAT_COORDINATOR_PLAN.md`; frontend chung đang được thực hiện ở phiên khác. Không đổi response V1 messages/resolve/reports. Các component V2 bên dưới là điểm nối tham khảo; phiên backend đã trả lại quyền ghép layout, Workbench và P08 cho phiên frontend.

## Component có sẵn để ghép

- `src/features/tracking/components/coordinator-chat.tsx`: `CoordinatorChat({ data: WorkspaceData, onOpenTask })`; gồm chat V2, check-in, inbox dự án, cấu hình lịch. Thay điểm gọi `ChatPanel` trong Workbench bằng component này cho dự án thật nếu muốn dùng ngay. Dữ liệu demo frontend giữ luồng riêng, không gọi API dự án thật bằng ID fixture.
- `daily-checkin.tsx`: `DailyCheckin({data})`, dùng riêng được. Bản draft chỉ tác giả đọc; cả dự án đọc được revision đã submit.
- `coordinator-settings.tsx`: `CoordinatorSettings({data})`; preview lịch trước khi bật, preference cá nhân và pause.
- `coordinator-inbox.tsx`: `CoordinatorInbox()`; gắn một lần dưới shell đã xác thực. Nhận `verifyEmail` từ query, bỏ token khỏi URL, người dùng bấm xác minh; không tự xác minh qua GET.
- `src/features/delivery/components/CoordinatorReports.tsx`: `CoordinatorReports({projectId})`; gắn P08 cho dự án thật. Giữ `WeeklyReportView` V1 riêng cho dữ liệu/report cũ. Report V2 nháp chỉ leader; nút chia sẻ dùng expectedVersion.
- CSS riêng `coordinator.module.css`, chỉ dùng design tokens hiện có. Không đổi theme/layout của phiên frontend.

## Quy ước HTTP

Response `{data: ...}`, lỗi `{error:{code,message}}`, `Cache-Control: no-store`. JSON mutation cần Origin cùng ứng dụng, Content-Type application/json, body tối đa 32 KB. Endpoint chat/check-in/settings/meeting/report yêu cầu `Idempotency-Key` 8–128 ký tự; giữ nguyên key và body khi retry. Conflict trả 409; tải bản mới và xin người dùng xác nhận, không âm thầm nâng expectedVersion.

Contracts runtime: `src/contracts/coordinator.ts`. Helper fetch: `coordinator-client.ts`. `SourceRefV2` phân biệt với `SourceRef` V1; entity đúng chữ hoa.

DTO runtime thêm `reportArtifactV2Schema`, `dailyCheckinSchema`, `checkinRevisionSchema`, `checkinDayRowSchema`; dùng để validate response thay vì tự khai lại shape. `metrics.activeBlockers` là trở ngại của task hiện vẫn blocked tại asOf; blocker trong các revision check-in là lời tự khai tại ngày tương ứng, cần nhãn lịch sử. `memberRollup.lastUpdate` lấy cả chat/progress/submission/check-in để không gắn nhầm “chưa có dữ liệu” cho người đã nộp bài.

| Endpoint | Input / response chính |
|---|---|
| GET `/api/projects/:id/chat-feed` | `limit` 1–100 (mặc định 50), `before` tải cũ; polling `since=syncCursor`, thêm `after=cursor` khi delta `hasMore`. Trả `items: FeedItem[]`, `cursor`, `olderCursor`, `syncCursor`, `hasMore`. Merge theo kind+id vì watermark có overlap; không append trùng. |
| POST `/api/projects/:id/chat-posts` | `{content,taskId:null|string,replyToId:null|string,mentionMemberIds:[],recordUpdate:false}` → **201**, ChatPost `analysis:null`, queued/skipped. Chỉ hiển thị Đã lưu sau response thành công. |
| POST `/api/chat-posts/:id/resolve` | `{taskId,requestedStatus:'in_progress'|'blocked',blocker?,expectedTaskVersion}` → ProgressMessageResult V1. Chỉ tác giả, đúng quyền task. |
| GET `/api/projects/:id/checkins?workDate=YYYY-MM-DD` | Danh sách member/name/status/requested, `checkin` chỉ của chính user, `revisions` append-only. `draft`, `awaiting`, `submitted`, `not_requested`, `paused`, `skipped` là trạng thái cập nhật, không phải năng suất. |
| PUT `/api/projects/:id/checkins/me/:date/draft` | `{expectedVersion:0|n,payload:CheckinPayload}` → check-in/version/warning. Autosave có debounce; không ghi đè nội dung mới đang gõ khi request trước trả về. |
| POST `/api/projects/:id/checkins/me/:date/submit` | Input như draft; required completedWork hoặc noWorkUpdate. Tạo revision, không đổi Task.done. |
| GET `/api/projects/:id/checkin-sources?workDate=` | Nguồn chat/progress/submission của chính tác giả trong ngày; chọn đưa vào nháp, ID work item ổn định; không tự sinh thời gian. |
| GET/PATCH `/api/projects/:id/coordinator-settings` | PATCH `{expectedVersion,settings:Schedule}`. GET trả preview UTC, channels, jobs gần đây (leader), lastRunAt/nextRunAt. `settings.enabled` và flag server không chứng minh scheduler ngoài đã được cấu hình. |
| GET/PATCH `/api/projects/:id/checkin-preferences/me` | `{participation,pausedDates:[]}`. Không sửa preference người khác. |
| GET/PATCH `/api/notification-preferences` | PATCH NotificationPreference; GET `{preferences,emailVerified,suppressed}`. Chỉ opt-in không đủ để email hoạt động. |
| GET `/api/notifications?projectId=&cursor=` | `{items,unread,cursor}`; cursor tải trang cũ, kiểm membership hiện tại. |
| POST `/api/notifications/:id/read` | `{}`, chỉ chủ notification. Không xem readAt là đã cập nhật công việc. |
| POST `/api/auth/email-verification` | `{}` yêu cầu mail; `{token}` xác minh, phải đăng nhập đúng chủ tài khoản. Link mail mở qua route GET `/api/auth/email-verification/open`, chỉ điều hướng. |
| GET/POST `/api/projects/:id/meetings` | POST MeetingInput: title,startsAt UTC,timezone,leadMinutes,periodMode week/since_last_meeting/custom,periodStart nullable,expectedVersion:0,canceled:false,prepareNow:false. |
| PATCH `/api/projects/:id/meetings/:meetingId` | Input tương tự + expectedVersion hiện tại. Hủy bằng canceled:true. Nếu mốc chuẩn bị đã qua, chỉ chấp nhận prepareNow:true. |
| GET/POST `/api/projects/:id/coordinator-reports` | POST `{periodStart,periodEnd}` không tương lai → **202**, report queued. GET chỉ metadata; member chỉ thấy published. |
| GET/PATCH `/api/coordinator-reports/:id` | GET artifact đầy đủ với snapshot/metrics/summary/aiMode. PATCH leader `{expectedVersion,summary}` tạo revision diễn giải, giữ nguyên metrics/nguồn. |
| GET `/api/coordinator-reports/:id/sources?entity=&id=` | Nguồn **tại snapshot**, không phải bản ghi hiện tại. Chỉ mở được sourceRef có trong snapshot của report được phép xem. |
| POST `/api/coordinator-reports/:id/publish` | `{expectedVersion}` → published, một chat event, inbox/email link theo preference. Bấm xác nhận chia sẻ rõ ràng. |
| POST `/api/coordinator-reports/:id/retry` | `{}`, retry failed/attention với snapshot đã lưu, không tạo nguồn mới âm thầm. |
| POST `/api/projects/:id/coordinator-jobs/:jobId/retry` | `{}`, leader; chỉ job attention còn hiệu lực. Job expired cần tạo yêu cầu mới phù hợp, email quá cửa sổ an toàn không tự resend. |

## Các trạng thái cần thể hiện

- Chat queued: đã lưu, chờ phân tích; failed: đã lưu, chưa phân tích được. `analysis` xuất hiện qua polling, không hiển thị domain Message thêm lần nữa. Legacy message chưa gắn chatPostId mới là item riêng.
- Tin hệ thống dùng nhãn Hệ thống. Chỉ nội dung thật sự qua provider mới có aiMode; không gán mock cho raw chat hoặc reminder template.
- Polling 7,5 giây khi visible/online, lấy bù khi trở lại. Chỉ một vòng polling feed; context/tasks/member không tải lại mỗi tick. Không tự cuộn nếu đang đọc tin cũ.
- Report failed vẫn có thể có snapshot/metrics. Hiển thị số liệu và lỗi diễn giải, không báo report hoàn tất hoặc dùng mock thay AI lỗi.
- Hiển thị tự báo, nộp và nghiệm thu riêng; phút null là Chưa ghi nhận. Không suy giờ, phần trăm, chăm/lười.
- Không ghép fixture vào báo cáo dữ liệu thật; fixture phải ghi nhãn mock.

## Giới hạn tích hợp cần kiểm trên deployment

Migration 0004–0006 đã kiểm trên PGlite, chưa tự áp lên Neon. Worker cần scheduler ngoài gọi endpoint nội bộ ngay cả khi không ai mở app. Email sandbox, verified domain và webhook cần cấu hình. Chưa xác nhận SLO hoặc browser end-to-end trên hạ tầng thật. Xem `COORDINATOR_OPERATIONS.md`.
