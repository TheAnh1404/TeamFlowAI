# Quy tắc Giao diện & Trải nghiệm Người dùng (UI/UX Rules) — TeamFlow AI

> Mở rộng Coordinator V2 07/11/2026: P07 có chat raw/check-in/inbox/lịch; P08 có report tuần/trước họp draft/publish. Không thêm trang settings/calendar độc lập. Trạng thái lưu tin tách phân tích AI, reminder template gắn Hệ thống, chỉ nội dung AI có nhãn real/mock. Draft chỉ leader; share có xác nhận. Giữ design tokens và các bất biến phía dưới. Hợp đồng ghép UI: [COORDINATOR_FRONTEND_HANDOFF](../COORDINATOR_FRONTEND_HANDOFF.md).

> [!IMPORTANT]
> **Tài liệu bắt buộc tuân thủ trong phiên triển khai giao diện.**
> Mọi thành viên (TV1, TV2, TV3) khi triển khai mã nguồn giao diện phải đối chiếu và tuân thủ các quy tắc trong tài liệu này. Không tự ý thay đổi màu sắc, thêm trang ngoài phạm vi, hoặc tự động hóa các hành vi vi phạm ranh giới kiểm soát của con người.

---

## 1. Mục tiêu và Phạm vi MVP (4 Giờ)

TeamFlow AI là ứng dụng điều phối công việc dành cho nhóm nhỏ (3–8 người) với sự hỗ trợ của 3 trợ lý AI:
1. **Planner**: Đề xuất kế hoạch và phân công dựa trên mục tiêu, kỹ năng, thời gian khả dụng; **trưởng nhóm bắt buộc sửa và duyệt trước khi công bố**.
2. **Reviewer**: Đối chiếu bài nộp với tiêu chí nghiệm thu; chỉ ra bằng chứng cụ thể và gợi ý sửa; **không tự ý đánh dấu hoàn thành**.
3. **Coordinator**: Ghi nhận tiến độ và trở ngại qua chat; hỗ trợ tổng hợp báo cáo tuần có nguồn dẫn chứng khi người dùng bấm nút.

### Ranh giới phạm vi (Scope Boundary)
- **Trong phạm vi MVP**:
  - Giao diện Landing Page giới thiệu đúng tính năng thực tế.
  - Bảng công việc dạng danh sách (List view) tập trung vào thông tin thực chất.
  - Khung chat nội bộ hỗ trợ cập nhật tiến độ gắn với task cụ thể.
  - Nộp bài dạng văn bản thô, Markdown hoặc đoạn mã dán trực tiếp.
  - AI Review theo từng tiêu chí kèm trích dẫn bằng chứng.
  - Báo cáo tuần kích hoạt bằng nút bấm thủ công, số liệu do backend tính, AI tóm tắt có nguồn.
  - Session demo chọn vai trò định sẵn trên server (TV1/TV2/TV3).
- **Tuyệt đối KHÔNG triển khai trong MVP**:
  - Tích hợp Google Meet / Lịch Google thật.
  - Đăng nhập OAuth Google / tài khoản mạng xã hội.
  - Bot chat bên ngoài (Telegram, Slack, Discord).
  - Bảng Kanban kéo thả, biểu đồ Gantt, đồ thị phức tạp.
  - Tải lên tệp tin (File upload), đọc đường dẫn URL bên ngoài, đọc repository Git.
  - Quản lý thanh toán, gói dịch vụ (Pricing / Billing).
  - Trang cài đặt hệ thống phức tạp (Settings).
  - Chế độ giao diện tối (Dark mode) — toàn bộ MVP sử dụng nền sáng.
  - Bộ lập lịch tự động ngầm (Cron scheduler / Daily automated check-in).

---

## 2. Các Điều Cấm về Thiết kế (Design Invariants)

Để đảm bảo sản phẩm chuyên nghiệp, nhất quán và hoàn thành đúng hạn 240 phút:

1. **Cấm phong cách thị giác gây xao nhãng**:
   - Không dùng nền chuyển màu tím/xanh (purple/blue gradient) toàn trang.
   - Không dùng hiệu ứng kính mờ (glassmorphism), nền dạ quang neon, hình khối 3D hoặc mascot robot lớn.
   - Không dùng animation chuyển động liên tục gây mỏi mắt hoặc bắt người dùng chờ giao diện chuyển động.
2. **Cấm lạm dụng Card**:
   - Không ép mọi dòng dữ liệu vào từng thẻ hộp riêng lẻ gây vỡ vụn bố cục. Ưu tiên sử dụng bảng (table), danh sách phẳng có phân cách (divider) và khoảng trắng (white-space) hợp lý.
