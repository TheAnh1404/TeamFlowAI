# Đặc Tả Chi Tiết Từng Màn Hình (Page Specifications) — TeamFlow AI

> Phạm vi Coordinator V2 (07/11/2026) bổ sung trong P07: feed incremental/tải cũ, mention/task/reply, trạng thái Đã lưu/chờ phân tích/lỗi phân tích, form kế hoạch/check-in autosave và revision, bảng cập nhật nhóm, inbox và panel lịch/preferences. P08 thêm weekly/meeting report request trả queued, nguồn frozen tại asOf, phút tự khai/unknown, status tự báo/nộp/nghiệm thu riêng, sửa diễn giải và share đúng version bởi leader. Schedule settings/meeting editor nằm trong P07/P08; không thêm trang ngoài scope. Chi tiết props/API: [handoff](../COORDINATOR_FRONTEND_HANDOFF.md); lịch thật chưa bật: [operations](../COORDINATOR_OPERATIONS.md).

> [!IMPORTANT]
> **Tài liệu đặc tả chi tiết giao diện cho 8 màn hình (P01 – P08).**
> Mọi màn hình được mô tả theo khuôn mẫu 10 điểm bắt buộc. Dữ liệu ví dụ xuyên suốt sử dụng chung một kịch bản dự án mẫu: **"Dự án Nền tảng Đặt phòng Homestay"** với ba thành viên:
> - **TV1**: Nguyễn Trưởng Nhóm (Vai trò: `leader`, Kỹ năng: UI/UX, Quản lý)
> - **TV2**: Trần Theo Dõi (Vai trò: `member`, Kỹ năng: Backend, Database)
> - **TV3**: Lê Bàn Giao (Vai trò: `member` có `canAccept: true`, Kỹ năng: Frontend, AI)

---

## P01. Màn Hình Trang Chủ Giới Thiệu (Landing Page)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Giới thiệu giá trị thực chất của TeamFlow AI, cơ chế hỗ trợ của 3 trợ lý AI và ranh giới kiểm soát của con người trong điều phối nhóm nhỏ.
- **Câu hỏi cần trả lời**: TeamFlow AI giải quyết vấn đề gì? Ba trợ lý AI làm được gì và KHÔNG được tự ý làm gì? Làm thế nào để bắt đầu sử dụng?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**: Công khai cho mọi đối tượng truy cập (Khách vãng lai, Thành viên, Trưởng nhóm).
- **Tuyến Route**: `/` (Deep link không tham số).
- **Điều hướng vào**: Trực tiếp từ trình duyệt.
- **Điều hướng ra**:
  - Bấm "Bắt đầu lập kế hoạch" → chuyển đến P02 (`/app`).
  - Bấm các liên kết mỏ neo (Anchor) → cuộn mượt đến các phân đoạn nội trang (`#cach-hoat-dong`, `#ba-tro-ly`, `#cau-hoi-thuong-gap`).

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Khung chứa tối đa `1200px` căn giữa; Topbar cố định `64px` có hiệu ứng mờ nhẹ; Hero phân chia 2 cột (Cột trái: Thông điệp & CTA; Cột phải: Bản xem trước bảng công việc thật).
- **Bố cục Mobile (< 768px)**: Xếp chồng toàn bộ theo chiều dọc; Topbar có nút menu di động gọn gàng; Hero ưu tiên khối CTA lên trước, bảng xem trước xuống dưới; các liên kết mỏ neo tự động đóng menu khi bấm.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Header Navigation** | Wordmark chữ đậm `TeamFlow AI`; 3 liên kết anchor: "Cách hoạt động", "Ba trợ lý", "Câu hỏi thường gặp"; Nút Primary CTA: "Bắt đầu lập kế hoạch". |
| 2 | **Hero Section** | Huy hiệu nhỏ: *"Trợ lý điều phối cho nhóm nhỏ 3–8 người"*; Tiêu đề lớn (Headline): **"Cả nhóm rõ việc. Trưởng nhóm nắm tiến độ."**; Phụ đề (2 câu): *"AI gợi ý phân rã mục tiêu và đối chiếu bài nộp theo từng tiêu chí cụ thể. Mọi kế hoạch, công bố và nghiệm thu hoàn thành luôn do con người trực tiếp phê duyệt."*; 2 nút bấm: "Bắt đầu lập kế hoạch" (Primary) và "Xem cách hoạt động" (Secondary link). |
| 3 | **Product Preview** | Khung hiển thị giao diện bảng công việc thật với nhãn nổi bật góc trên: `Dữ liệu minh họa`. Minh họa 3 dòng task: "Thiết kế giao diện đặt phòng" (Chờ nghiệm thu), "Xây dựng API phòng trống" (Đang làm), "Tích hợp cổng thanh toán" (Bị chặn). Tuyệt đối không dùng hình ảnh robot hoặc hình vẽ 3D. |
| 4 | **Section Vấn đề** | Ba khối nội dung phẳng: (1) *Phân công cảm tính* - Khó cân đối kỹ năng và giờ rảnh; (2) *Cập nhật rời rạc* - Tiến độ trôi trong tin nhắn chat; (3) *Báo cáo áp lực* - Mất hàng giờ tổng hợp số liệu cuối tuần. |
| 5 | **Section Cách hoạt động** | Tiến trình 4 bước rõ ràng: (1) Nhập mục tiêu & giờ rảnh → (2) Sửa và duyệt kế hoạch nháp → (3) Cập nhật tiến độ qua chat & nộp bài → (4) Bấm nút tạo báo cáo tuần có nguồn dẫn chứng. |
| 6 | **Section Ba trợ lý** | 3 thẻ giới thiệu: **Planner** (Gợi ý chia task & tiêu chí / Không tự công bố), **Coordinator** (Bóc tách cập nhật chat / Không tự dời hạn chót), **Reviewer** (Đối chiếu bằng chứng bài nộp / Không tự đánh dấu hoàn thành). |
| 7 | **Section Kiểm soát con người** | Nhấn mạnh 3 nguyên tắc: Duyệt trước khi công bố, Nghiệm thu cần bằng chứng xác thực, Báo cáo minh bạch từ số liệu đã lưu. |
| 8 | **Section FAQ** | 4 câu hỏi thực tế: AI có tự đổi deadline không? Trạng thái "Hoàn thành" được xác nhận thế nào? Báo cáo tuần được tạo ra sao? Hỗ trợ dạng bài nộp nào? |
| 9 | **Footer** | Thông tin bản quyền TeamFlow AI; liên kết quay lại đầu trang; mã nguồn mở phục vụ cộng đồng học tập. |

### 4. Trường dữ liệu và Khối thông tin
- Trang tĩnh hoàn toàn, không có trường nhập liệu động.
- Mọi nội dung text đều được mã hóa tĩnh trong mã nguồn giao diện, tuân thủ bảng màu token.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Bắt đầu lập kế hoạch` (Primary Button):
  - Hiển thị: Mọi người dùng.
  - Trạng thái: Luôn kích hoạt.
  - Kết quả: Chuyển hướng trình duyệt tới `/app` (P02).
- `Xem cách hoạt động` (Outline Button):
  - Hiển thị: Mọi người dùng.
  - Trạng thái: Luôn kích hoạt.
  - Kết quả: Cuộn mượt màn hình tới `#cach-hoat-dong`.

