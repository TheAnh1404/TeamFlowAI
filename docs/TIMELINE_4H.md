# Kế hoạch triển khai 240 phút

Đây là kế hoạch **phiên triển khai sau**, không phải công việc đã thực hiện trong phiên tài liệu. Hiện chưa có ứng dụng, stack **chưa chốt**, mọi checkpoint dưới đều **chưa kiểm chứng**. Đọc [contracts](CONTRACTS.md), [quy tắc](PROJECT_RULES.md) và nhiệm vụ [TV1](tasks/TV1_PLANNING.md)/[TV2](tasks/TV2_TRACKING.md)/[TV3](tasks/TV3_DELIVERY.md).

## Timeline chung

Mốc tính theo phút từ khi cả nhóm bắt đầu. Mỗi người có 240 phút; ba luồng làm song song, không cộng thành 720 phút lịch.

| Khoảng | Thời lượng | TV1 — Planning/UI chung | TV2 — Tracking/dữ liệu | TV3 — Delivery/AI/report | Dependencies | Kết quả/checkpoint dự kiến |
|---|---|---|---|---|---|---|
| 0–30 | 30 phút | N01/N02: chốt stack/contracts, layout, điều hướng, form nền, điểm gắn UI | N01/N02: chốt DB/session/quyền, điều phối dependency/migration, data helper và ID demo | N01/N02: wrapper AI bốn kind, real/mock, output validation, timeout/lỗi | 0–10 cùng chốt; 10–30 làm nền song song và công bố interface | Phút 30: có thỏa thuận field/enum/quyền, UI/data/AI interface và mock cùng contract; phần nền chưa xong phải báo rõ |
| 30–90 | 60 phút | F01 30–55: nhập/lưu/tạo draft; F02 55–90: sửa, duyệt/publish chống trùng | F01 30–55: task list/readers; F02 55–90: chat, hỏi lại, resolve/progress | F01 30–65: nộp/review/nộp lại/nghiệm thu; F02 65–90: report tối thiểu | Dùng adapter/dữ liệu mẫu cùng contract khi chờ; không chờ toàn bộ backend để làm UI/AI | **Phút 90:** từng luồng thao tác độc lập; giao API/ID/shape/lỗi và real/mock. Có mock vẫn phải công khai, chưa tính đã lưu thật |
| 90–135 | 45 phút | I01: project/member/plan/task thật, gắn màn hình chung | I01: điều phối DB/session và vòng chính, nối tracking thật | I01: submission/review/report/nguồn thật, nối AI theo mode thực tế | TV1 publish → TV2 dùng Task → TV3 dùng Task/criteria và nguồn; TV2 điều phối data, mỗi người sửa API mình | **Phút 135:** cùng một project/task, dữ liệu lưu thật: planning → tracking → nộp/review → report; reload không mất dữ liệu |
| 135–180 | 45 phút | I02: quyền publish, conflict/version, retry, lỗi Planner/validation | I02: task mơ hồ, quyền/ID, atomic update, không đổi field cấm | I02: bằng chứng, revision cũ, nghiệm thu, số liệu/thời hạn, nguồn report và lỗi AI | Dữ liệu tích hợp thật và case lỗi chung | Phút 180: vòng chính có xử lý mơ hồ/lỗi/quyền/chính xác; ghi phần còn thiếu, đóng scope |
| 180–210 | 30 phút | S01: sửa lỗi form/publish/layout, kiểm tra reload | S01: sửa lỗi lưu/session/tracking, kiểm tra request sai quyền | S01: sửa review/report, kiểm tra nguồn/thời hạn/AI lỗi | [Checklist demo](DEMO_CHECKLIST.md), chỉ kiểm tra triển khai thực tế | Ngừng thêm tính năng; giữ bản ổn định có thể demo, ghi checks thực chạy |
| 210–240 | 30 phút | D01: phần mở đầu, project/plan/publish | D01: chat/blocker, dữ liệu/reset dự phòng | D01: submission/review/report, dự phòng AI | Bản ổn định phút 210, phân vai và cùng quay video dự phòng | Demo 3–4 phút, nhãn mock/AI thật rõ, dữ liệu/video dự phòng và bàn giao giới hạn |
| **Tổng** | **240 phút** | **240 phút** | **240 phút** | **240 phút** | 30 + 60 + 45 + 45 + 30 + 30 | **60 phút cuối dành riêng ổn định và demo** |

