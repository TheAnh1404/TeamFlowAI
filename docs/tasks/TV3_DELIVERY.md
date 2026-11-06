# TV3 — Delivery, review, báo cáo và AI dùng chung

## Vai trò và phạm vi sở hữu

TV3 làm **UI + API + logic** nộp bài, Reviewer, góp ý/nộp lại, nghiệm thu và báo cáo; là đầu mối lớp AI dùng chung, kiểm tra output và lỗi. Báo cáo là vai trò sản phẩm của **Coordinator**, giao TV3 triển khai để cân bằng khối lượng. Nhánh đề xuất `feat/delivery`, chưa tạo trong phiên tài liệu.

Đọc [AGENTS](../../AGENTS.md), [quy tắc](../PROJECT_RULES.md), [contracts](../CONTRACTS.md), [timeline](../TIMELINE_4H.md), [demo](../DEMO_CHECKLIST.md). Hiện chưa có mã ứng dụng; stack/provider/model **chưa chốt**. Đường dẫn mã **dự kiến**: `src/features/delivery/`, `src/features/reports/`, `src/server/ai/`; API submission/review/accept/report theo contracts. Không tạo mã trong phiên tài liệu.

Shared dependencies: TV1 cho điểm gắn UI, Task/criteria đã publish; TV2 cho session/quyền/data/transaction/migration và readers nguồn báo cáo. TV3 tự viết API luồng mình; mọi thay đổi schema đi qua TV2, UI chung qua TV1. AI chỉ đề xuất, không sở hữu quyết định quyền/lưu/nghiệm thu.

## Checklist triển khai phiên sau — tất cả chưa hoàn thành

Tổng **240 phút**; ưu tiên bản tối thiểu của ba luồng thay vì hoàn thiện một luồng rồi bỏ luồng khác.

- [ ] **TV3-N01 — Chốt nền tảng (0–10, 10 phút).** Input: contracts, stack TV2/TV1 cùng thống nhất, tài nguyên AI sẵn có. Output: signature `generate(kind, input)`, real/mock, mã lỗi/timeout và giới hạn input/output. Kiểm chứng TV1/TV2 biết cách dùng wrapper cho Planner/Coordinator; key chỉ phía server, không đưa secret vào Git.
- [ ] **TV3-N02 — Lớp AI tối thiểu (10–30, 20 phút).** Input: quyết định N01. Output: wrapper server dùng chung cho bốn kind, adapter mock cùng shape, validation output và lỗi chuẩn. Kiểm chứng không hợp lệ/timeout trả lỗi có kiểm soát; công bố interface trước phút 30. Nếu provider chưa sẵn, giao mock có nhãn trước, không âm thầm thay AI thật bằng mock.
- [ ] **TV3-F01 — Nộp bài/review/nghiệm thu (30–65, 35 phút).** Input: Task/criteria mẫu hoặc thật, session/data TV2. Output: UI + API nộp text/markdown/code, review theo criterion ID có evidence, lịch sử revision/nộp lại và nút nghiệm thu có quyền. Kiểm chứng `insufficient_evidence` không bị gọi met; nộp lại giữ bài cũ; AI không tự done; all-met chỉ chuyển done sau người có quyền bấm nghiệm thu.
- [ ] **TV3-F02 — Báo cáo bằng nút (65–90, 25 phút).** Input: Task/Message/ProgressUpdate/Submission/Review mẫu hợp contract. Output: UI + API khoảng kỳ, metrics backend, snapshot nguồn, AI summary có nguồn và real/mock. Kiểm chứng số liệu tính bằng backend độc lập lời AI, có submittedAt/acceptedAt riêng; không gọi nút là scheduler. Giao được bản tối thiểu độc lập ở phút 90.
- [ ] **TV3-I01 — Tích hợp vòng chính (90–135, 45 phút).** Input: Task/criteria thật TV1, DB/session/readers thật TV2. Output: bài nộp/review/report gắn cùng task/project, nguồn mở được và dữ liệu còn sau reload. Kiểm chứng planning → tracking → submission/review → report; cung cấp wrapper real nếu đã cấu hình hoặc ghi rõ còn mock. TV3 sửa API/logic luồng mình, không đẩy hết sang TV2.
- [ ] **TV3-I02 — Quyền/lỗi/chính xác (135–180, 45 phút).** Input: các case sai quyền, revision cũ, quote bịa, AI lỗi, deadline. Output: validation evidence/criterion/sourceRef, chống retry trùng, snapshot report nhất quán. Kiểm chứng review bản cũ không đổi task mới, nghiệm thu revision mới nhất all-met, key không lộ, injection từ chat/bài nộp không đổi hành vi.
- [ ] **TV3-S01 — Ổn định, ngừng tính năng (180–210, 30 phút).** Input: checklist demo và lỗi vòng chính. Output: sửa lỗi, chạy checks phù hợp triển khai và ghi kết quả thật. Kiểm chứng một case nộp đúng hạn/nghiệm thu trễ được trình bày riêng; report không bịa việc chưa có nguồn; AI lỗi chưa có Review/report thành công và cho retry.
- [ ] **TV3-D01 — Demo/dự phòng/bàn giao (210–240, 30 phút).** Input: bản tích hợp ổn định. Output: phần nộp thiếu yêu cầu → review → báo cáo, dữ liệu/video dự phòng cùng TV1/TV2. Kiểm chứng demo 3–4 phút, nói rõ real/mock, giới hạn AI và phần còn thiếu.