### 6. Hành vi tương tác chi tiết
- Khi cuộn trang, thanh Header duy trì vị trí trên cùng (`position: sticky; top: 0`).
- Khi bấm vào các liên kết Anchor, vị trí cuộn có khoảng bù trừ `scroll-margin-top: 80px` để không bị Header che mất tiêu đề phân đoạn.

### 7. Ma trận trạng thái giao diện
- **Loading / Error / Denied**: Không áp dụng (trang tĩnh).
- **Responsive**: Co giãn mượt từ `360px` đến `1440px`. Không có thanh cuộn ngang ở bất kỳ độ phân giải nào.

### 8. Bản sao văn bản thực tế (Microcopy)
- *Headline*: "Cả nhóm rõ việc. Trưởng nhóm nắm tiến độ."
- *FAQ 1*: "AI có tự ý đổi deadline công việc không? — Tuyệt đối không. Mọi đề xuất dời hạn chót từ thành viên qua chat chỉ được ghi nhận để trưởng nhóm xem xét và phê duyệt."
- *FAQ 2*: "Ai có quyền bấm hoàn thành công việc? — Chỉ Trưởng nhóm hoặc thành viên được phân quyền nghiệm thu mới có thể chuyển công việc sang trạng thái Hoàn thành sau khi kiểm tra bằng chứng bài nộp."

### 9. Khả năng tiếp cận và Bàn phím
- Hỗ trợ phím `Tab` duyệt tuần tự qua các liên kết mỏ neo và nút CTA.
- Có đường viền hiển thị tiêu điểm rõ ràng (`focus-ring: #0F766E`).

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV1**.
- **Tái sử dụng**: `Button`, `Badge`, `Card`.

---

## P02. Danh Sách Dự Án & Điểm Vào Phiên Demo (Project List & Demo Entry)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Liệt kê các dự án người dùng tham gia; cung cấp điểm chọn phiên demo nhanh chóng cho phiên bản đánh giá; dẫn tới việc tạo dự án mới.
- **Câu hỏi cần trả lời**: Tôi đang tham gia những dự án nào? Dự án nào đang chạy, dự án nào còn ở dạng nháp? Làm thế nào để đóng vai Trưởng nhóm hoặc Thành viên để kiểm thử?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**: Bất kỳ người dùng nào có phiên làm việc (`Session`). Nếu chưa có session, hiển thị khối chọn phiên demo.
- **Tuyến Route**: `/app`.
- **Điều hướng vào**: Từ nút CTA của P01 hoặc thanh Topbar.
- **Điều hướng ra**:
  - Bấm "Tạo dự án mới" → P03 (`/app/projects/new`).
  - Bấm vào thẻ dự án đã công bố → P05 (`/app/projects/:projectId/tasks`).
  - Bấm vào dự án chưa duyệt kế hoạch → P04 (`/app/projects/:projectId/plan`).

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Khung chứa tối đa `1200px`; Khối Demo Session nằm trang nhã phía trên; Tiếp theo là Thanh tiêu đề và Nút Tạo dự án; Lưới danh sách dự án (2 cột thẻ lớn).
- **Bố cục Mobile (< 768px)**: Xếp chồng 1 cột; Khối chọn session hiển thị dạng 3 nút bấm lớn xếp dọc; Thẻ dự án hiển thị dạng khối thông tin phẳng.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Demo Session Bar** | Khối nhấn nhẹ (`primary-soft`, viền `#E2E8F0`): Thông báo *"Chế độ kiểm thử nhanh (Demo Mode)"*; Hiển thị người dùng hiện tại; 3 nút chuyển vai trò nhanh: `TV1 (Trưởng nhóm)`, `TV2 (Thành viên Backend)`, `TV3 (Thành viên Nghiệm thu)`. |
| 2 | **Page Header** | Tiêu đề trang `Dự án của nhóm`; Nút Primary CTA: `+ Tạo dự án mới` (Chỉ kích hoạt hoặc hiển thị nổi bật cho người dùng có vai trò tạo dự án). |
| 3 | **Project Cards Grid** | Danh sách các thẻ dự án: Tên dự án, Hạn chót tổng thể, Trạng thái kế hoạch (`Bản nháp` hoặc `Đang thực hiện`), 3 chỉ số thực tế: Số task đã nghiệm thu / Tổng task, Số task bị chặn, Số thành viên tham gia. |
| 4 | **Empty State (Khi chưa có dự án)** | Minh họa trung tính; Văn bản: Trưởng nhóm thấy *"Chưa có dự án nào. Hãy bắt đầu tạo kế hoạch cho nhóm của bạn"*; Thành viên thấy *"Bạn chưa được thêm vào dự án nào. Hãy chờ trưởng nhóm phân công"*. |

