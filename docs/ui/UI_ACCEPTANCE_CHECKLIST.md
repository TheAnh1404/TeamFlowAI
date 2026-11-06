# Danh Mục Kiểm Tra Nghiệm Thu Giao Diện (UI Acceptance Checklist) — TeamFlow AI

> [!WARNING]
> **Checklist kiểm thử giao diện cho phiên triển khai sau.**
> Hiện tại toàn bộ hệ thống đang ở giai đoạn đặc tả tài liệu, chưa có mã nguồn giao diện hoạt động. **Tất cả các mục kiểm tra dưới đây đều ở trạng thái CHƯA HOÀN THÀNH (`- [ ]`)**.
> 
> *Quy ước phân loại mức ưu tiên*:
> - **Mức P0**: Bắt buộc phải đạt để phục vụ kịch bản demo 3 phút 45 giây (225 giây).
> - **Mức P1**: Nên hoàn thiện nếu còn thời gian (phút 135–180).
> - **Mức P2**: Tính năng để sau MVP, không đánh giá trong phiên này.

---

## 1. Kiểm Tra Theo Từng Màn Hình (Page-by-Page Checklist)

### P01. Landing Page (`/`)
- [ ] `[P0]` Tiêu đề Hero hiển thị đúng thông điệp: "Cả nhóm rõ việc. Trưởng nhóm nắm tiến độ."
- [ ] `[P0]` Nút "Bắt đầu lập kế hoạch" chuyển hướng chính xác đến `/app` (P02).
- [ ] `[P0]` Khung xem trước sản phẩm (Product Preview) có nhãn `Dữ liệu minh họa` rõ ràng; không dùng hình ảnh robot hoặc hình 3D.
- [ ] `[P0]` Ba thẻ trợ lý AI nêu rõ vai trò và ranh giới quyền hạn (Planner không tự công bố; Coordinator không tự đổi hạn; Reviewer không tự hoàn thành).
- [ ] `[P0]` Bốn câu hỏi FAQ giải thích đúng cơ chế duyệt và nghiệm thu thực tế.
- [ ] `[P0]` Không có logo đối tác, báo giá (pricing), hoặc số liệu phần trăm tiết kiệm thời gian chưa được kiểm chứng.
- [ ] `[P1]` Các liên kết mỏ neo (Anchor) cuộn mượt đến đúng vị trí phân đoạn mà không bị thanh Header che khuất tiêu đề.

### P02. Danh Sách Dự Án & Điểm Vào Demo (`/app`)
- [ ] `[P0]` Khối chọn vai trò kiểm thử nhanh (Demo Session Bar) hiển thị rõ ràng 3 tài khoản: TV1 (Trưởng nhóm), TV2 (Thành viên Backend), TV3 (Thành viên Nghiệm thu).
- [ ] `[P0]` Chuyển đổi vai trò trong Demo Bar cập nhật phiên làm việc trên server và nạp lại danh sách dự án tương ứng.
- [ ] `[P0]` Thẻ dự án hiển thị số liệu thực tế (số task hoàn thành / tổng số task), không hiển thị phần trăm tiến độ vô căn cứ.
- [ ] `[P0]` Nút "Tạo dự án mới" chỉ hiển thị hoặc kích hoạt cho người dùng có quyền; bấm vào chuyển hướng sang P03.
- [ ] `[P0]` Dự án chưa duyệt kế hoạch hiển thị nhãn `Bản nháp` kèm liên kết dẫn tiếp tục tới P04.

### P03. Wizard Tạo Dự Án Mới (`/app/projects/new`)
- [ ] `[P0]` Thanh tiến trình 3 bước (Stepper) hiển thị trực quan trạng thái bước hiện tại.
- [ ] `[P0]` Bước 1 kiểm tra hợp lệ: Tên dự án bắt buộc; Ít nhất 1 đầu ra; Ngày kết thúc ≥ Ngày bắt đầu.
- [ ] `[P0]` Bước 2 kiểm tra danh sách nhóm: Số giờ khả dụng là số nguyên dương > 0; Không cho phép chọn trùng tài khoản thành viên.
- [ ] `[P0]` Dữ liệu đã nhập được bảo lưu nguyên vẹn khi người dùng bấm "Quay lại" (Back) giữa các bước.
- [ ] `[P0]` Bước 3 hiển thị thông báo rõ ràng về việc bản kế hoạch do AI tạo ra chỉ là bản nháp nội bộ cho trưởng nhóm.
- [ ] `[P0]` Khi bấm "Tạo kế hoạch nháp", nút bấm chuyển sang trạng thái loading, vô hiệu hóa chống bấm đúp; không hiển thị thanh tiến độ chạy % ảo.
- [ ] `[P0]` Nếu AI gặp lỗi (502/504), toàn bộ dữ liệu trên form Bước 3 được giữ nguyên kèm thông báo lỗi và nút "Thử lại".

