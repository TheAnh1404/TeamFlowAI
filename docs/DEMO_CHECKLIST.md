# Checklist demo 3–4 phút

Đây là kịch bản **dự kiến** cho phiên triển khai sau, chưa có tính năng nào được xác nhận hoạt động. Mọi checklist dưới đều chưa hoàn thành. Dùng [contracts](CONTRACTS.md), [timeline](TIMELINE_4H.md) và [quy tắc](PROJECT_RULES.md) làm chuẩn.

## Chuẩn bị trong phút 210–240

- [ ] TV2 chuẩn bị session demo server cho TV1/TV2/TV3, một leader và người nghiệm thu được ghi rõ; biết cách chuyển session hợp lệ, không tự khai role trong request nghiệp vụ.
- [ ] TV1 chuẩn bị sẵn nội dung nhập project: mục tiêu, đầu ra, deadline, kỹ năng/giờ khả dụng của TV1/TV2/TV3; leader vẫn thao tác tạo dự án và duyệt thật trong demo nếu luồng đã chạy.
- [ ] TV3 chuẩn bị task có tiêu chí “Có mục tiêu” và “Có hướng dẫn sử dụng”, bài nộp chỉ có mục tiêu để review chỉ ra thiếu bằng chứng. Không phụ thuộc việc AI luôn trả đúng một câu chữ.
- [ ] TV2/TV3 chuẩn bị nguồn lưu để report có ý nghĩa: progress/blocker, submission/review. Nếu có thêm dữ liệu mẫu từ trước, ghi rõ dữ liệu mẫu, không trình bày như chat vừa phát sinh.
- [ ] Kiểm tra mode thực tế từng kind AI: Planner/Coordinator/Reviewer/weekly_report. Hiển thị `real` hoặc `mock` đúng nguồn; dữ liệu đầu vào mẫu không đồng nghĩa AI mock, và UI thao tác được không chứng minh AI thật hoạt động.
- [ ] Tập luồng một lần, chuẩn bị video/dữ liệu dự phòng có nhãn. Không dùng tính năng chưa triển khai làm minh chứng; AI lỗi thì nói rõ phần lỗi/dự phòng.

## Kịch bản mục tiêu 3 phút 45 giây (225 giây)

| Thời gian | Người thao tác | Hành động dự kiến | Điểm cần chứng minh |
|---|---|---|---|
| 0:00–0:30 (30 giây) | TV1 | Tạo project, nhập mục tiêu/đầu ra/deadline và TV1/TV2/TV3 với kỹ năng/giờ khả dụng | Input đủ cho Planner, dữ liệu nhập được lưu |
| 0:30–1:05 (35 giây) | TV1 | Tạo Plan draft, sửa một tiêu chí/deadline hợp lệ, leader duyệt/công bố | Trước duyệt chưa có Task chính thức; sau duyệt hiện task với assignee/criteria ổn định |
| 1:05–1:45 (40 giây) | TV2 | Với session assignee, gửi “phần đó bị chặn”, nhận hỏi lại; chọn đúng task và nêu blocker | Khi chưa rõ không đổi task; sau resolve task đúng chuyển blocked, không đổi deadline/assignee/criteria |
| 1:45–2:45 (60 giây) | TV3 | Với session có quyền nộp, nộp đoạn Markdown thiếu hướng dẫn; yêu cầu review | Reviewer có criterion/evidence/missing/suggestion, phần thiếu là insufficient_evidence hoặc not_met có căn cứ; chưa tự done |
| 2:45–3:35 (50 giây) | TV3 | Với session leader, chọn khoảng tuần và bấm tạo báo cáo; mở nguồn task/submission/review | Metrics từ backend, kỳ/asOf/nguồn rõ, phần thiếu cập nhật không bị gọi không làm việc; đây là nút, không phải scheduler |
| 3:35–3:45 (10 giây) | TV1 | Reload màn hình chính và nêu giới hạn/mode AI thực tế | Dữ liệu còn; nói đúng phần thật, mock hoặc video dự phòng |

Không cần trình diễn hết nộp lại/nghiệm thu trong 225 giây; hai luồng này vẫn phải được kiểm tra trước demo. Nếu phải dùng report đã lưu/video để giữ thời lượng do AI lỗi, nói rõ đó là bản dự phòng và mốc dữ liệu của nó. Không gọi thao tác dự phòng là kết quả vừa tạo thành công.

## Kiểm tra trước demo (phút 180–210)