3. **Cấm Emoji thay Icon hệ thống**:
   - Giao diện thao tác chuyên nghiệp không dùng emoji ngẫu nhiên làm nút bấm hay chỉ báo trạng thái. Sử dụng thống nhất một bộ icon nét viền (outline icons, kích thước 16/20/24px).
4. **Cấm gán nhãn hiệu năng / phần trăm giả**:
   - Không suy diễn trạng thái “gần xong” thành phần trăm (ví dụ: cấm hiển thị “Đã hoàn thành 80%”).
   - Không hiển thị thanh tiến độ chạy ảo khi AI đang xử lý (không bịa tiến độ 30%... 70%... 100%).
   - Không xếp hạng thành viên hay đánh giá "chăm/lười" dựa trên số lượng tin nhắn hay task.
5. **Cấm nhiều hành động cạnh tranh**:
   - Trong mỗi màn hình hoặc vùng tác vụ (panel/modal), chỉ có **duy nhất 1 hành động chính (Primary CTA)** nổi bật với màu chủ đạo `#0F766E`. Các hành động còn lại phải dùng dạng đường viền (Outline/Secondary) hoặc dạng chữ (Text/Ghost button).
6. **Cấm tuyên bố cảm tính về màu sắc**:
   - Màu sắc là lựa chọn nhận diện thương hiệu và đảm bảo độ tương phản đọc, không tuyên bố màu sắc "tự nó tăng 50% năng suất" hoặc "tự tạo niềm tin".

---

## 3. Nguồn Token Duy Nhất (Single Source of Truth)

- Toàn bộ màu sắc, kích thước chữ, khoảng cách, bo góc và hiệu ứng đổ bóng bắt buộc lấy từ [Hệ thống Thiết kế](DESIGN_SYSTEM.md).
- Không tự ý thêm mã màu HEX mới ngoài danh mục đã phê duyệt.
- Cả trang Landing Page và Ứng dụng App dùng chung một hệ thống token và component cơ sở để giảm thiểu mã nguồn trùng lặp.

---

## 4. Quyền Hạn và An Toàn Dữ Liệu trên UI (UI Security & Truthfulness)

1. **Giao diện không quyết định quyền hạn**:
   - Việc ẩn nút hoặc làm mờ nút (disabled) chỉ nhằm tối ưu trải nghiệm người dùng, không thay thế cho kiểm tra phân quyền tại server.
   - Dữ liệu người dùng và vai trò (`leader`, `member`) phải xuất phát từ session do server trả về, không tin tưởng tham số do client tự khai.
2. **Bảo mật kế hoạch nháp (Draft Plan)**:
   - Kế hoạch khi đang ở trạng thái `draft` chỉ hiển thị cho Trưởng nhóm (`leader`).
   - Tuyệt đối không để lộ danh sách task nháp cho thành viên qua đường dẫn trực tiếp, xem trước (preview), công cụ tìm kiếm hay huy hiệu thông báo.
3. **Xử lý truy cập trái phép**:
   - Khi người dùng truy cập vào dự án không thuộc danh sách tham gia hoặc task không tồn tại, hiển thị thông báo lỗi gọn gàng, từ chối truy cập (403/404), tuyệt đối không để lộ tiêu đề hoặc dữ liệu nhạy cảm của dự án khác.
4. **Bảo vệ nội dung người dùng nộp (Safe Rendering)**:
   - Nội dung nộp bài (Markdown/Code) và tin nhắn chat phải được xử lý hiển thị an toàn (escape HTML/XSS). Không tự ý biên dịch hoặc thực thi mã JavaScript từ bài nộp của người dùng.

---

## 5. Ranh Giới AI và Quyền Kiểm Soát của Con Người (Human-in-the-Loop)

Mọi tính năng AI trong TeamFlow AI phải tuân thủ nghiêm ngặt nguyên tắc trung thực và giữ con người làm trung tâm quyết định:

| Tính năng AI | Hành vi AI ĐƯỢC PHÉP | Hành vi AI TUYỆT ĐỐI BỊ CẤM |
|---|---|---|
| **Planner** | Đề xuất danh sách công việc, người phụ trách, thời hạn và tiêu chí nghiệm thu vào bản nháp. | Tự ý công bố (publish) kế hoạch; tự ý sửa đổi kế hoạch đã được duyệt mà không có xác nhận của trưởng nhóm. |
| **Coordinator** | Phân tích tin nhắn, hỏi lại khi mơ hồ, trích xuất thông tin tiến độ/trở ngại gắn với task đã xác định. | Tự ý đổi hạn chót (deadline), đổi người phụ trách, đổi tiêu chí nghiệm thu; tự ý đánh dấu hoàn thành (`done`). |
| **Reviewer** | Đối chiếu bài nộp với tiêu chí, trích xuất đoạn văn bản làm bằng chứng, nêu điểm còn thiếu và gợi ý. | Tự ý nghiệm thu task sang `done`; bịa bằng chứng không có trong bài nộp; giả vờ chạy kiểm thử tự động. |
| **Weekly Report** | Tóm tắt các sự kiện nổi bật dựa trên số liệu snapshot backend cung cấp, kèm liên kết dẫn chứng. | Tự tính toán lại số liệu; sửa đổi metrics của backend; bịa nhận định không có nguồn dữ liệu lưu trữ. |

