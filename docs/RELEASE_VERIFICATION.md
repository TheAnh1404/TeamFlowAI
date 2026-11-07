# Kiểm chứng bản tích hợp TV1 / TV2 / TV3

Ngày kiểm chứng: **07/11/2026**. Nhánh bàn giao: **tv1_hung**. Commit theo yêu cầu: `full function of TeamFlow AI`.

## Kết luận và phạm vi

**PASS cho vòng nghiệp vụ MVP trên ứng dụng production chạy cục bộ**, dùng PostgreSQL PGlite lưu bền và AI mẫu được ghi nhãn. Có đủ ba module theo `docs/tasks/TV1_PLANNING.md`, `TV2_TRACKING.md`, `TV3_DELIVERY.md` để chạy luồng dự án → kế hoạch → chat → nộp/review/nghiệm thu → báo cáo. Đây không phải chứng nhận triển khai Neon hoặc chất lượng AI thật.

Các checklist thời gian 240 phút/video trong tài liệu thiết kế là kế hoạch lịch sử, không được đánh dấu hoàn thành bằng kiểm thử tự động. Phiên này kiểm tra sản phẩm hiện có và xuất bản lên nhánh được yêu cầu; không tạo video hoặc triển khai dịch vụ.

## Ma trận kiểm chứng

| Phần | Hành vi được đối chiếu | Bằng chứng thực chạy |
|---|---|---|
| TV1 — P01, shell | CTA vào `/app`, thông điệp/giới hạn ba trợ lý, dữ liệu minh họa, bốn FAQ, liên kết phần nội trang, 360px | Mã `src/app/page.tsx`; browser rehearsal production và ảnh `landing-mobile.png` |
| TV1 — P03/P04, planning | Nhập dự án/thành viên/kỹ năng/giờ rảnh; làm rõ đầu vào; tạo và sửa nháp; chưa có task trước duyệt; công bố bởi leader; giữ ID; version/cycle/deadline/member/retry | `planning.test.ts`, `planner-quality.test.ts`, browser planning và rehearsal |
| TV2 — dữ liệu/session | Áp migrations lên DB kiểm thử riêng; token có hạn/rotation/revoke; quyền đọc từ DB, chống giả role và truy cập project khác; rollback/replay | `tracking.test.ts`, `delivery.test.ts`; các phiên TV1/TV2/TV3/MENTOR riêng trong production |
| TV2 — P05/P06/P07 | Bảng/lọc, desktop drawer/focus/Escape, mobile; chat mơ hồ chưa đổi task; resolve đúng task/quyền/version; blocker không thay deadline/assignee/criteria; không tự done | `test:ui`, `tracking.test.ts`; TV2 chat/resolve và kiểm API thực trong rehearsal |
| TV3 — nộp/review/nghiệm thu | Nộp trực tiếp, giữ revision; thiếu bằng chứng không đủ nghiệm thu; từ chối criterion/quote giả; một review khi gửi đồng thời; review cũ không đổi bài mới; con người nghiệm thu bản mới nhất | `delivery.test.ts`, `agent-policies.test.ts`; TV2 nộp thiếu → review → nộp lại bản 2; TV1 nghiệm thu; TV3 nộp/review bằng phiên riêng |
| TV3 — P08/báo cáo | Leader bấm tạo; backend tính số liệu; `[start,end)` và bằng deadline; tách nộp/nghiệm thu; snapshot không đổi theo task; nguồn đúng quyền/project | `report-metrics.test.ts`, `delivery.test.ts`, rehearsal: 3 bài nộp, 1 cập nhật, 1 task done; mở đúng bài nộp qua source API |
| AI dùng chung/cấu hình | Bốn kind; validation, timeout và lỗi; khóa mã hóa theo user, không echo; phân biệt kiểm khóa/model với chạy thử agent; context không lẫn tài khoản | `agent-policies.test.ts`, `ai-settings.test.ts`, planning browser fixture; production lưu khóa giả ở mode mock và kiểm riêng tư/persistence/xóa |
| Nâng cấp đã yêu cầu | Timeline, tiến độ theo nghiệm thu, mentor chỉ đọc, cảnh báo ≥80% thời gian và ≤80% nghiệm thu, thông báo chống trùng/đã đọc | `supervision.test.ts`, `delivery.test.ts`, rehearsal đợi worker thật ở dự án hạn 30 giây |
| Lưu bền | Dữ liệu và quyền còn sau dừng/khởi động server | Rehearsal restart server rồi đọc lại tiến độ, report, mentor và trạng thái key |

## Kết quả lệnh