### 4. Trường dữ liệu và Khối thông tin
- Dữ liệu nhận từ `GET /api/projects`:
  - `id`: Định danh dự án.
  - `name`: Tên dự án (Ví dụ: *"Nền tảng Đặt phòng Homestay"*).
  - `goal`: Mục tiêu ngắn gọn.
  - `deadline`: Thời hạn hoàn thành tổng thể (`2026-11-30T17:00:00+07:00`).
  - `planStatus`: Trạng thái kế hoạch (`draft` hoặc `published`).
  - `memberCount`: Số lượng thành viên (Ví dụ: `3`).
  - `taskCounts`: Số liệu thực tế `{ total: 8, done: 2, blocked: 1 }`. Tuyệt đối không tính phần trăm ảo.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Tạo dự án mới` (Primary Button):
  - Hiển thị: Mọi session (Người tạo tự động trở thành `leader`).
  - Kết quả: Chuyển hướng sang P03.
- `Vào không gian làm việc` (Secondary Button trên thẻ):
  - Kết quả: Mở P05 nếu plan đã `published`; Mở P04 nếu plan còn ở dạng `draft`.
- `Chọn vai trò TV1 / TV2 / TV3` (Outline Button):
  - Kết quả: Gửi yêu cầu thiết lập session demo phía server, tự động tải lại danh sách tương ứng với quyền hạn.

### 6. Hành vi tương tác chi tiết
- Nhấp chọn bất kỳ đâu trên thẻ dự án sẽ mở màn hình tương ứng.
- Khi chuyển đổi vai trò trong Demo Bar, hiển thị trạng thái đang nạp (loading spinner nhỏ trong nút) và cập nhật lại giao diện người dùng ngay lập tức.

### 7. Ma trận trạng thái giao diện
- **Loading**: Hiển thị 2 khung xương thẻ dự án (Skeleton Cards).
- **Empty**: Hiển thị khối rỗng có hướng dẫn hành động tương ứng với vai trò.
- **Error**: Hiển thị thông báo lỗi nạp danh sách kèm nút "Tải lại danh sách".

### 8. Bản sao văn bản thực tế (Microcopy)
- *Demo Bar*: "Bạn đang đăng nhập với tư cách: **Nguyễn Trưởng Nhóm (TV1)** — Quyền: Toàn quyền quản trị dự án."
- *Thẻ mẫu*: "Nền tảng Đặt phòng Homestay • Hạn chót: 30/11/2026 • Tiến độ thực tế: 2/8 công việc hoàn thành • 1 công việc đang bị chặn."

### 9. Khả năng tiếp cận và Bàn phím
- Thẻ dự án có thể nhận tiêu điểm bàn phím qua phím `Tab` và kích hoạt bằng phím `Enter`.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV2**.
- **Tái sử dụng**: `Button`, `Card`, `Badge`, `Skeleton`.

---

## P03. Tạo Dự Án Mới Với Wizard 3 Bước (Project Creation Wizard)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Thu thập đầy đủ dữ liệu đầu vào cần thiết (mục tiêu, đầu ra, thành viên, kỹ năng, giờ rảnh) để trợ lý Planner AI sinh ra bản kế hoạch công việc nháp.
- **Câu hỏi cần trả lời**: Dự án này làm gì và khi nào phải xong? Ai tham gia, họ có kỹ năng gì và dành được bao nhiêu giờ mỗi tuần? Dữ liệu này được lưu ở đâu?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**: Người dùng có session hợp lệ (sẽ trở thành `leader` của dự án vừa tạo).
- **Tuyến Route**: `/app/projects/new`.
- **Điều hướng vào**: Từ nút "Tạo dự án mới" tại P02.
- **Điều hướng ra**:
  - Hoàn thành Bước 3 → chuyển sang P04 (`/app/projects/:id/plan`).
  - Bấm "Hủy bỏ" → hiển thị xác nhận, đồng ý thì quay về P02 (`/app`).

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Toàn màn hình**: Khung form giới hạn tối đa **`760px`** căn giữa; Phía trên là thanh chỉ báo tiến trình 3 bước (Stepper); Ở giữa là vùng nội dung form tương ứng với từng bước; Phía dưới là thanh điều khiển (Thoát, Quay lại, Tiếp tục/Tạo nháp).

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Stepper Bar** | 3 bước trực quan: Bước 1: Mục tiêu & Phạm vi → Bước 2: Thành viên & Năng lực → Bước 3: Xác nhận & Tạo nháp. |
| 2 | **Form Bước 1: Mục tiêu** | Ô nhập: Tên dự án (Bắt buộc); Mục tiêu tổng quát (Bắt buộc, tối đa 500 từ); Danh sách Đầu ra mong muốn (Ít nhất 1 đầu ra cụ thể); Ngày bắt đầu và Ngày kết thúc (Bắt buộc; Ngày kết thúc ≥ Ngày bắt đầu); Múi giờ mặc định: `Asia/Ho_Chi_Minh`. |
| 3 | **Form Bước 2: Nhóm** | Bảng danh sách thành viên tham gia: Chọn tài khoản hệ thống (User dropdown); Phân vai trò (`leader` hoặc `member`); Nhập danh sách kỹ năng chuyên môn; Nhập số giờ khả dụng trong tuần (`availableHoursPerWeek`, số nguyên dương > 0). Hỗ trợ thêm/xóa dòng thành viên. Kiểm tra không cho trùng thành viên. |
| 4 | **Form Bước 3: Xác nhận** | Tóm tắt toàn bộ dữ liệu đã nhập ở Bước 1 và Bước 2; Hộp thông báo ranh giới: *"Bản kế hoạch do AI tạo ra chỉ là bản nháp nội bộ. Trưởng nhóm sẽ kiểm tra và phê duyệt trước khi công bố cho nhóm."*; Thông báo rõ ràng: Dữ liệu được lưu trữ chính thức vào cơ sở dữ liệu server khi bấm nút tạo. |
| 5 | **Action Footer** | Nút "Hủy bỏ" (Bên trái); Nút "Quay lại" (Outline, chỉ hiện từ Bước 2); Nút "Tiếp tục" (Bước 1, 2) hoặc "Tạo kế hoạch nháp" (Bước 3, Primary CTA). |

### 4. Trường dữ liệu và Khối thông tin
- **Bảng kiểm tra tính hợp lệ (Validation Rules)**:
  - `projectName`: Chuỗi từ 5–100 ký tự. Bắt buộc.
  - `goal`: Chuỗi từ 20–1000 ký tự. Bắt buộc.
  - `deliverables`: Danh sách ít nhất 1 chuỗi ký tự không rỗng.
  - `startDate`, `endDate`: Định dạng ngày chuẩn; `endDate` bắt buộc phải cùng ngày hoặc sau `startDate`.
  - `members`: Tối thiểu 1 thành viên (chính là người tạo); mỗi thành viên có `availableHoursPerWeek` là số từ 1 đến 80; không có hai dòng trùng `userId`.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Tiếp tục` (Primary Button):
  - Hiển thị: Bước 1, Bước 2.
  - Trạng thái: Kích hoạt khi toàn bộ trường bắt buộc của bước hiện tại hợp lệ.
  - Kết quả: Chuyển sang bước tiếp theo, giữ nguyên dữ liệu đã nhập.
- `Quay lại` (Outline Button):
  - Hiển thị: Bước 2, Bước 3.
  - Kết quả: Trở lại bước trước đó mà không mất dữ liệu.
- `Tạo kế hoạch nháp` (Primary Button):
  - Hiển thị: Bước 3.
  - Trạng thái: Kích hoạt khi không có lỗi dữ liệu.
  - Trạng thái đang xử lý: Đổi chữ thành `"Đang tạo kế hoạch nháp..."`, hiển thị biểu tượng loading xoay tròn, vô hiệu hóa nút bấm để chống gửi đúp. Tuyệt đối không hiển thị thanh tiến độ chạy % giả tạo.
  - Kết quả: Lưu Project, lưu Thành viên, gọi Planner AI sinh `draftTasks`, lưu Plan trạng thái `draft`, chuyển sang P04.

### 6. Hành vi tương tác chi tiết
- Dữ liệu biểu mẫu được lưu giữ hoàn toàn trong state khi người dùng chuyển đổi qua lại giữa các bước (Back/Next).
- Khi người dùng bấm "Hủy bỏ" hoặc chuyển tab trình duyệt lúc đang nhập dở, hiển thị cảnh báo: *"Bạn có thay đổi chưa hoàn thành. Bạn có chắc chắn muốn thoát?"*.

### 7. Ma trận trạng thái giao diện
- **AI Loading**: Khung thông báo chuyên nghiệp: *"Planner AI đang phân tích mục tiêu và phân rã công việc dựa trên kỹ năng nhóm. Quá trình này thường mất 5–10 giây..."*.
- **Error**: Nếu server hoặc AI báo lỗi (502/504), giữ nguyên dữ liệu trên biểu mẫu Bước 3, hiển thị thông báo lỗi màu đỏ kèm nút "Thử tạo lại".

### 8. Bản sao văn bản thực tế (Microcopy)
- *Gợi ý đầu ra*: "Ví dụ: 'Tài liệu kiến trúc hệ thống', 'Mã nguồn module đặt phòng', 'Kịch bản kiểm thử nghiệm thu'."
- *Lưu ý Bước 3*: "Lưu ý: Kế hoạch nháp sẽ chỉ hiển thị cho bạn (Trưởng nhóm). Bạn có toàn quyền sửa đổi mọi công việc, người phụ trách và tiêu chí trước khi công bố."