| Trạng thái | Case cần kiểm tra | Kết quả mong đợi | Đầu mối |
|---|---|---|---|
| [ ] | Plan draft chưa duyệt | Không có Task chính thức; thiếu approved bị từ chối | TV1 |
| [ ] | Publish bấm hai lần/retry cùng key; gọi lại published bằng key mới | Cùng một bộ Task, không bản sao; key trùng khác body trả conflict | TV1 + TV2 |
| [ ] | Session thiếu/sai quyền, role/userId client giả, ID khác project | Server từ chối; member không publish, người không phụ trách không đổi task; không rò dữ liệu project khác | TV2, TV1/TV3 kiểm API mình |
| [ ] | Chat “gần xong”, task mơ hồ hoặc nhiều task phù hợp | Không suy phần trăm; không tự đổi Task khi thiếu ý định/task; hỏi lại và giữ nội dung gốc | TV2 |
| [ ] | Resolve blocker rõ, resolve/retry lần hai | Chỉ cập nhật đúng task/đúng quyền, đúng một ProgressUpdate; không đổi deadline/assignee/criteria/done | TV2 |
| [ ] | Reload sau project/plan/publish/chat/submission/review/report | Đọc lại dữ liệu đã lưu server, cùng ID; không chỉ là state UI hoặc localStorage | TV1/TV2/TV3 |
| [ ] | Submission retry, nộp lại, review retry/bản cũ | Retry không nhân revision/review; nộp lại có revision mới; review cũ không đổi trạng thái bài mới | TV3 + TV2 |
| [ ] | Evidence bịa, thiếu criterion hoặc thiếu dữ liệu | Output sai bị từ chối; insufficient_evidence khi chưa đủ dữ liệu, không met vô căn cứ | TV3 |
| [ ] | Nghiệm thu và quyền canAccept | Chỉ leader/người nghiệm thu; revision mới nhất có review all-met; AI không tự done | TV3 |
| [ ] | Nộp đúng hạn nhưng nghiệm thu trễ; task chưa nộp | submittedAt và acceptedAt phân biệt; chỉ số nộp không bị đổi thành trễ do nghiệm thu; thiếu nộp hiển thị riêng | TV3 |
| [ ] | Khoảng tuần/múi giờ/biên deadline, nguồn report | `[start,end)`, đúng bằng deadline là đúng hạn; asOf rõ; sourceRef cùng project mở được; metrics không do AI sửa | TV3 + TV2 |
| [ ] | Task không có cập nhật trong kỳ | Báo “chưa có cập nhật trong kỳ”, không suy không làm việc | TV2 + TV3 |
| [ ] | AI timeout/không sẵn sàng/output sai | Lỗi rõ, không có cập nhật nghiệp vụ nửa chừng; giữ input, cho retry có kiểm soát; không giấu mock thay AI thật | TV3 và owner API |
| [ ] | Chat/bài nộp chứa lệnh bỏ qua quy tắc hoặc đoạn mã | Được xử lý như dữ liệu; không thực thi mã/đọc link, không đổi quyền/agent; render an toàn | TV2 + TV3 |
| [ ] | API key/secret, mode AI | Không xuất hiện trong client/response/Git; real/mock có nhãn đúng | TV3 |
| [ ] | Reset demo | Chỉ dữ liệu demo được chọn, không xóa dữ liệu khác; tạo lại ID và liên kết nhất quán; không reset Git | TV2 điều phối |

## Reset và phương án dự phòng

- [ ] TV2 chốt cách reset an toàn ở phiên triển khai: ưu tiên tạo project demo mới hoặc xóa có chọn lọc dữ liệu demo bằng cơ chế đã kiểm tra. Hiện chưa có seed/reset script, không suy ra lệnh để chạy. Không wipe database dùng chung.
- [ ] TV1 xác nhận project/plan/task sau reset; TV2 xác nhận membership/chat/progress; TV3 xác nhận submission/review/report không trỏ ID cũ. Kiểm tra cả trên reload.
- [ ] Chuẩn bị bộ nội dung mẫu cùng contracts và video bản ổn định; ghi ngày/mốc, nguồn và mode AI của bản ghi. Dữ liệu mẫu, mock AI và AI thật là ba khái niệm phải nói đúng.
- [ ] Nếu vòng chính chưa đạt, ghi phần thiếu/AI lỗi rõ ràng; không đánh dấu tính năng tương lai như Calendar/Meet/OAuth/bot/đọc link/tệp/repo/scheduler/Kanban/đa workspace/tự đổi deadline là đang hoạt động.
