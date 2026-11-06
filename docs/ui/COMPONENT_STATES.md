# Danh Mục Thành Phần và Ma Trận Trạng Thái (Component States & Inventory) — TeamFlow AI

> [!IMPORTANT]
> **Đặc tả chi tiết các thành phần giao diện dùng chung (UI Components) cho phiên triển khai.**
> Tài liệu này đóng vai trò hợp đồng giao diện, quy định cấu trúc (Anatomy), biến thể (Variants), ma trận trạng thái (States Matrix), hành vi bàn phím (Keyboard Navigation) và trách nhiệm sở hữu (Owner) giữa TV1, TV2 và TV3.

---

## 1. Nguyên Tắc Tương Tác Cốt Lõi (Interaction Principles)

1. **Vô hiệu hóa có lý do rõ ràng (Accessible Disabled States)**:
   - Khi một nút bấm hoặc điều khiển bị vô hiệu hóa (disabled), không chỉ làm mờ nút đơn thuần mà phải cung cấp lý do giải thích dễ tiếp cận (thông qua văn bản hướng dẫn liền kề hoặc thuộc tính `aria-describedby`). Tuyệt đối không giấu thông tin bắt buộc trong tooltip hover vì người dùng di động hoặc bàn phím không thể tiếp cận được.
2. **Thông báo Toast chỉ dành cho xác nhận ngắn**:
   - Thành phần Toast chỉ dùng để thông báo phản hồi thành công ngắn gọn (ví dụ: *"Đã lưu liên kết"*), tự biến mất sau 3–4 giây. Mọi thông báo lỗi hoặc cảnh báo đòi hỏi người dùng sửa sai bắt buộc phải hiển thị **Inline Alert** ngay tại ngữ cảnh thao tác và tồn tại cho đến khi người dùng sửa xong.
3. **Tuyệt đối không dùng Spinner che toàn màn hình**:
   - Khi một bảng hoặc một nút đang xử lý, chỉ hiển thị trạng thái tải cục bộ (Button loading spinner hoặc Table skeleton). Toàn bộ bố cục trang xung quanh phải được giữ nguyên, cho phép người dùng quan sát hoặc hủy bỏ thao tác.
4. **Phân biệt rõ ràng giữa Readonly và Disabled**:
   - `Disabled`: Phần tử không thể tương tác, không thể nhận tiêu điểm bàn phím, bị mờ.
   - `Readonly`: Người dùng không có quyền chỉnh sửa, nhưng **vẫn nhận được tiêu điểm bàn phím, vẫn cho phép chọn văn bản (select) và sao chép (copy)**. Ví dụ: Kế hoạch đã công bố hiển thị ở dạng `readonly` cho thành viên.
5. **Chống bấm đúp và Bảo đảm lưu trữ an toàn (Safe Action Submission)**:
   - Mọi nút bấm gửi dữ liệu quan trọng (Tạo nháp, Duyệt công bố, Nộp bài, Nghiệm thu, Tạo báo cáo) phải tự động chuyển sang trạng thái pending (`disabled` kèm icon xoay) ngay sau cú nhấp chuột đầu tiên.
   - Đi kèm header `Idempotency-Key` được sinh một lần trên client cho mỗi thao tác.
   - Chỉ hiển thị thông báo "Lưu thành công" **sau khi nhận được phản hồi HTTP 200/201 từ máy chủ**. Nếu máy chủ trả lỗi, giữ nguyên dữ liệu trên biểu mẫu và hiển thị nút "Thử lại".
6. **Bảo vệ chống tấn công mã độc (XSS Prevention)**:
   - Toàn bộ nội dung do người dùng nộp (Văn bản, Markdown, Đoạn mã) và tin nhắn chat phải được hiển thị qua bộ xử lý an toàn (HTML Entity Encoding / Markdown Sanitizer). Tuyệt đối không chèn trực tiếp chuỗi thô vào `dangerouslySetInnerHTML`.

---

## 2. Danh Mục Thành Phần Giao Diện (Component Inventory)

### 2.1. Nhóm Điều Khiển Cơ Sở (Primitives)