### 9. Khả năng tiếp cận và Bàn phím
- Hỗ trợ phím `Tab` tuần tự; khi có lỗi validation, tiêu điểm tự động di chuyển đến ô nhập liệu đầu tiên bị lỗi và đọc thông báo lỗi liên kết qua `aria-describedby`.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV1**.
- **Tái sử dụng**: `TextField`, `TextArea`, `DateField`, `MemberRow`, `Stepper`, `Button`, `Alert`.

---

## P04. Xem, Sửa và Duyệt Kế Hoạch (Plan Review & Publish)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Cung cấp giao diện trực quan để Trưởng nhóm rà soát, chỉnh sửa trực tiếp từng công việc do Planner AI gợi ý và thực hiện thao tác duyệt để công bố kế hoạch chính thức.
- **Câu hỏi cần trả lời**: AI đã phân chia những công việc nào? Ai làm việc gì, hạn chót khi nào, tiêu chí nghiệm thu là gì? Có công việc nào bị thiếu người phụ trách hoặc phụ thuộc vòng không? Làm thế nào để công bố cho cả nhóm?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**:
  - Trưởng nhóm (`leader`): Toàn quyền xem, sửa trực tiếp từng task, thêm/xóa task và bấm nút công bố.
  - Thành viên (`member`): **Không có quyền truy cập khi kế hoạch còn ở dạng `draft`**. Khi đã `published`, chỉ xem ở chế độ đọc.
- **Tuyến Route**: `/app/projects/:projectId/plan`.
- **Điều hướng vào**: Sau Bước 3 của P03 hoặc từ Tab "Kế hoạch" tại P05.
- **Điều hướng ra**: Công bố thành công → chuyển sang P05 (`/app/projects/:projectId/tasks`).

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Khung chứa tối đa `1200px`; Phía trên là Thanh trạng thái kế hoạch và Tóm tắt năng lực; Ở giữa là Danh sách các thẻ công việc nháp (kèm nút sửa trực tiếp); Phía dưới là Thanh hành động duyệt cố định (Sticky Action Bar).
- **Bố cục Mobile (< 768px)**: Xếp chồng dọc; Nút "Sửa công việc" mở rộng toàn màn hình; Thanh duyệt cố định ở cạnh đáy màn hình.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Status Banner** | Huy hiệu lớn: `Bản nháp — Chỉ trưởng nhóm xem` (Màu vàng đất `#92400E` trên nền `#FFFBEB`) hoặc `Đã công bố` (Màu xanh lá `#166534` trên nền `#F0FDF4`). |
| 2 | **Capacity Summary** | Bảng tóm tắt cân đối tải: Tên từng thành viên, Tổng số giờ khả dụng / tuần, Tổng công sức công việc được phân bổ; Cảnh báo trực quan nếu có thành viên bị quá tải. |
| 3 | **Draft Tasks List** | Danh sách các công việc nháp được đánh số thứ tự: Tiêu đề công việc; Người phụ trách (Assignee); Hạn chót (Deadline); Ước lượng công sức (Kèm nhãn chú thích: *"AI đề xuất, cần xác nhận"*); Công việc phụ thuộc (Dependencies); Danh sách các Tiêu chí nghiệm thu cụ thể (Acceptance Criteria có mã định danh). Nút thao tác: "Chỉnh sửa" và "Xóa". |
| 4 | **Add Task Button** | Nút bấm `+ Thêm công việc thủ công` cho phép trưởng nhóm bổ sung task mà không cần phụ thuộc AI. |
| 5 | **Publish Bar** | Thanh cố định cuối trang chứa: Tóm tắt số lượng công việc hợp lệ / chưa hợp lệ; Nút Primary CTA: `Duyệt và công bố kế hoạch`. |