## Nhận và bàn giao dependency

| Mốc | Nhận từ ai | TV3 bàn giao | Nếu phải chờ |
|---|---|---|---|
| Phút 10–30 | TV1: điểm gắn UI; TV2: interface data/quyền, cấu trúc submission/report và ID mẫu | Wrapper bốn kind, shape output, real/mock, timeout/lỗi; nhu cầu schema để TV2 điều phối | Dùng mock cùng contract, không chờ DB để làm UI/evidence/metrics |
| Phút 90 | TV1: Task/criteria ổn định; TV2: data/readers, membership | Delivery/review/nghiệm thu/report tối thiểu thao tác độc lập; API/fixtures và lỗi biết trước | Dùng t1/c1/c2, m1/m2, s1/r1 mẫu; đánh dấu mock, không khẳng định dữ liệu đã persist |
| Phút 135 | TV1: task đã publish thật; TV2: nguồn thật/transaction/session | Submission/Review/WeeklyReport đã lưu cùng ID, nguồn report đọc được; trạng thái AI thật/mock | Cắt định dạng báo cáo đẹp, tùy chọn phụ; ưu tiên nối dữ liệu thật, không cắt bằng chứng/metrics/quyền |

## Tiêu chí hoàn thành kiểm chứng được

- [ ] Wrapper AI dùng chung có validation và lỗi chuẩn; API key phía server; mỗi output lưu có aiMode, không giả thành công khi provider lỗi.
- [ ] Bài nộp là nội dung dán trực tiếp, không chạy mã/đọc link; Markdown được render an toàn; criteriaSnapshot giữ ID đúng task.
- [ ] Một Review cho mỗi Submission, đủ criterion, quote thực tồn tại hoặc `insufficient_evidence`; thiếu bằng chứng không được met. Retry không tạo review trùng.
- [ ] Nộp lại có revision mới; review cũ không chuyển trạng thái revision mới; chỉ leader/canAccept nghiệm thu bản mới nhất all-met, ghi acceptedAt riêng submittedAt.
- [ ] Report do nút kích hoạt, khoảng kỳ và asOf rõ ràng; backend tính metrics theo contracts, summary có nguồn đã lưu; không suy thiếu cập nhật là không làm việc.
- [ ] Phút 90 ba phần tối thiểu độc lập; phút 135 nối dữ liệu thật và reload còn dữ liệu. Bàn giao shared changes, checks thực chạy, AI mode, phần thiếu và người nhận.

## Ngoài phạm vi

Không viết planning/tracking thay TV1/TV2; không sửa schema/migration hoặc UI chung độc lập. Không làm scheduler, bot ngoài app, Google Calendar/Meet/OAuth, đọc tệp/link/repo, tự nghiệm thu, tự đổi deadline hay tái lập kế hoạch. Không dùng AI làm nguồn tính số liệu/thời hạn. Checklist dành cho phiên triển khai sau, không chạy trong phiên tài liệu.