#### C01. Button (Nút bấm tương tác)
- **Mục đích**: Kích hoạt hành động của người dùng (gửi form, mở modal, chuyển trang).
- **Cấu trúc (Anatomy)**: Vùng chứa nút + Icon trái (tùy chọn) + Nhãn văn bản (bắt buộc) + Icon phải (tùy chọn).
- **Biến thể (Variants)**:
  - `primary`: Nền `primary` (`#0F766E`), chữ trắng `on-primary` (`#FFFFFF`). Dùng cho hành động quan trọng nhất (duy nhất 1 nút trên mỗi vùng tác vụ).
  - `secondary` / `outline`: Nền trong suốt, viền `control-border` (`#64748B`), chữ `text-primary`. Dùng cho hành động phụ.
  - `ghost` / `text`: Nền trong suốt, không viền, chữ `primary`. Dùng cho thao tác đóng, hủy, liên kết phụ.
  - `destructive`: Nền đỏ `#B91C1C`, chữ trắng. Dùng cho hành động xóa, hủy kế hoạch.
- **Ma trận trạng thái**:
  - `default`: Màu chuẩn theo biến thể.
  - `hover`: Màu đậm hơn (`primary-hover: #115E59`).
  - `focus`: Viền `focus-ring` 2px cách mép 2px.
  - `disabled`: Nền `#E2E8F0`, chữ `#94A3B8`, con trỏ `not-allowed`.
  - `loading`: Nút bị khóa, chữ đổi thành *"Đang xử lý..."*, icon xoay tròn nhỏ thay thế icon trái.
- **Khả năng tiếp cận**: Kích thước vùng bấm tối thiểu **`44px`** chiều cao. Hỗ trợ kích hoạt bằng phím `Enter` hoặc `Space`.
- **Chủ quản**: **TV1** (dùng chung cho cả 3 người).

#### C02. TextLink (Liên kết văn bản)
- **Mục đích**: Điều hướng người dùng tới một trang khác hoặc một vị trí neo nội bộ.
- **Cấu trúc**: Văn bản có ý nghĩa rõ ràng (Ví dụ: *"Xem cách hoạt động"*, tuyệt đối không dùng *"tại đây"* trơ trọi).
- **Trạng thái**:
  - `default`: Màu chữ `primary` (`#0F766E`), không gạch chân (hoặc có gạch chân nhẹ).
  - `hover`: Màu chữ `primary-hover` (`#115E59`), gạch chân rõ ràng.
  - `focus`: Đường viền focus bao quanh liên kết.
- **Chủ quản**: **TV1**.

#### C03. TextField & TextArea (Trường nhập văn bản)
- **Mục đích**: Thu thập thông tin dạng văn bản một dòng hoặc nhiều dòng từ người dùng.
- **Cấu trúc**: Nhãn bắt buộc (Label) + Chỉ báo bắt buộc `*` + Ô nhập liệu (Input/TextArea) + Văn bản hướng dẫn (Helper text) / Thông báo lỗi (Error message).
- **Ma trận trạng thái**:
  - `default`: Nền trắng, viền `control-border` (`#64748B`), chữ `text-primary`.
  - `hover`: Viền đậm hơn (`#334155`).
  - `focus`: Viền `primary` (`#0F766E`), viền phụ focus 2px.
  - `error`: Viền đỏ `#B91C1C`, hiển thị dòng chữ đỏ báo lỗi phía dưới có gắn `aria-invalid="true"`.
  - `disabled`: Nền `surface-subtle` (`#F1F5F9`), chữ `#94A3B8`, viền `#CBD5E1`.
  - `readonly`: Nền `surface-subtle`, chữ `text-primary`, viền `#CBD5E1`, cho phép bôi đen copy.
- **Chủ quản**: **TV1** (Form dự án) & **TV2** (Chat) & **TV3** (Bài nộp).

#### C04. DateField (Trường chọn ngày tháng)
- **Mục đích**: Nhập hạn chót hoặc khoảng thời gian theo định dạng chuẩn Việt Nam (`DD/MM/YYYY`) và múi giờ `Asia/Ho_Chi_Minh`.
- **Cấu trúc**: Nhãn + Ô nhập ngày kèm icon lịch + Bộ chọn ngày lịch thả xuống (Calendar dropdown).
- **Ràng buộc**: Kiểm tra logic trực tiếp: Ngày kết thúc không được sớm hơn ngày bắt đầu.
- **Chủ quản**: **TV1** (Dự án) & **TV3** (Báo cáo).

---

### 2.2. Nhóm Hiển Thị Thông Tin & Phân Cấp (Display & Feedback)