### P04. Xem, Sửa & Duyệt Kế Hoạch (`/app/projects/:id/plan`)
- [ ] `[P0]` Kế hoạch ở trạng thái `draft` hiển thị nhãn lớn: `Bản nháp — Chỉ trưởng nhóm xem`. Thành viên không thể truy cập khi chưa công bố.
- [ ] `[P0]` Trưởng nhóm có thể nhấp chuột sửa trực tiếp tên công việc, người phụ trách, hạn chót và tiêu chí nghiệm thu của từng task nháp.
- [ ] `[P0]` Nhãn ước lượng công sức ghi rõ: *"AI đề xuất, cần xác nhận"*.
- [ ] `[P0]` Nút "Duyệt và công bố kế hoạch" bị vô hiệu hóa nếu còn task thiếu người phụ trách, thiếu tiêu chí hoặc có phụ thuộc vòng.
- [ ] `[P0]` Bấm công bố kế hoạch hiển thị Hộp thoại xác nhận (Confirm Dialog) tóm tắt số lượng công việc và thành viên nhận việc.
- [ ] `[P0]` Công bố kế hoạch thành công chuyển hướng ngay sang Bảng công việc P05; thử lại công bố với cùng key không tạo trùng bản ghi task.
- [ ] `[P1]` Bảng tóm tắt năng lực (Capacity Summary) hiển thị cảnh báo nếu thành viên bị phân bổ số giờ vượt mức khả dụng.

### P05. Không Gian Quản Lý Công Việc (`/app/projects/:id/tasks`)
- [ ] `[P0]` Thanh Tab hiển thị 4 mục đồng cấp: Công việc, Kế hoạch, Chat, Báo cáo. Không có thanh bên riêng cho từng trợ lý AI.
- [ ] `[P0]` Khối tóm tắt 4 chỉ số hiển thị số nguyên chính xác: Đã hoàn thành, Bị chặn, Quá hạn, Chờ nghiệm thu. Tuyệt đối không có thanh tiến độ %.
- [ ] `[P0]` Bảng công việc hiển thị đầy đủ: Tên task, Người phụ trách, Trạng thái (đúng màu token chuẩn), Hạn chót, Trở ngại/Phụ thuộc.
- [ ] `[P0]` Công việc quá hạn hiển thị badge riêng `Quá hạn` màu đỏ (`#B91C1C`) đi kèm badge trạng thái hiện tại.
- [ ] `[P0]` Nhấp vào bất kỳ dòng task nào sẽ mở Ngăn kéo chi tiết P06 trên desktop hoặc chuyển trang trên mobile.
- [ ] `[P0]` Nếu kế hoạch chưa công bố, Trưởng nhóm thấy nút điều hướng về P04; Thành viên thấy thông báo trung tính chờ hoàn thiện.
- [ ] `[P1]` Bộ lọc nhanh "Việc của tôi" và dropdown lọc theo trạng thái hoạt động chính xác; có nút "Xóa bộ lọc".

### P06. Chi Tiết Công Việc, Nộp Bài & Nghiệm Thu (`/app/projects/:id/tasks/:taskId`)
- [ ] `[P0]` Mở đúng nội dung công việc tương ứng theo mã đường dẫn URL (Deep link hỗ trợ).
- [ ] `[P0]` Danh sách tiêu chí nghiệm thu ban đầu hiển thị đầy đủ kèm mã cố định.
- [ ] `[P0]` Form nộp bài cho phép dán trực tiếp Văn bản, Markdown hoặc Đoạn mã. Không có tính năng tải tệp hay đọc URL ngoài.
- [ ] `[P0]` Bấm nộp bài tạo bản ghi `Submission` mới (tăng số revision) và chuyển task sang trạng thái `in_review`. Nộp lại không ghi đè bài cũ.
- [ ] `[P0]` Bảng AI Review hiển thị nhãn `Nhận xét AI` và chip `aiMode: real/mock`; liệt kê từng tiêu chí kèm bằng chứng trích dẫn trực tiếp.
- [ ] `[P0]` Nếu bài nộp thiếu nội dung, Reviewer hiển thị kết luận `insufficient_evidence` hoặc `not_met` có căn cứ; AI không tự ý chuyển task sang `done`.
- [ ] `[P0]` Nút "Xác nhận hoàn thành" chỉ hiển thị cho Trưởng nhóm hoặc thành viên có quyền `canAccept: true`; chỉ kích hoạt khi phiên bản bài nộp mới nhất đạt tất cả tiêu chí.
- [ ] `[P0]` Ngăn kéo chi tiết trên desktop có bẫy tiêu điểm (Focus Trap); phím `Escape` đóng ngăn kéo và hoàn trả tiêu điểm về dòng task tương ứng trên P05.
- [ ] `[P1]` Hiển thị lịch sử các phiên bản bài nộp (Revision 1, Revision 2...) cho phép xem lại các lần nộp trước.