### 4. Trường dữ liệu và Khối thông tin
- Mỗi `DraftTask` bao gồm:
  - `id`: Mã tạm do server cấp (`draft-1`, `draft-2`...).
  - `title`: Tên công việc (Bắt buộc).
  - `description`: Mô tả chi tiết đầu ra mong muốn.
  - `assigneeMemberId`: Bắt buộc phải gán cho một thành viên cụ thể trong nhóm.
  - `deadline`: Bắt buộc, không được vượt quá deadline tổng thể của dự án.
  - `criteria`: Mảng các tiêu chí nghiệm thu (Ít nhất 1 tiêu chí rõ ràng).
  - `dependencyTaskIds`: Danh sách công việc phụ thuộc; hệ thống kiểm tra không cho phép tạo phụ thuộc vòng (circular dependency).

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Chỉnh sửa công việc` (Outline Button trên từng task):
  - Mở hộp thoại (Modal) hoặc vùng chỉnh sửa trực tiếp (Inline Edit) cho phép sửa mọi trường của task.
- `Duyệt và công bố kế hoạch` (Primary Button):
  - Hiển thị: Chỉ Trưởng nhóm nhìn thấy.
  - Trạng thái: Kích hoạt khi **toàn bộ task nháp đều có người phụ trách, có ít nhất 1 tiêu chí nghiệm thu và không có lỗi phụ thuộc**. Bị mờ (disabled kèm thông báo giải thích) nếu còn task thiếu thông tin.
  - Kết quả: Mở Hộp thoại xác nhận cuối cùng (Confirm Dialog).
- `Xác nhận công bố` (Nút trong Confirm Dialog):
  - Gửi yêu cầu với `expectedVersion` và `Idempotency-Key`.
  - Kết quả: Server chuyển Plan sang `published`, tạo các bản ghi `Task` chính thức với trạng thái `todo`, chuyển hướng người dùng sang P05.

### 6. Hành vi tương tác chi tiết
- **Sửa trực tiếp là bắt buộc**: Trưởng nhóm có thể nhấp chuột sửa trực tiếp tên, deadline, người phụ trách trên từng dòng mà không cần gõ lệnh hội thoại phức tạp.
- Khi kế hoạch đã công bố (`published`), nút "Tạo lại kế hoạch" bị vô hiệu hóa hoàn toàn để tránh ghi đè lên các công việc đang có tiến độ thực hiện.

### 7. Ma trận trạng thái giao diện
- **Readonly Mode**: Đối với thành viên khi kế hoạch đã công bố, toàn bộ nút sửa/xóa và nút duyệt bị ẩn; giao diện chuyển sang chế độ xem thông tin minh bạch.
- **Publishing Pending**: Nút hiển thị `"Đang công bố..."`, ngăn chặn người dùng bấm nhiều lần.

### 8. Bản sao văn bản thực tế (Microcopy)
- *Hộp thoại xác nhận công bố*: "Xác nhận công bố kế hoạch? — Kế hoạch gồm 8 công việc chính thức sẽ được thông báo tới 3 thành viên trong nhóm. Sau khi công bố, các thành viên có thể bắt đầu cập nhật tiến độ và nộp bài nghiệm thu."

### 9. Khả năng tiếp cận và Bàn phím
- Hộp thoại chỉnh sửa công việc có bẫy tiêu điểm (Focus Trap); phím `Escape` đóng hộp thoại và hoàn trả tiêu điểm về nút "Chỉnh sửa" tương ứng.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV1**.
- **Tái sử dụng**: `Button`, `Badge`, `ConfirmDialog`, `TextField`, `DateField`.

---

## P05. Không Gian Quản Lý Công Việc (Workspace & Task Board)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Trung tâm làm việc hàng ngày của nhóm; cung cấp cái nhìn tổng quan về tiến độ thực tế, bảng danh sách công việc minh bạch và các bộ lọc nhanh chóng.
- **Câu hỏi cần trả lời**: Hôm nay tôi cần làm những công việc gì? Công việc nào đang bị chặn cần tháo gỡ? Công việc nào đang chờ duyệt nghiệm thu?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**: Mọi thành viên thuộc dự án (`leader` và `member`).
- **Tuyến Route**: `/app/projects/:projectId/tasks`.
- **Điều hướng vào**: Từ P02, sau khi công bố tại P04 hoặc qua thanh điều hướng chính.
- **Điều hướng ra**:
  - Nhấp chọn một dòng task → Mở ngăn kéo chi tiết P06 (`/app/projects/:projectId/tasks/:taskId`).
  - Chuyển Tab → P04 (Kế hoạch), P07 (Chat), P08 (Báo cáo).

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Khung chứa tối đa `1440px` để dễ quan sát bảng rộng; Thanh điều hướng Tab dự án ở trên cùng; Khối tóm tắt 4 chỉ số (Summary Metrics); Thanh công cụ tìm kiếm và bộ lọc (Filter Bar); Bảng danh sách công việc (Table view); Khi chọn task, Ngăn kéo P06 trượt vào từ cạnh phải màn hình (rộng `480px` – `560px`).
- **Bố cục Mobile (< 768px)**: Xếp chồng dọc; Khối 4 chỉ số chia thành lưới 2x2; Bảng công việc chuyển thành danh sách thẻ dọc; Khi chọn task, chuyển hướng toàn trang sang P06.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Project Header & Tabs** | Tên dự án lớn; Hạn chót tổng; Thanh tab điều hướng gồm 4 mục: **Công việc** (Đang chọn), **Kế hoạch**, **Chat**, **Báo cáo**. Tuyệt đối không tạo thanh bên riêng cho từng trợ lý AI. |
| 2 | **Summary Metrics Cards** | 4 thẻ chỉ số được định nghĩa chính xác theo số liệu thực: (1) `Đã hoàn thành`: số task `done` / tổng task; (2) `Bị chặn`: số task `blocked`; (3) `Quá hạn`: số task có hạn < hiện tại và chưa `done`; (4) `Chờ nghiệm thu`: số task `in_review`. Tuyệt đối không hiển thị % tiến độ vô căn cứ. |
| 3 | **Filter & Search Bar** | Ô tìm kiếm tên task theo từ khóa; Nút lọc nhanh `Việc của tôi`; Dropdown lọc theo Trạng thái; Dropdown lọc theo Người phụ trách; Nút `Xóa bộ lọc` (chỉ hiện khi có bộ lọc đang áp dụng). |
| 4 | **Task List Table** | Bảng công việc với các cột: Tiêu đề công việc, Người phụ trách (Kèm avatar viết tắt), Trạng thái (Badge màu chuẩn), Hạn chót (Kèm badge đỏ nếu Quá hạn), Trở ngại / Phụ thuộc (Icon cảnh báo), Cập nhật gần nhất (Thời gian tương đối). Nhấp vào dòng để xem chi tiết. |
| 5 | **Empty / Unplanned State** | Nếu kế hoạch chưa được duyệt: Trưởng nhóm thấy nút `Chuyển đến Kế hoạch để duyệt`; Thành viên thấy thông báo trung tính `Kế hoạch đang được trưởng nhóm hoàn thiện`. |

### 4. Trường dữ liệu và Khối thông tin
- Mỗi dòng `Task` trong danh sách:
  - `id`: Mã công việc (`task-101`).
  - `title`: Tên công việc.
  - `assignee`: Tên thành viên hiển thị.
  - `status`: Sáu trạng thái cố định (`todo`, `in_progress`, `blocked`, `in_review`, `changes_requested`, `done`).
  - `deadline`: Thời điểm hạn chót (`Asia/Ho_Chi_Minh`).
  - `isOverdue`: Giá trị boolean tính tự động nếu `deadline < now` và `status !== 'done'`.
  - `blocker`: Chuỗi mô tả trở ngại (nếu trạng thái là `blocked`).

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Lọc "Việc của tôi"` (Filter Button):
  - Kết quả: Lọc danh sách chỉ hiển thị các công việc có `assigneeMemberId` trùng với phiên người dùng hiện tại.
- `Chọn dòng công việc` (Table Row Click):
  - Kết quả: Mở ngăn kéo P06 trên desktop hoặc chuyển route trên mobile.
- `Xóa bộ lọc` (Text Button):
  - Kết quả: Hoàn trả danh sách hiển thị đầy đủ tất cả công việc đã công bố.

### 6. Hành vi tương tác chi tiết
- Trạng thái bộ lọc và từ khóa tìm kiếm được đồng bộ lên tham số URL (Query params: `?assignee=...&status=...`) để tiện chia sẻ hoặc tải lại trang.
- Không sử dụng bảng kéo thả Kanban trong MVP nhằm tiết kiệm thời gian triển khai và tập trung độ chính xác dữ liệu.

### 7. Ma trận trạng thái giao diện
- **Loading**: Bảng hiển thị 5 dòng xương giả lập (Table Skeletons).
- **Empty Filter**: "Không tìm thấy công việc nào phù hợp với bộ lọc đã chọn. [Bấm để xóa bộ lọc]".

### 8. Bản sao văn bản thực tế (Microcopy)
- *Chỉ số mẫu*: "Đã hoàn thành: 2/8 công việc • Đang bị chặn: 1 • Quá hạn: 1 • Chờ nghiệm thu: 1".
- *Hạn chót quá hạn*: "Quá hạn 2 ngày (Hạn: 05/11/2026)" đi kèm badge đỏ `Quá hạn`.

### 9. Khả năng tiếp cận và Bàn phím
- Các dòng bảng có thể điều hướng bằng phím mũi tên lên/xuống; phím `Enter` mở ngăn kéo chi tiết P06.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV2**.
- **Tái sử dụng**: `Tabs`, `Badge`, `FilterBar`, `TaskRow`, `Skeleton`.

---

## P06. Chi Tiết Công Việc, Nộp Bài & Nghiệm Thu (Task Detail, Submission & Review)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Không gian tập trung cho một công việc cụ thể: xem tiêu chí nghiệm thu; gửi bài nộp; nhận đánh giá đối chiếu từng tiêu chí từ Reviewer AI; Trưởng nhóm thực hiện nghiệm thu hoàn thành.
- **Câu hỏi cần trả lời**: Công việc này đòi hỏi những tiêu chí cụ thể nào? Bài nộp gần nhất có đạt yêu cầu không? Đoạn nào chứng minh tiêu chí đã đạt, đoạn nào còn thiếu? Ai có quyền duyệt hoàn thành?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**:
  - Mọi thành viên dự án: Xem chi tiết task, xem bài nộp và xem nhận xét AI Review.
  - Người phụ trách (`assignee`) hoặc Trưởng nhóm: Soạn và nộp bài nghiệm thu; gửi cập nhật tiến độ.
  - Trưởng nhóm hoặc thành viên có `canAccept: true`: Bấm nút duyệt hoàn thành (`done`) hoặc yêu cầu chỉnh sửa.