#### C05. Badge (Huy hiệu trạng thái)
- **Mục đích**: Nhận diện tức thì trạng thái công việc, vai trò hoặc nhãn thuộc tính.
- **Cấu trúc**: Khối bo tròn viên thuốc (Pill shape) gồm Icon nhỏ 14px + Nhãn văn bản tiếng Việt.
- **Biến thể chuẩn**:
  - `todo` ("Chưa làm"): Chữ `#475569`, nền `#F1F5F9`.
  - `in_progress` ("Đang làm"): Chữ `#1E40AF`, nền `#EFF6FF`.
  - `blocked` ("Bị chặn"): Chữ `#92400E`, nền `#FFFBEB`.
  - `in_review` ("Chờ nghiệm thu"): Chữ `#115E59`, nền `#F0FDFA`.
  - `changes_requested` ("Cần sửa"): Chữ `#9A3412`, nền `#FFF7ED`.
  - `done` ("Hoàn thành"): Chữ `#166534`, nền `#F0FDF4`.
  - `overdue` ("Quá hạn"): Chữ `#B91C1C`, nền `#FEF2F2`. (Huy hiệu độc lập, có thể đi kèm trạng thái khác).
  - `missing_data` ("Chưa có dữ liệu"): Chữ `#64748B`, nền `#F1F5F9`.
- **Quy tắc**: Tuyệt đối không dùng màu sắc một mình; luôn có chữ đi kèm để đảm bảo tiếp cận.
- **Chủ quản**: **TV1** (Định nghĩa chung) & **TV2** (Hiển thị trong bảng task).

#### C06. Alert (Hộp cảnh báo ngữ cảnh)
- **Mục đích**: Cung cấp phản hồi ngữ cảnh quan trọng cần người dùng chú ý.
- **Biến thể**:
  - `info`: Viền xanh dương nhẹ, icon thông tin, chữ thông báo.
  - `warning`: Viền vàng đất, icon tam giác cảnh báo (ví dụ: cảnh báo kế hoạch chưa duyệt).
  - `error`: Viền đỏ, icon lỗi (ví dụ: lỗi gọi AI hoặc mất kết nối máy chủ).
  - `success`: Viền xanh lá, icon tích tròn (ví dụ: công bố kế hoạch thành công).
- **Chủ quản**: **TV1**.

#### C07. Toast (Thông báo nổi ngắn)
- **Mục đích**: Xác nhận nhanh thao tác thành công (ví dụ: *"Đã sao chép liên kết"*, *"Đã lưu nháp"*).
- **Hành vi**: Xuất hiện ở góc dưới bên phải màn hình (hoặc chính giữa cạnh đáy trên di động), tự động ẩn sau 3.5 giây. Không dùng Toast cho các thông báo lỗi nghiêm trọng.
- **Chủ quản**: **TV1**.

#### C08. Skeleton (Khung xương tải dữ liệu)
- **Mục đích**: Giữ nguyên bố cục trang trong lúc dữ liệu đang nạp từ máy chủ, tránh giật vỡ khung hình.
- **Cấu trúc**: Các khối hình chữ nhật màu xám `#E2E8F0` có hiệu ứng sáng quét nhẹ (shimmer effect).
- **Chủ quản**: **TV1** & **TV2**.

#### C09. EmptyState (Khối rỗng dữ liệu)
- **Mục đích**: Hướng dẫn người dùng khi chưa có dữ liệu trong bảng công việc, danh sách dự án hoặc báo cáo.
- **Cấu trúc**: Icon nét viền trung tính + Tiêu đề ngắn + Đoạn văn hướng dẫn hành động tương ứng với vai trò + Nút bấm hành động (nếu có quyền).
- **Chủ quản**: **TV2**.

---

### 2.3. Nhóm Điều Hướng & Lọc Dữ Liệu (Navigation & Filtering)

#### C10. Stepper (Thanh tiến trình Wizard)
- **Mục đích**: Chỉ báo tiến độ 3 bước tạo dự án trong P03.
- **Cấu trúc**: 3 vòng tròn số thứ tự nối với nhau bằng đường kẻ ngang; Bước đã xong (xanh lá kèm icon check), Bước hiện tại (nền `primary`, chữ trắng đậm), Bước chưa tới (nền xám nhạt `#E2E8F0`).
- **Chủ quản**: **TV1**.

#### C11. Tabs (Thanh chuyển tab)
- **Mục đích**: Chuyển đổi giữa 4 phân khu trong dự án: Công việc, Kế hoạch, Chat, Báo cáo (P05).
- **Cấu trúc**: Hàng ngang các tab; Tab được chọn có viền gạch chân đậm màu `primary` (`#0F766E`) dày 3px và chữ đậm `text-primary`.
- **Khả năng tiếp cận**: Hỗ trợ phím mũi tên trái/phải để chuyển tab; phím `Space`/`Enter` để kích hoạt.
- **Chủ quản**: **TV1**.