### P07. Kênh Trao Đổi & Cập Nhật Tiến Độ (`/app/projects/:id/chat`)
- [ ] `[P0]` Tin nhắn hiển thị rõ tên người gửi, thời điểm gửi và nhãn liên kết công việc (Task chip).
- [ ] `[P0]` Tin nhắn rõ ý về tiến độ hoặc trở ngại từ người phụ trách được Coordinator ghi nhận, cập nhật trạng thái task (`in_progress` hoặc `blocked`) và lưu `ProgressUpdate`.
- [ ] `[P0]` Tin nhắn mơ hồ ("phần đó bị lỗi", "gần xong rồi") không làm thay đổi trạng thái task; Coordinator gửi câu hỏi làm rõ kèm danh sách các task gợi ý để người dùng bấm chọn.
- [ ] `[P0]` Tin nhắn của thành viên nói "mình xong rồi" chỉ được ghi nhận như nội dung trao đổi, không tự động chuyển task sang `done`.
- [ ] `[P0]` Khung soạn thảo hỗ trợ gõ đa dòng: Phím `Enter` thực hiện gửi; `Shift + Enter` thực hiện xuống dòng; không bị gửi nhầm khi đang gõ bộ gõ tiếng Việt (IME).
- [ ] `[P0]` Tin nhắn gửi lỗi được giữ nguyên nội dung trong ô soạn thảo kèm thông báo lỗi và nút gửi lại.
- [ ] `[P1]` Nếu người dùng đang cuộn chuột đọc tin nhắn cũ, tin nhắn mới đến không tự động giật màn hình xuống đáy; có nút "Có tin nhắn mới ↓".

### P08. Báo Cáo Tiến Độ Tuần (`/app/projects/:id/reports`)
- [ ] `[P0]` Nút "Tạo báo cáo tuần" chỉ hiển thị và cho phép Trưởng nhóm thao tác. Thành viên chỉ xem các báo cáo đã tạo.
- [ ] `[P0]` Báo cáo hiển thị rõ mốc thời gian chụp dữ liệu `asOf` và khoảng kỳ xét duyệt `[periodStart, periodEnd)`.
- [ ] `[P0]` Số liệu thống kê (Metrics) do Backend tính toán độc lập, AI không tự ý sửa đổi số liệu. Tách bạch rõ giữa nộp đúng hạn và nghiệm thu đúng hạn.
- [ ] `[P0]` Các gạch đầu dòng nhận định tóm tắt của AI bắt buộc đi kèm Thẻ nguồn dẫn chứng (`SourceChip`) trỏ về Task, Tin nhắn hoặc Bài nộp cụ thể.
- [ ] `[P0]` Bảng chi tiết từng thành viên: Thành viên không có cập nhật trong kỳ được hiển thị nhãn trung tính `Chưa có dữ liệu trong kỳ`, không đánh giá là "lười" hay "không làm việc".
- [ ] `[P0]` Nhấp vào Thẻ nguồn dẫn chứng mở cửa sổ xem nhanh đúng ngữ cảnh dữ liệu gốc trong hệ thống.
- [ ] `[P1]` Báo cáo là ảnh chụp cố định (Snapshot); việc task thay đổi sau thời điểm `asOf` không làm sai lệch số liệu của báo cáo cũ.

---

## 2. Kiểm Tra Khả Năng Tiếp Cận & Độ Tương Phản (A11y & Contrast)