- **Tuyến Route**: `/app/projects/:projectId/tasks/:taskId` (Hỗ trợ Deep Link trực tiếp).
- **Điều hướng vào**: Nhấp chọn task từ P05, bấm chip liên kết từ P07 hoặc bấm nguồn từ P08.
- **Điều hướng ra**: Bấm nút Đóng (X) hoặc phím `Escape` → Đóng ngăn kéo, hoàn trả tiêu điểm về dòng task tương ứng trên P05.

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Ngăn kéo trượt (Drawer) từ cạnh phải, độ rộng `520px` – `580px`, có thanh cuộn độc lập; Nền phía sau hơi tối nhẹ (Backdrop).
- **Bố cục Mobile (< 768px)**: Toàn màn hình; Thanh tiêu đề có nút "← Quay lại danh sách".

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Drawer Header** | Mã và tên công việc; Badge trạng thái hiện tại; Badge `Quá hạn` (nếu có); Nút Đóng (X) góc phải trên. |
| 2 | **Task Metadata** | Thông tin cơ bản: Người phụ trách; Hạn chót; Công việc phụ thuộc; Trở ngại hiện tại (nếu có ghi chú). |
| 3 | **Criteria Checklist** | Danh sách các tiêu chí nghiệm thu ban đầu có mã cố định: Hiển thị rõ từng tiêu chí kèm trạng thái kết quả gần nhất (`met` - Đạt, `not_met` - Chưa đạt, `insufficient_evidence` - Chưa đủ bằng chứng). |
| 4 | **Submission History** | Lựa chọn các phiên bản bài nộp (Revision Tabs/Dropdown: `Bản nộp #2 (Mới nhất)`, `Bản nộp #1`); Thời điểm nộp và người nộp. |
| 5 | **AI Review Panel** | Khung nhận xét từ Reviewer AI (có nhãn `Nhận xét AI` và chip `aiMode: real/mock`): Tóm tắt đánh giá chung; Bảng chi tiết từng tiêu chí: Bằng chứng trích dẫn trực tiếp từ bài nộp (Quote), Phần còn thiếu (Missing), Gợi ý chỉnh sửa (Suggestion). Tuyệt đối không giả mạo kết quả chạy test tự động. |
| 6 | **Submission Form** | Khung dành cho người phụ trách khi task chưa `done`: Lựa chọn định dạng (`Văn bản`, `Markdown`, `Đoạn mã`); Ô soạn thảo nội dung (TextArea đa dòng dán trực tiếp; không có tính năng upload file hay đọc URL bên ngoài); Nút Primary CTA: `Nộp bài & Yêu cầu Review`. |
| 7 | **Acceptance Actions** | Dành riêng cho Trưởng nhóm / Người nghiệm thu: Nút `Xác nhận hoàn thành` (Màu xanh lá, chỉ sáng khi bản nộp mới nhất đạt tất cả tiêu chí) và Nút `Yêu cầu chỉnh sửa` (Màu cam, bắt buộc nhập lý do yêu cầu). |

### 4. Trường dữ liệu và Khối thông tin
- `Submission`:
  - `revision`: Số nguyên tăng dần (`1`, `2`...).
  - `contentType`: `text`, `markdown`, hoặc `code`.
  - `content`: Nội dung văn bản dán trực tiếp.
  - `submittedAt`: Thời điểm server ghi nhận.
- `Review`:
  - `results`: Mảng kết quả cho từng `criterionId`.
  - `verdict`: `met` (Đạt), `not_met` (Chưa đạt), `insufficient_evidence` (Chưa đủ bằng chứng để kết luận).
  - `evidence`: Trích dẫn chính xác một đoạn văn bản có trong bài nộp.
  - `summary`: Nhận xét tổng quan của AI.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Nộp bài & Yêu cầu Review` (Primary Button):
  - Hiển thị: Người phụ trách task hoặc Trưởng nhóm.
  - Kết quả: Tạo bản ghi `Submission`, chuyển task sang `in_review`, gọi Reviewer AI phân tích và hiển thị kết quả.
- `Xác nhận hoàn thành` (Success Button):
  - Hiển thị: Chỉ Trưởng nhóm hoặc thành viên có `canAccept: true`.
  - Trạng thái: Kích hoạt khi phiên bản bài nộp mới nhất có kết quả Review toàn bộ tiêu chí là `met`.
  - Kết quả: Chuyển trạng thái task sang `done`, ghi nhận `acceptedAt` và `acceptedByMemberId`.
- `Yêu cầu chỉnh sửa` (Outline Button):
  - Kết quả: Chuyển trạng thái task sang `changes_requested`, gửi kèm lý do cho người phụ trách.

### 6. Hành vi tương tác chi tiết
- **Nộp lại giữ nguyên lịch sử**: Nộp bản mới sẽ tạo Revision tiếp theo, không bao giờ ghi đè hoặc xóa mất nội dung bài nộp cũ.
- Khi người dùng đang gõ dở nội dung bài nộp mà bấm nút đóng Drawer, hiển thị cảnh báo: *"Nội dung bài nộp chưa được gửi. Bạn có chắc chắn muốn đóng?"*.

### 7. Ma trận trạng thái giao diện
- **AI Review Pending**: Hiển thị hộp thông báo nhẹ: *"Reviewer AI đang đối chiếu bài nộp với các tiêu chí nghiệm thu..."*.
- **Review Error**: Nếu AI lỗi, bài nộp vẫn được lưu an toàn, task giữ ở `in_review` và hiển thị nút "Yêu cầu đánh giá lại".

### 8. Bản sao văn bản thực tế (Microcopy)
- *Trích dẫn bằng chứng mẫu*: "Bằng chứng tìm thấy trong bài nộp: '...hệ thống hỗ trợ thanh toán qua chuyển khoản ngân hàng và thẻ nội địa...' (Khớp với Tiêu chí 2)."
- *Thông báo chưa đủ bằng chứng*: "Chưa đủ bằng chứng: Bài nộp chưa đề cập đến quy trình hoàn tiền tự động theo yêu cầu của Tiêu chí 3."

### 9. Khả năng tiếp cận và Bàn phím
- Toàn bộ Drawer được bao bọc trong cơ chế Focus Trap (tiêu điểm bàn phím không bị lọt ra ngoài nền danh sách). Bấm phím `Escape` để đóng Drawer an toàn.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV2** (Phần khung Drawer & Metadata) và **TV3** (Form Nộp bài, Bảng Review & Nghiệm thu).
- **Tái sử dụng**: `Button`, `Badge`, `TextArea`, `ReviewTable`, `SubmissionForm`.

---

## P07. Kênh Trao Đổi & Theo Dõi Tiến Độ (Chat & Coordination)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Kênh cập nhật tiến độ công việc tự nhiên qua hội thoại văn bản; Coordinator AI tự động phân tích để cập nhật trạng thái công việc hoặc hỏi lại khi thông tin chưa rõ ràng.
- **Câu hỏi cần trả lời**: Hôm nay nhóm đã làm được gì? Có ai đang gặp trở ngại cần hỗ trợ không? Cập nhật của tôi đã được hệ thống ghi nhận chính xác vào công việc nào chưa?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**: Mọi thành viên thuộc dự án (`leader` và `member`).
- **Tuyến Route**: `/app/projects/:projectId/chat`.
- **Điều hướng vào**: Từ Tab "Chat" trên thanh điều hướng chính.
- **Điều hướng ra**: Nhấp vào các thẻ công việc (Task chip) gắn trong tin nhắn → Mở ngăn kéo chi tiết P06.

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Toàn màn hình**: Khung chat chia 2 phần cố định: Vùng hiển thị lịch sử tin nhắn (Có thanh cuộn độc lập) và Khung soạn thảo tin nhắn cố định ở đáy trang (Bottom Composer).
- **Bố cục Mobile (< 768px)**: Tương tự; tối ưu chiều cao bàn phím ảo di động để khung soạn thảo không bị che khuất.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Chat Header** | Tiêu đề: `Kênh trao đổi dự án`; Chú thích nhỏ: *"Cập nhật tiến độ hoặc nêu trở ngại tại đây. Coordinator sẽ hỗ trợ ghi nhận."*. |
| 2 | **Message Feed** | Dòng thời gian tin nhắn: Tên người gửi, Avatar, Thời điểm gửi (Giờ:Phút); Nội dung văn bản; Thẻ công việc liên kết (Task Chip); Huy hiệu chỉ thị trạng thái phân tích (`Đã cập nhật`, `Cần làm rõ`, `Trao đổi thông thường`). |
| 3 | **Coordinator Response** | Tin nhắn phản hồi tự động từ Coordinator AI (có icon đặc trưng và nhãn `Coordinator`): Báo cáo tóm tắt nội dung vừa cập nhật; Hoặc hiển thị câu hỏi làm rõ kèm danh sách các nút bấm chọn công việc phù hợp nếu tin nhắn ban đầu mơ hồ. |
| 4 | **Message Composer** | Ô nhập văn bản đa dòng (TextArea, tự động co giãn 1–4 dòng); Hướng dẫn phím tắt: *"Nhấn Enter để gửi, Shift + Enter để xuống dòng"*; Nút bấm `Gửi` (Primary Button). |

### 4. Trường dữ liệu và Khối thông tin
- `Message`:
  - `id`: Mã tin nhắn.
  - `authorName`: Tên người gửi.
  - `content`: Nội dung văn bản gốc.
  - `taskId`: Mã công việc được liên kết chắc chắn (nếu có).
  - `resolution`: `applied` (Đã cập nhật thành công), `clarification_required` (Cần hỏi lại), `no_change` (Tin nhắn thảo luận thuần túy).
  - `clarificationQuestion`: Câu hỏi từ Coordinator khi mơ hồ.
  - `candidateTasks`: Danh sách các công việc gợi ý để người dùng chọn xác nhận.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Gửi tin nhắn` (Primary Button):
  - Kích hoạt khi ô soạn thảo có ít nhất 1 ký tự không phải khoảng trắng.
  - Kết quả: Gửi tin nhắn lên server, hiển thị ngay trên dòng thời gian, gọi Coordinator AI xử lý.