> [!CAUTION]
> - Mọi nội dung do AI tạo ra trên giao diện bắt buộc phải có nhãn nhận diện rõ ràng (ví dụ: `Nhận xét AI`, nhãn chế độ `aiMode: real` hoặc `aiMode: mock`).
> - Kết quả AI Review chỉ là ý kiến tư vấn chuyên môn. Quyền chuyển task sang `done` chỉ thuộc về Trưởng nhóm hoặc thành viên được cấp quyền nghiệm thu (`canAccept: true`).

---

## 6. Phân Công Trách Nhiệm Giao Diện (UI Ownership)

Để tránh xung đột mã nguồn trong 240 phút triển khai, các thành viên chịu trách nhiệm độc lập theo từng vùng giao diện:

| Thành viên | Vùng Giao diện Sở hữu | Đầu mối Tệp Dự kiến | Trách nhiệm Phối hợp |
|---|---|---|---|
| **TV1** | - Giao diện chung, Shell layout & Navigation.<br>- Landing Page (P01).<br>- Wizard Tạo dự án (P03).<br>- Kế hoạch: Xem, sửa, duyệt & công bố (P04). | `src/ui/layout/`<br>`src/features/landing/`<br>`src/features/planning/` | Cung cấp khung Layout và Navigation dùng chung cho TV2 và TV3 gắn các màn hình con. |
| **TV2** | - Danh sách dự án & Điểm vào phiên demo (P02).<br>- Bảng công việc Workspace (P05).<br>- Vỏ khung Chi tiết công việc (P06 Shell/Drawer).<br>- Khung Chat & Tracking Coordinator (P07). | `src/features/tracking/`<br>`src/features/chat/`<br>`src/features/tasks/` | Quản lý danh sách task và drawer chi tiết; chừa điểm gắn (slot) cho form nộp bài và review của TV3. |
| **TV3** | - Form nộp bài & Bảng AI Review trong P06.<br>- Báo cáo tuần & Nguồn dẫn chứng (P08).<br>- Thành phần hiển thị nhãn AI (`real`/`mock`). | `src/features/delivery/`<br>`src/features/reports/`<br>`src/features/ai-common/` | Đóng gói thành phần Submission/Review để nhúng vào Task Detail của TV2; phụ trách toàn bộ trang Report. |

---

## 7. Thứ Tự Ưu Tiên Triển Khai (Priority Matrix)

Khi thời gian bị giới hạn, các thành viên căn cứ vào ma trận ưu tiên để cắt giảm tính năng hợp lý mà không làm gãy luồng demo chính:

| Mức Ưu tiên | Ý nghĩa | Các màn hình / Thành phần áp dụng |
|---|---|---|
| **P0** (Bắt buộc) | Phục vụ trực tiếp kịch bản demo 3 phút 45 giây; thiếu sẽ không thể chứng minh sản phẩm. | - Landing Page cơ bản (P01) có nút vào App.<br>- Tạo dự án 3 bước (P03) và tạo Plan nháp.<br>- Sửa trực tiếp & Duyệt/Công bố kế hoạch (P04).<br>- Bảng task danh sách (P05) và xem chi tiết (P06).<br>- Chat rõ ý & chat mơ hồ có hỏi lại (P07).<br>- Nộp bài văn bản & AI Review hiển thị bằng chứng (P06).<br>- Trưởng nhóm nghiệm thu `done` (P06).<br>- Tạo báo cáo tuần bằng nút, có snapshot & nguồn (P08).<br>- Lưu trữ dữ liệu phía server sau khi tải lại trang (F06). |
| **P1** (Nên có) | Nâng cao trải nghiệm nếu còn thời gian (phút 135–180). | - Bộ lọc tìm kiếm nhanh theo tên task / thành viên (P05).<br>- Hiệu ứng mở Drawer mượt mà trên desktop.<br>- Phím tắt gửi tin nhắn (Shift+Enter xuống dòng, Enter gửi).<br>- Toast thông báo phản hồi thao tác thành công. |
| **P2** (Để sau) | Hoàn toàn nằm ngoài phạm vi 4 giờ; không triển khai. | - Bảng Kanban kéo thả.<br>- Xuất file PDF/Excel báo cáo.<br>- Tải tệp đính kèm bài nộp.<br>- Đổi giao diện tối (Dark mode). |