#### C12. FilterBar (Thanh tìm kiếm và bộ lọc)
- **Mục đích**: Tìm kiếm và lọc danh sách công việc theo tên, người phụ trách và trạng thái.
- **Cấu trúc**: Ô tìm kiếm văn bản (Search Input) + Nút lọc nhanh "Việc của tôi" (Toggle Button) + Dropdown lọc trạng thái + Dropdown lọc thành viên + Nút chữ "Xóa bộ lọc".
- **Chủ quản**: **TV2**.

---

### 2.4. Nhóm Nghiệp Vụ Công Việc & Báo Cáo (Feature Components)

#### C13. TaskRow (Dòng công việc trong bảng)
- **Mục đích**: Thể hiện đầy đủ thông tin cốt lõi của một công việc trên màn hình P05.
- **Cấu trúc**: Tiêu đề công việc + Avatar & Tên người phụ trách + Badge trạng thái + Hạn chót + Icon cảnh báo trở ngại (nếu bị chặn) + Thời gian cập nhật gần nhất.
- **Hành vi**:
  - `hover`: Đổi màu nền sang `surface-subtle` (`#F1F5F9`).
  - `focus`: Hiển thị viền focus bao quanh toàn bộ dòng.
  - `click` / `Enter`: Kích hoạt mở ngăn kéo chi tiết C14.
  - `mobile`: Tự động chuyển đổi thành thẻ danh sách phẳng, giữ nguyên 4 trường cốt lõi.
- **Chủ quản**: **TV2**.

#### C14. TaskDetailPanel (Ngăn kéo chi tiết công việc - Drawer)
- **Mục đích**: Chứa toàn bộ thông tin chi tiết của task, form nộp bài và kết quả review (P06).
- **Cấu trúc**: Ngăn kéo trượt từ cạnh phải màn hình (rộng `520px` – `580px`); Phía trên có tiêu đề và nút Đóng (X); Thân ngăn kéo cuộn độc lập; Chân ngăn kéo chứa nút bấm nghiệm thu hoàn thành.
- **Cơ chế hoạt động**:
  - Kích hoạt Focus Trap khi mở.
  - Nhấn phím `Escape` đóng ngăn kéo và hoàn trả tiêu điểm về đúng dòng `TaskRow` vừa chọn.
  - Nếu có nội dung bài nộp đang soạn dở, hiển thị cảnh báo xác nhận trước khi cho phép đóng.
- **Chủ quản**: **TV2** (Vỏ khung Drawer) kết hợp **TV3** (Ruột nộp bài & review).

#### C15. AgentMessage (Tin nhắn phản hồi từ trợ lý AI)
- **Mục đích**: Hiển thị tin nhắn do Coordinator hoặc Reviewer gửi trong kênh Chat (P07).
- **Cấu trúc**: Nền thẻ màu xám nhạt có viền phân tách mỏng + Icon nhận diện trợ lý + Tên trợ lý + Nội dung phản hồi có cấu trúc + Danh sách nút bấm chọn công việc xác nhận (nếu hỏi lại) + Chip hiển thị nguồn chế độ (`aiMode: real/mock`).
- **Chủ quản**: **TV2**.

#### C16. SubmissionForm (Biểu mẫu nộp bài nghiệm thu)
- **Mục đích**: Cho phép người phụ trách gửi nội dung công việc để nghiệm thu (P06).
- **Cấu trúc**: Bộ chọn định dạng (Văn bản thuần / Markdown / Đoạn mã) + Ô nhập văn bản lớn (TextArea) + Hộp nhắc nhở quy tắc + Nút Primary CTA: "Nộp bài & Yêu cầu Review".
- **Chủ quản**: **TV3**.

#### C17. ReviewTable (Bảng đối chiếu tiêu chí nghiệm thu)
- **Mục đích**: Hiển thị kết quả đánh giá của Reviewer AI đối chiếu bài nộp với các tiêu chí (P06).
- **Cấu trúc**: Danh sách từng tiêu chí:
  - Cột 1: Mã và Nội dung tiêu chí nghiệm thu.
  - Cột 2: Kết quả đánh giá (Huy hiệu: `Đạt`, `Chưa đạt`, `Chưa đủ bằng chứng`).
  - Cột 3: Bằng chứng trích dẫn trực tiếp từ bài nộp (Đoạn trích trong dấu ngoặc kép) hoặc lý do thiếu sót.
  - Cột 4: Gợi ý chỉnh sửa cụ thể.