- `Chọn công việc xác nhận` (Nút danh sách trong tin nhắn hỏi lại):
  - Hiển thị: Khi Coordinator phản hồi yêu cầu làm rõ công việc.
  - Kết quả: Người dùng bấm chọn đúng task và trạng thái muốn cập nhật; hệ thống ghi nhận `ProgressUpdate` chính thức.

### 6. Hành vi tương tác chi tiết
- **Phím bấm gửi thông minh**: Phím `Enter` thực hiện gửi tin nhắn; `Shift + Enter` thực hiện xuống dòng. Cơ chế tự động nhận diện bộ gõ tiếng Việt (IME composition): **Tuyệt đối không kích hoạt gửi tin nhắn khi người dùng đang trong quá trình gõ dấu tiếng Việt**.
- **Không tự động cuộn gây mất dấu**: Nếu người dùng đang cuộn chuột lên trên để đọc lại lịch sử tin nhắn cũ, hệ thống không tự ý cuộn vọt xuống đáy khi có tin nhắn mới tới; thay vào đó hiển thị một nút nhỏ: *"Có tin nhắn mới ↓"*.

### 7. Ma trận trạng thái giao diện
- **Đang gửi (Pending)**: Tin nhắn hiển thị mờ nhẹ kèm biểu tượng đồng hồ nhỏ; ô soạn thảo được xóa trắng sẵn sàng cho tin nhắn tiếp theo.
- **Gửi thất bại (Error)**: Tin nhắn hiển thị viền đỏ kèm dòng chữ *"Chưa gửi được"* và nút *"Thử gửi lại"*; nội dung chưa gửi được khôi phục lại trong ô soạn thảo.

### 8. Bản sao văn bản thực tế (Microcopy)
- *Phản hồi cập nhật thành công*: "Coordinator: Đã ghi nhận tiến độ cho công việc **'Xây dựng API phòng trống'**. Trạng thái chuyển sang: **Đang làm**."
- *Phản hồi khi mơ hồ*: "Coordinator: Bạn đang nhắc đến công việc nào dưới đây? Hãy bấm chọn để tôi ghi nhận tiến độ chính xác:" kèm 2 nút bấm: `[Task 101: Thiết kế UI]` và `[Task 102: Xây dựng API]`.
- *Tin nhắn "Mình xong rồi"*: Được hiển thị như lời trao đổi của thành viên. Coordinator sẽ lịch sự nhắc nhở: *"Tuyệt vời! Hãy chuyển sang tab Chi tiết công việc để nộp bài nghiệm thu chính thức nhé."* — Tuyệt đối không tự ý chuyển task sang `done`.

### 9. Khả năng tiếp cận và Bàn phím
- Khung nhập tin nhắn luôn sẵn sàng nhận tiêu điểm (Focus); các lựa chọn trong tin nhắn hỏi lại có thể điều hướng bằng phím `Tab` và kích hoạt bằng `Enter`.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV2**.
- **Tái sử dụng**: `TextArea`, `Button`, `Badge`, `AgentMessage`.

---

## P08. Báo Cáo Tiến Độ Tuần & Nguồn Dẫn Chứng (Weekly Report & Sources)

### 1. Mục tiêu và Câu hỏi người dùng
- **Mục tiêu**: Cung cấp bức tranh toàn cảnh về tiến độ dự án theo tuần; hiển thị các chỉ số snapshot do backend tính toán và các nhận định khách quan của AI có gắn kèm liên kết nguồn dẫn chứng minh bạch.
- **Câu hỏi cần trả lời**: Trong tuần qua nhóm đã hoàn thành được những việc gì? Có bao nhiêu bài nộp đúng hạn? Ai đang gặp khó khăn cần hỗ trợ? Các nhận định trong báo cáo dựa trên bằng chứng nào?

### 2. Điều kiện truy cập và Điều hướng
- **Vai trò**:
  - Mọi thành viên trong dự án: Xem các báo cáo tuần đã tạo trong dự án đó. Tuyệt đối không nhìn thấy dữ liệu của dự án khác.
  - Trưởng nhóm (`leader`): Có thêm quyền chọn khoảng thời gian và bấm nút "Tạo báo cáo tuần mới".