## Điều kiện checkpoint

- [ ] **Phút 30:** chốt stack, lưu bền/session demo, người nghiệm thu, contracts, signature data/UI/AI và giới hạn. Có adapter mock cho phần phải chờ; API key chỉ server.
- [ ] **Phút 90:** TV1 thao tác nhập/sửa/duyệt/publish; TV2 task/chat/mơ hồ/blocker; TV3 nộp/review/report tối thiểu. Bàn giao shape/API dự kiến đã ánh xạ, ID mẫu, quyền, retry/lỗi và mode thật/mock. Độc lập không đồng nghĩa đã tích hợp thật.
- [ ] **Phút 135:** tạo project/member thật → Plan draft → sửa/duyệt/publish → Task list → chat đúng task → Submission/Review → WeeklyReport; cùng ID, cùng session/quyền và lưu server thật. Reload từng màn hình vẫn đọc được. Nếu AI còn mock, ghi rõ và không tuyên bố AI thật hoạt động.
- [ ] **Phút 180:** case mơ hồ không đổi task; publish/chat/submission retry không nhân bản; không vượt quyền; review không bịa evidence; báo cáo tách nộp/nghiệm thu và có nguồn/khoảng kỳ.
- [ ] **Phút 210:** dừng sửa trừ lỗi chặn demo; có bản ổn định, dữ liệu dự phòng và danh sách giới hạn thực tế.
- [ ] **Phút 240:** tập được demo 3–4 phút; dữ liệu/video dự phòng sẵn; mọi kết quả/mock/checks và phần thiếu đã ghi đúng.

## Khi trễ

| Phát hiện tại mốc | Quyết định cắt scope | Phần phải giữ |
|---|---|---|
| Phút 30: nền chưa sẵn | Giao mock adapter ngay; chọn một layout, một bộ tài khoản demo; TV2 điều phối nền còn thiếu trong 30–90 | Cùng contract; không để UI/AI ngồi chờ, không giấu thiếu DB/session thật |
| Phút 90: luồng chưa độc lập | Bỏ trang trí, animation, bộ lọc/tùy chọn phụ; form và task list đơn giản, review/report dạng văn bản | Mỗi người giao bản tối thiểu UI + API + logic; ưu tiên nối dữ liệu trong 90–135 |
| Phút 135: tích hợp chưa kín | Dồn 135–180 vào lỗi chặn vòng chính, không mở màn hình/tính năng mới | Planning có duyệt, tracking đúng task/quyền, submission/review, report từ dữ liệu lưu thật và reload |
| Phút 180: còn lỗi | Dừng thêm tính năng; dùng 180–210 sửa lỗi ưu tiên; bỏ tùy chỉnh phụ | Không lấn 210–240 tập demo; quyền, dữ liệu, retry, nguồn/bằng chứng không được làm giả |
| Phút 210: AI/môi trường không ổn | Dùng dữ liệu/video dự phòng hoặc mock có nhãn để trình bày phần không chạy được | Nêu rõ phần thật/phần dự phòng; không gọi mock là AI thật, không công bố checkpoint chưa đạt |

Không cắt 60 phút cuối để thêm tính năng. Không “giảm scope” bằng cách tự duyệt task, cho client tự khai quyền, bỏ persistence, ghi done từ AI, bịa evidence hoặc nói report bằng nút là scheduler. Nếu vẫn thiếu vòng chính, bàn giao rõ phần chưa đạt thay vì tuyên bố hoàn thành.