- **Chủ quản**: **TV3**.

#### C18. SourceChip (Thẻ dẫn chứng nguồn)
- **Mục đích**: Liên kết một nhận định trong Báo cáo tuần (P08) tới dữ liệu gốc đã lưu trong hệ thống.
- **Cấu trúc**: Thẻ nhỏ gọn dạng chip: Icon loại thực thể (Task / Tin nhắn / Bài nộp) + Tên hoặc mã thực thể (Ví dụ: `[Task 101: Giao diện]`).
- **Hành vi**: Nhấp chuột mở cửa sổ xem nhanh ngữ cảnh nguồn gốc; không tạo liên kết giả hoặc dẫn ra ngoài hệ thống.
- **Chủ quản**: **TV3**.

#### C19. ConfirmDialog (Hộp thoại xác nhận thao tác quan trọng)
- **Mục đích**: Buộc người dùng xác nhận các thao tác không thể hoàn tác hoặc có ảnh hưởng lớn (Công bố kế hoạch, Hủy thay đổi, Duyệt hoàn thành).
- **Cấu trúc**: Tiêu đề cảnh báo rõ ràng + Đoạn văn mô tả hệ quả cụ thể + Nút Hủy bỏ (Outline) + Nút Đồng ý xác nhận (Primary hoặc Destructive).
- **Chủ quản**: **TV1** (Dùng chung).

---

## 3. Bảng Phân Định Sở Hữu Thành Phần (Component Ownership Matrix)

| Mã Thành phần | Tên Thành phần | Thành viên Sở hữu Chính | Thành viên Tái sử dụng | Ghi chú tích hợp |
|---|---|---|---|---|
| **C01** | `Button` | **TV1** | TV2, TV3 | Thành phần nền tảng, xuất khẩu từ `src/ui/primitives/`. |
| **C02** | `TextLink` | **TV1** | TV2, TV3 | Dùng cho liên kết nội bộ và anchor landing page. |
| **C03** | `TextField` / `TextArea` | **TV1** | TV2, TV3 | Dùng cho form wizard, khung chat và form nộp bài. |
| **C04** | `DateField` | **TV1** | TV3 | Xử lý ngày tháng theo múi giờ `Asia/Ho_Chi_Minh`. |
| **C05** | `Badge` | **TV1** | TV2, TV3 | Giữ nguyên mã màu và nhãn trạng thái cố định. |
| **C06** | `Alert` | **TV1** | TV2, TV3 | Dùng cho cảnh báo lỗi mạng, lỗi AI và kế hoạch nháp. |
| **C07** | `Toast` | **TV1** | TV2, TV3 | Chỉ dùng thông báo thành công ngắn hạn. |
| **C08** | `Skeleton` | **TV1** | TV2, TV3 | Giữ layout khi nạp dữ liệu. |
| **C09** | `EmptyState` | **TV2** | TV1, TV3 | Hiển thị khi danh sách rỗng, kèm hướng dẫn hành động. |
| **C10** | `Stepper` | **TV1** | - | Phục vụ Wizard tạo dự án 3 bước. |
| **C11** | `Tabs` | **TV1** | TV2, TV3 | Thanh điều hướng 4 tab dự án tại P05. |
| **C12** | `FilterBar` | **TV2** | - | Phục vụ lọc và tìm kiếm task trong P05. |
| **C13** | `TaskRow` | **TV2** | - | Thể hiện dòng dữ liệu công việc trong bảng P05. |
| **C14** | `TaskDetailPanel` | **TV2** (Vỏ) | TV3 (Ruột) | TV2 tạo khung Drawer; TV3 cắm `SubmissionForm` & `ReviewTable`. |
| **C15** | `AgentMessage` | **TV2** | - | Hiển thị tin nhắn Coordinator trong P07. |
| **C16** | `SubmissionForm` | **TV3** | TV2 | Cắm vào trong Drawer C14 của TV2. |
| **C17** | `ReviewTable` | **TV3** | TV2 | Hiển thị bảng đối chiếu tiêu chí trong Drawer C14. |
| **C18** | `SourceChip` | **TV3** | - | Liên kết nguồn dẫn chứng trong Báo cáo tuần P08. |
| **C19** | `ConfirmDialog` | **TV1** | TV2, TV3 | Hộp thoại xác nhận trước khi publish hoặc nghiệm thu. |