- **Tuyến Route**: `/app/projects/:projectId/reports`.
- **Điều hướng vào**: Từ Tab "Báo cáo" trên thanh điều hướng chính.
- **Điều hướng ra**: Nhấp vào Chip nguồn dẫn chứng (`SourceChip`) → Mở Drawer ngữ cảnh xem chi tiết Task, Bài nộp hoặc Tin nhắn liên quan.

### 3. Thứ tự các vùng và Bố cục giao diện
- **Bố cục Desktop (≥ 1024px)**: Khung chứa tối đa `1200px`; Phía trên là Thanh chọn kỳ báo cáo và Nút kích hoạt tạo mới; Khối thông tin thời điểm chụp dữ liệu (Snapshot Metadata); Lưới chỉ số do backend tính (Metrics Cards); Bảng nhận định tóm tắt kèm nguồn; Bảng hoạt động chi tiết của từng thành viên.
- **Bố cục Mobile (< 768px)**: Xếp chồng dọc; Bộ chọn tuần dạng thanh trượt ngang; Lưới chỉ số chuyển thành 2 cột; Bảng thành viên chuyển thành danh sách thẻ cá nhân.

| Thứ tự | Vùng chức năng | Chi tiết nội dung hiển thị |
|---|---|---|
| 1 | **Report Selector & Action** | Bộ chọn danh sách các báo cáo đã lưu (Dropdown/Tabs tuần); Nút Primary CTA: `+ Tạo báo cáo tuần` (Chỉ Trưởng nhóm nhìn thấy và thao tác được). |
| 2 | **Snapshot Metadata** | Hộp thông tin rõ ràng: Khoảng thời gian báo cáo `[periodStart – periodEnd)`; Mốc thời gian chụp dữ liệu `asOf` (Giờ, Ngày theo múi giờ `Asia/Ho_Chi_Minh`); Người tạo báo cáo; Nhãn chế độ AI (`aiMode: real/mock`). |
| 3 | **Backend Metrics Grid** | 4 thẻ số liệu khách quan do Backend tính toán độc lập: (1) Số task đến hạn trong kỳ; (2) Số task nộp bài đúng hạn; (3) Số task được nghiệm thu đúng hạn; (4) Số task đang quá hạn tại thời điểm chụp. Tách bạch rõ ràng giữa thời điểm nộp và thời điểm nghiệm thu. |
| 4 | **AI Summary with Sources** | Các gạch đầu dòng nhận định tổng quan do AI tóm tắt: Mỗi nhận định bắt buộc đi kèm ít nhất một Thẻ nguồn dẫn chứng (SourceChip) trỏ về Task, Tin nhắn hoặc Bài nộp cụ thể. |
| 5 | **Member Activity Table** | Bảng chi tiết từng thành viên trong nhóm: Tên thành viên; Việc đã nghiệm thu; Việc đang chờ review; Việc đang làm; Trở ngại ghi nhận; Quyết định cần xử lý. Nếu thành viên không có cập nhật trong kỳ, hiển thị nhãn trung tính `Chưa có dữ liệu trong kỳ`, tuyệt đối không kết luận là "lười" hay "không làm việc". |

### 4. Trường dữ liệu và Khối thông tin
- `WeeklyReport`:
  - `id`: Mã báo cáo.
  - `periodStart`, `periodEnd`: Khoảng thời gian tuần xét duyệt.
  - `asOf`: Mốc thời gian máy chủ khóa dữ liệu tính toán.
  - `metrics`: Đối tượng chứa các con số do backend tính: `dueInPeriodTotal`, `submittedOnTimeTotal`, `acceptedOnTimeTotal`, `overdueOpenTotal`.
  - `summary`: Mảng các mục nhận định `{ text: string, sourceRefs: SourceRef[] }`.
  - `sourceRefs`: Danh sách các tham chiếu `{ entity: 'Task'|'Message'|'Submission'|'Review', id: string }`.

### 5. Danh sách Hành động và Nút bấm (CTA)
- `Tạo báo cáo tuần` (Primary Button):
  - Hiển thị: Chỉ Trưởng nhóm (`leader`).
  - Trạng thái: Kích hoạt bình thường. Khi bấm, mở hộp thoại chọn khoảng ngày (mặc định từ đầu tuần đến thời điểm hiện tại).
  - Trạng thái đang xử lý: Đổi chữ thành `"Đang tổng hợp báo cáo..."`, khóa nút bấm chống gửi đúp.
  - Kết quả: Backend chụp snapshot dữ liệu, tính metrics, gọi AI tóm tắt, lưu trữ thành bản ghi `WeeklyReport` mới và hiển thị trên màn hình.
- `Bấm xem nguồn dẫn chứng` (SourceChip Click):
  - Kết quả: Mở cửa sổ nhỏ hoặc Drawer hiển thị đúng nội dung của Task, Bài nộp hoặc Tin nhắn được trích dẫn.

### 6. Hành vi tương tác chi tiết
- **Báo cáo là ảnh chụp cố định (Snapshot)**: Mọi số liệu và nhận định trong báo cáo giữ nguyên theo mốc `asOf`, không bị tự động tính lại hoặc sai lệch khi các công việc bên ngoài thay đổi trạng thái sau đó.
- Không hỗ trợ tính năng xuất PDF hoặc vẽ biểu đồ phức tạp trong MVP để đảm bảo hoàn thành trong thời gian quy định.

### 7. Ma trận trạng thái giao diện
- **Empty State**: Khi dự án mới tạo và chưa có báo cáo nào: Hiển thị thông báo trung tính: *"Chưa có báo cáo tuần nào được tạo. Trưởng nhóm có thể bấm nút phía trên để tạo báo cáo đầu tiên."*.
- **Generation Error**: Nếu AI tóm tắt lỗi (502/504), số liệu backend đã tính vẫn hiển thị đầy đủ kèm thông báo: *"Chưa thể tạo nhận định tóm tắt tự động. Bạn có thể bấm Thử lại tóm tắt."*.

### 8. Bản sao văn bản thực tế (Microcopy)
- *Thời điểm chụp*: "Dữ liệu được chụp vào lúc: 17:00 ngày 07/11/2026 (Giờ Việt Nam) • Khoảng xét: 01/11/2026 – 07/11/2026."
- *Nhận định có nguồn mẫu*: "Thành viên Lê Bàn Giao đã nộp bản sửa đổi cho module giao diện đặt phòng trước hạn 4 tiếng [Nguồn: Bài nộp #2 • Task 101]."
- *Thành viên chưa có cập nhật*: "Trần Theo Dõi: Chưa có cập nhật mới trong kỳ xét duyệt này [Icon xám trung tính]."

### 9. Khả năng tiếp cận và Bàn phím
- Bảng thành viên có tiêu đề cột rõ ràng; các thẻ Chip nguồn có thể nhận tiêu điểm và kích hoạt bằng phím `Enter`.

### 10. Chủ quản và Tái sử dụng
- **Chủ quản**: **TV3**.
- **Tái sử dụng**: `Button`, `Badge`, `SourceChip`, `Tabs`, `Table`.