- `npm run check`: đạt lint và typecheck.
- `npm test`: **42/42 đạt**, không skip.
- `npm run build`: đạt toàn bộ route production hiện tại.
- `npm run test:ui`: đạt bảng/lọc, focus/drawer, mobile, chat/IME, giữ input và retry.
- `node --import tsx tests/browser/planning.ts`: đạt wizard, version/publish, lỗi giữ dữ liệu, retry submission, cấu hình AI/model/bốn agent bằng API fixture.
- `npm run test:rehearsal`: đạt ứng dụng/API/DB cục bộ thật với các phiên riêng; AI mock, không gọi OpenAI.

## Lỗi phát hiện và đã sửa

1. Đóng drawer sau đồng bộ nghiệm thu có thể bị kết quả điều hướng cũ mở lại. Sau mutation hoặc từ URL task trực tiếp, đóng giờ tải lại trang đích để hủy response điều hướng còn chạy và dùng fragment trả focus về đúng dòng task. Đóng drawer chưa lưu mutation vẫn dùng router, có xác nhận bỏ bản soạn. Có kiểm tra đóng/focus sau nghiệm thu trên production.
2. Nhãn select ở form làm rõ chat lẫn với nội dung các option. Bổ sung tên trợ năng rõ ràng và thử thao tác chính xác qua nhãn.
3. Landing thiếu một số phần P0 trong đặc tả. Hoàn thiện CTA, thông điệp, nhãn dữ liệu mẫu, ranh giới ba trợ lý và bốn FAQ; kiểm tra 360px.
4. Bổ sung kiểm thử các khoảng thiếu: criterion/quote không hợp lệ, review đồng thời, thiếu bằng chứng, quyền/retry/snapshot báo cáo và biên thời gian.

## Git và phối hợp với các nhánh khác

- Bản tích hợp xuất phát từ `ac9b64f`, đã có TV1 `76a5106`, TV2 `5d6f9ee`, TV3 `466594b`, cùng toàn bộ nâng cấp trong working tree được kiểm chứng ở phiên này.
- Sau fetch trong phiên này: `origin/tv1_hung` vẫn ở `76a5106`; target là hậu duệ nên có thể push thông thường, không force push.
- `origin/main` mới ở `5e30442` bổ sung auth/email verification và Coordinator workspace; `origin/tv3-quang` ở `a20ac46` có thêm export DOCX/Excel và ảnh. **Các commit mới này chưa được ghép vào bản bàn giao này.** Yêu cầu hiện tại là kiểm tra/push bản MVP tích hợp hiện có; không tuyên bố đã tích hợp các phần mở rộng đó.
- Main mới có migration `0003`/`0004` khác với mentor/AI settings ở nhánh này, và thay contract/session. Lần ghép main tiếp theo cần TV2 điều phối migration/contracts, giữ quyền mentor và mã hóa khóa; không nối journal hoặc chọn toàn bộ ours/theirs một cách máy móc.
- Không có unmerged entry hoặc conflict marker trong bản được kiểm tra. Các con số conflict trong nhật ký trước là mô phỏng trên main cũ, không phải kết quả merge main mới.
- `.env.local`, DB, ảnh/log kiểm thử và master key dưới `.cache/` được Git ignore. Quét mẫu credential không thấy secret thật trong tập file xuất bản; chuỗi kết nối trong tài liệu scaffold là ví dụ `user:password`.

## Giới hạn vận hành còn phải xác nhận bên ngoài

- Chưa kiểm chứng Neon chung và chưa áp migrations mới lên đó. Dữ liệu PGlite kiểm thử không thay cho Neon. Không cần Docker để chạy chế độ diễn tập.
- Chưa gọi API bằng khóa OpenAI thật của người dùng. Kiểm tra khóa/model/bốn trợ lý trong mục Cấu hình AI là bước người dùng thực hiện khi có credential; chạy thử agent có thể tính phí.
- Không chứng nhận mọi model chấp nhận JSON mode, quota còn đủ hoặc chất lượng phân công/review của mô hình thật. Lỗi provider có đường xử lý riêng, không được đổi nhãn mock thành real.
- Xác thực của bản này vẫn là session demo có mã truy cập. Luồng đăng ký/đăng nhập bằng mật khẩu/email trong main mới chưa thuộc bản này.

Hướng dẫn: [DEMO_RUNBOOK](DEMO_RUNBOOK.md), [AI_SETTINGS](AI_SETTINGS.md). Đây là biên bản mới nhất; các bàn giao trước giữ nguyên ngữ cảnh lịch sử.