- [ ] `[P0]` Tất cả văn bản thông thường đạt tỷ lệ tương phản tối thiểu **4.5:1** với màu nền (theo token trong `DESIGN_SYSTEM.md`).
- [ ] `[P0]` Tất cả các trường nhập liệu và nút bấm có đường viền đạt độ tương phản tối thiểu **3.0:1** với màu nền liền kề (`control-border: #64748B`).
- [ ] `[P0]` Không có bất kỳ trạng thái công việc nào chỉ được biểu thị bằng màu sắc đơn thuần; luôn có chữ tiếng Việt và icon đi kèm.
- [ ] `[P0]` Đường viền tiêu điểm bàn phím (`focus-ring: #0F766E`) hiển thị rõ ràng 2px khi dùng phím `Tab` duyệt qua các nút và liên kết.
- [ ] `[P0]` Tất cả các nút bấm chỉ có biểu tượng (Icon-only buttons) đều có nhãn trợ năng `aria-label` mô tả hành động.
- [ ] `[P1]` Hỗ trợ chế độ giảm chuyển động (`prefers-reduced-motion: reduce`) cho người dùng nhạy cảm với hoạt ảnh.

---

## 3. Kiểm Tra Đáp Ứng Thiết Bị & Giao Diện Di Động (Responsive & Mobile)

- [ ] `[P0]` Không xuất hiện thanh cuộn ngang toàn trang ở độ rộng màn hình tối thiểu `360px`.
- [ ] `[P0]` Trên màn hình di động (< 768px), bảng danh sách công việc tự động chuyển đổi thành danh sách thẻ dọc phẳng, giữ nguyên 4 trường cốt lõi.
- [ ] `[P0]` Chi tiết công việc P06 hiển thị dạng toàn màn hình trên mobile có nút quay lại; hiển thị dạng ngăn kéo trượt (Drawer) trên desktop.
- [ ] `[P0]` Chiều cao các ô nhập liệu và vùng bấm phím cảm ứng trên di động đạt tối thiểu **44px × 44px**.
- [ ] `[P1]` Các đoạn mã (code block) dài trong bài nộp được bao bọc trong vùng chứa có thanh cuộn ngang nội bộ (`overflow-x: auto`), không làm vỡ khung trang.

---

## 4. Kiểm Tra Kịch Bản Trình Diễn Demo 225 Giây (Demo Script Verification)

- [ ] `[P0]` **0:00–0:30**: Vào `/app`, chọn vai trò TV1 (Trưởng nhóm), mở Wizard P03, nhập đầy đủ mục tiêu, deadline và 3 thành viên TV1/TV2/TV3 với kỹ năng/giờ rảnh; dữ liệu được lưu server.
- [ ] `[P0]` **0:30–1:05**: Tạo Plan nháp, giao diện chuyển sang P04, Trưởng nhóm nhấp chuột sửa trực tiếp 1 tiêu chí của task nháp, bấm "Duyệt và công bố kế hoạch"; toàn bộ task chính thức xuất hiện trên P05 với trạng thái `todo`.
- [ ] `[P0]` **1:05–1:45**: Chuyển sang vai trò TV2, mở Tab Chat P07, gửi tin nhắn mơ hồ *"phần đó bị chặn"*; Coordinator hỏi lại kèm danh sách task; TV2 bấm chọn đúng task và nêu blocker; Task trên P05 tự động chuyển sang `blocked`.
- [ ] `[P0]` **1:45–2:45**: Chuyển sang vai trò TV3, mở task được giao trên P06, nộp đoạn Markdown chỉ có mục tiêu (thiếu hướng dẫn); Reviewer AI phân tích chỉ ra tiêu chí 2 bị thiếu bằng chứng (`insufficient_evidence` hoặc `not_met`); task chuyển sang `changes_requested`; task KHÔNG tự chuyển sang `done`.
- [ ] `[P0]` **2:45–3:35**: Chuyển lại vai trò TV1 (Trưởng nhóm), mở Tab Báo cáo P08, bấm nút "Tạo báo cáo tuần"; Báo cáo hiển thị tức thì số liệu backend, nhận định AI có gắn Chip nguồn; bấm Chip nguồn mở đúng ngữ cảnh bài nộp.
- [ ] `[P0]` **3:35–3:45**: Tải lại trang (F5 / Reload); toàn bộ dữ liệu dự án, công việc, tin nhắn, bài nộp và báo cáo vẫn còn nguyên vẹn từ máy chủ; nhãn chế độ AI (`real` hoặc `mock`) được hiển thị trung thực.
