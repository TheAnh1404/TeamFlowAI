# Hệ Thống Thiết Kế (Design System) — TeamFlow AI

> [!IMPORTANT]
> **Bộ token và quy chuẩn thiết kế cố định cho toàn bộ dự án TeamFlow AI.**
> Mọi thành viên triển khai giao diện phải sử dụng trực tiếp các token này. Tuyệt đối không thay thế bảng màu hoặc bổ sung token tùy ý nếu không giải trình và kiểm tra độ tương phản theo tiêu chuẩn WCAG 2.2.

---

## 1. Bảng Màu Cố Định (Color Palette & Tokens)

Hệ thống màu sắc được thiết kế tối ưu cho khả năng đọc, nhận diện trực quan nhanh chóng và đảm bảo khả năng tiếp cận (Accessibility).

### 1.1. Bảng Token Cơ Sở

| Token Name | Giá trị HEX | Cặp Ghép Khuyên Dùng (FG / BG) | Vị trí Sử dụng | Cách KHÔNG Được Dùng |
|---|---|---|---|---|
| `canvas` | `#F8FAFC` | Text: `text-primary` (`#0F172A`) trên `canvas` | Nền toàn bộ ứng dụng và Landing Page. | Không dùng làm màu viền hoặc màu chữ. |
| `surface` | `#FFFFFF` | Text: `text-primary` trên `surface` | Nền thẻ nội dung (cards), bảng (tables), hộp thoại (dialogs), thanh bên (sidebar). | Không dùng cho các vùng cần phân tách mức độ ưu tiên phụ. |
| `surface-subtle` | `#F1F5F9` | Text: `text-secondary` (`#475569`) trên `surface-subtle` | Tiêu đề bảng (table header), nền khu vực phụ, trạng thái hover nhẹ của dòng bảng. | Không dùng làm nền cho chữ có độ tương phản thấp (`text-muted`). |
| `text-primary` | `#0F172A` | `#0F172A` trên `surface` hoặc `canvas` | Tiêu đề chính, nhãn dữ liệu quan trọng, nội dung văn bản chính. | Không dùng trên các khối nền tối (như primary đậm). |
| `text-secondary` | `#475569` | `#475569` trên `surface` hoặc `canvas` | Văn bản mô tả phụ, hướng dẫn nhập liệu, nội dung trao đổi thông thường. | Không dùng cho các thông điệp cảnh báo nguy hiểm hoặc lỗi. |
| `text-muted` | `#64748B` | `#64748B` trên `surface` hoặc `canvas` | Nhãn thời gian (timestamp), chú thích kích thước nhỏ (metadata), breadcrumb. | **Không bao giờ giảm opacity**; không dùng cho nội dung bắt buộc người dùng phải đọc. |
| `border-subtle` | `#E2E8F0` | Đường phân cách trên nền `surface` hoặc `canvas` | Đường kẻ chia dòng bảng, phân tách section, viền thẻ trang trí. | **Không dùng làm dấu hiệu duy nhất để nhận biết ô nhập liệu (input)**. |
| `control-border` | `#64748B` | Viền bao quanh các ô input trên nền `surface` | Ranh giới nhận biết các trường nhập liệu (text field, dropdown, textarea). | Không dùng cho văn bản thông thường. |
| `primary` | `#0F766E` | Chữ `on-primary` (`#FFFFFF`) trên nền `primary` | Nút hành động chính (Primary CTA), link được kích hoạt, điểm nhấn quan trọng. | Không dùng cho nút thao tác phụ (dùng outline/text). |
| `primary-hover` | `#115E59` | Chữ `on-primary` trên nền `primary-hover` | Trạng thái hover và active của nút hành động chính. | Không dùng làm màu nền tĩnh toàn trang. |
| `primary-soft` | `#F0FDFA` | Chữ `#115E59` trên nền `primary-soft` | Vùng nhấn nhẹ (callout box, dòng được chọn trong bảng, badge đang xét). | Không dùng chữ trắng trên nền này (vi phạm tương phản). |
| `on-primary` | `#FFFFFF` | Nền `primary` hoặc `primary-hover` | Màu chữ và icon trên các nút có nền màu chủ đạo. | Không dùng trên nền trắng hoặc `canvas`. |
| `focus-ring` | `#0F766E` | Viền bao ngoài ô điều khiển | Đường viền chỉ thị tiêu điểm bàn phím (focus indicator): `outline: 2px solid #0F766E; outline-offset: 2px`. | Không tắt bỏ thuộc tính này (`outline: none` là vi phạm tiếp cận). |

---

### 1.2. Bảng Token Trạng Thái Công Việc (Task Status Tokens)

> [!IMPORTANT]
> Tên mã trạng thái, nhãn hiển thị và màu sắc được giữ cố định, đồng bộ với [CONTRACTS](../CONTRACTS.md):

| Trạng thái (Enum) | Nhãn Tiếng Việt | Màu Chữ (FG) | Màu Nền (BG) | Ý nghĩa nghiệp vụ |
|---|---|---|---|---|
| `todo` | **Chưa làm** | `#475569` | `#F1F5F9` | Công việc đã công bố nhưng thành viên chưa bắt đầu. |
| `in_progress` | **Đang làm** | `#1E40AF` | `#EFF6FF` | Thành viên đã xác nhận đang tiến hành qua chat hoặc cập nhật. |
| `blocked` | **Bị chặn** | `#92400E` | `#FFFBEB` | Công việc gặp trở ngại cần tháo gỡ (bắt buộc kèm mô tả blocker). |
| `in_review` | **Chờ nghiệm thu** | `#115E59` | `#F0FDFA` | Bài nộp đã gửi lên, đang chờ kết quả AI Review hoặc chờ duyệt. |
| `changes_requested`| **Cần sửa** | `#9A3412` | `#FFF7ED` | AI Review hoặc người nghiệm thu chỉ ra tiêu chí chưa đạt. |
| `done` | **Hoàn thành** | `#166534` | `#F0FDF4` | Trưởng nhóm hoặc người có quyền nghiệm thu đã xác nhận đạt tất cả tiêu chí. |
| *(Thuộc tính riêng)* | **Quá hạn** | `#B91C1C` | `#FEF2F2` | **Badge thời hạn độc lập**: Hiển thị khi `deadline < hiện tại` và task chưa `done`. Không thêm vào enum task status. |
| `destructive` / `error` | **Thao tác nguy hiểm / Lỗi** | `#FFFFFF` (nút đặc) / `#B91C1C` (chữ) | `#B91C1C` (hover: `#991B1B`) | Nút hủy kế hoạch, từ chối nghiệm thu, thông báo lỗi hệ thống. |
| `missing-data` | **Chưa có dữ liệu** | `#64748B` | `#F1F5F9` | Dùng icon trung tính + text giải thích khi không có cập nhật trong kỳ. **Không mặc định dùng màu đỏ báo lỗi**. |

---

### 1.3. Nhận Diện Ba Trợ Lý AI (AI Identity Language)

- **Nguyên tắc bình đẳng nhận diện**: Không gán cho mỗi trợ lý AI một màu sắc CTA riêng biệt để tránh làm loạn giao diện.
- **Quy chuẩn hiển thị**: Mỗi trợ lý được định danh bằng **Icon nét viền + Tên gọi + Vai trò** trên nền xám trung tính hoặc `primary-soft`:
  - 📋 **Planner**: Icon clipboard/calendar + nhãn "Planner" + chú thích "Trợ lý lập kế hoạch".
  - 💬 **Coordinator**: Icon message-square/activity + nhãn "Coordinator" + chú thích "Trợ lý điều phối & theo dõi".
  - 🔍 **Reviewer**: Icon check-circle/search + nhãn "Reviewer" + chú thích "Trợ lý đối chiếu & nghiệm thu".
- **Nhãn nguồn tin cậy**: Mọi phản hồi hoặc bảng nhận xét do AI tạo ra đều gắn chip nhỏ hiển thị chế độ: `aiMode: real` hoặc `aiMode: mock` với màu viền xám `#E2E8F0` và chữ `#475569`.

---

### 1.4. Tiêu Chuẩn Khả Năng Tiếp Cận (Accessibility & Contrast Target)

Thiết kế TeamFlow AI cam kết tuân thủ các hướng dẫn tiêu chuẩn quốc tế theo [WCAG 2.2](https://www.w3.org/WAI/WCAG22/):
1. **Độ tương phản chữ (Contrast Minimum - Level AA)**:
   - Chữ thông thường (< 18.5px thông thường hoặc < 14px in đậm): Đạt độ tương phản tối thiểu **4.5:1** so với màu nền.
   - Chữ lớn (≥ 18.5px in đậm hoặc ≥ 24px thông thường): Đạt độ tương phản tối thiểu **3.0:1** so với màu nền.
   - *Tham khảo*: [WCAG 2.2 Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
2. **Độ tương phản thành phần tương tác (Non-text Contrast)**:
   - Các đường viền nhận diện ô nhập liệu (`control-border`), nút bấm, biểu tượng trạng thái có ý nghĩa phải đạt tỷ lệ tương phản tối thiểu **3.0:1** với màu nền liền kề.
   - *Tham khảo*: [WCAG 2.2 Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
3. **Không dùng màu làm kênh thông tin duy nhất**:
   - Tất cả các trạng thái công việc (badge), cảnh báo lỗi, thông báo thành công bắt buộc phải đi kèm **Văn bản mô tả rõ ràng (Text)** và **Biểu tượng tương ứng (Icon)**.

---

## 2. Quy Chuẩn Typography

- **Phông chữ chính (Primary Font)**: Đề xuất **Be Vietnam Pro** (tối ưu hóa hoàn hảo dấu tiếng Việt Unicode).
- **Phông chữ dự phòng (Fallback)**: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`.
- *Quy tắc phiên tài liệu*: Không tải hoặc cài đặt tệp font trong phiên tài liệu.

### Bảng Phân Cấp Chữ (Typography Scale)

| Cấp bậc (Hierarchy) | Kích thước (Font Size) | Chiều cao dòng (Line Height) | Độ đậm (Font Weight) | Phạm vi Sử dụng |
|---|---|---|---|---|
| **Hero Title (Desktop)** | `48px` – `56px` | `1.15` | `700` (Bold) | Tiêu đề chính Landing Page trên màn hình lớn. |
| **Hero Title (Mobile)** | `32px` – `36px` | `1.2` | `700` (Bold) | Tiêu đề chính Landing Page trên thiết bị di động. |
| **App Title** | `28px` (desktop) / `24px` (mobile) | `1.3` | `600` (Semibold) | Tiêu đề trang chính ứng dụng (P02, P04, P05, P08). |
| **Section Title** | `20px` | `1.4` | `600` (Semibold) | Tiêu đề các phân đoạn nội dung, tiêu đề Drawer/Modal. |
| **Subtitle / Card Header** | `18px` | `1.4` | `600` (Semibold) | Tiêu đề nhóm task, tiêu đề bước trong Wizard. |
| **Body (Văn bản đọc)** | `16px` | `1.6` | `400` (Regular) | Đoạn văn bản đọc dài, bài giới thiệu, nội dung bài nộp. |
| **Table & UI Controls** | `14px` | `1.5` | `400` / `500` (Medium) | Dữ liệu dòng trong bảng, danh sách task, nội dung chat. |
| **Form Labels & Table Header** | `14px` | `1.4` | `600` (Semibold) | Nhãn trường nhập liệu, tiêu đề cột của bảng. |
| **Metadata & Badges** | `12px` | `1.5` | `500` (Medium) | Ngày giờ, người tạo, mã revision, nhãn trạng thái (badge). |

---

## 3. Thang Đo Khoảng Cách và Kích Thước (Spacing & Sizing)

Hệ thống sử dụng thang đo bội số cơ bản của 4px: `4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px`.

### 3.1. Bảng Ứng Dụng Khoảng Cách (Spacing Tokens)

| Token Spacing | Kích thước | Ứng dụng cụ thể |
|---|---|---|
| `space-1` | `4px` | Khoảng cách giữa icon và label bên trong badge hoặc button nhỏ. |
| `space-2` | `8px` | Khoảng cách giữa label và input; khoảng cách giữa các badge cạnh nhau. |
| `space-3` | `12px` | Khoảng cách giữa các ô nhập trong cùng nhóm form; padding thẻ danh sách. |
| `space-4` | `16px` | Padding mặc định bên trong thẻ card, padding di động; khoảng cách giữa các trường form. |
| `space-6` | `24px` | Padding khu vực nội dung desktop; khoảng cách giữa các block chức năng. |
| `space-8` | `32px` | Khoảng cách giữa các section lớn trong trang ứng dụng; gutter lưới desktop. |
| `space-12` | `48px` | Khoảng cách giữa các phân đoạn chính trên Landing Page. |
| `space-16` | `64px` | Chiều cao thanh điều hướng trên cùng (topbar); khoảng trống đầu trang Landing. |

### 3.2. Quy Chuẩn Vùng Bấm và Kích Thước Thành Phần (Target Sizes)

- **Chiều cao tối thiểu của điều khiển (Touch/Click Height)**: Nút bấm (`button`), ô nhập liệu (`input`, `select`), thanh tìm kiếm có chiều cao tối thiểu **`44px`**.
- **Kích thước biểu tượng (Icons)**:
  - Nhỏ: `16px` (đi kèm chữ trong metadata, badge).
  - Vừa: `20px` (trong nút bấm, ô input, danh sách).
  - Lớn: `24px` (trên thanh topbar, tiêu đề trang).
- **Vùng bấm icon độc lập (Icon-only Button Target)**: Luôn bao bọc trong vùng tương tác tối thiểu **`44px × 44px`** để người dùng ngón tay hoặc chuột bấm chính xác mà không bị hụt.
- **Độ bo góc (Border Radius)**:
  - Ô điều khiển (Button, Input, Select): **`8px`**.
  - Thẻ bao ngoài (Card, Panel, Container): **`12px`**.
  - Hộp thoại và Ngăn kéo (Modal Dialog, Drawer): **`16px`**.
  - Huy hiệu trạng thái & Ảnh đại diện (Badge, Avatar): **`9999px`** (Dạng viên thuốc - Pill shape).
- **Độ đổ bóng (Box Shadow)**:
  - Không lạm dụng bóng mờ cho các thành phần nằm phẳng trên trang.
  - Chỉ sử dụng đổ bóng nhẹ cho lớp nổi (floating surface):
    - Menu thả xuống / Popover: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`.
    - Hộp thoại Modal / Drawer: `box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`.

---

## 4. Bố Cục và Đáp Ứng Thiết Bị (Layout & Responsive Rules)

### 4.1. Thông Số Lưới và Độ Rộng Tối Đa

- **Điểm ngắt kích thước (Breakpoints)**:
  - Di động (Mobile): `< 768px`.
  - Máy tính bảng (Tablet): `768px` – `1023px`.
  - Máy tính để bàn (Desktop): `≥ 1024px`.
- **Độ rộng khung chứa (Max Width Container)**:
  - Landing Page: Tối đa `1200px`, căn giữa màn hình; gutter lề `24px` – `32px` (desktop), `16px` (mobile).
  - Ứng dụng Workspace: Cho phép mở rộng tối đa `1440px` để dễ quan sát bảng nhiều cột.
  - Biểu mẫu nhập liệu (Forms): Giới hạn tối đa **`760px`** để mắt người dùng không phải quét quá rộng.
  - Khối nội dung văn bản đọc dài (Bài nộp, Báo cáo chi tiết, AI Review): Giới hạn tối đa **`720px` – `800px`** nhằm đảm bảo độ dài dòng lý tưởng (60–80 ký tự/dòng).
- **Kích thước khung ứng dụng (App Shell)**:
  - Thanh bên (Sidebar): Cố định `232px` – `240px` trên desktop; tự động chuyển thành Drawer trượt trên mobile.
  - Thanh đỉnh trang (Topbar): Chiều cao cố định `64px`.
  - Khoảng đệm nội dung chính (Main Content Padding): `24px` trên desktop; `16px` trên mobile.

### 4.2. Quy Tắc Biến Đổi Giao Diện Trên Thiết Bị Di Động (Responsive Adaptation)

1. **Bảng dữ liệu chuyển thành danh sách thẻ (Table to Card List)**:
   - Trên màn hình `< 768px`, bảng công việc không giữ nguyên cấu trúc nhiều cột bị co rúm. Tự động chuyển đổi thành danh sách các khối phẳng.
   - Mỗi khối phẳng bắt buộc giữ nguyên 4 trường cốt lõi: **Tên công việc**, **Người phụ trách**, **Hạn chót**, **Badge trạng thái** và **Nút xem chi tiết**.
2. **Ngăn cản hoàn toàn thanh cuộn ngang trang (No Page Horizontal Scroll)**:
   - Ở độ rộng màn hình tối thiểu `360px`, toàn bộ trang không bao giờ xuất hiện thanh cuộn ngang tổng thể (`overflow-x: hidden` trên viewport).
   - Trường hợp bài nộp chứa đoạn mã lập trình (code block) hoặc bảng dữ liệu đặc thù, vùng đó phải được đặt trong vùng chứa riêng có `overflow-x: auto`.

---

## 5. Quy Chuẩn Chuyển Động (Motion & Transition)

- **Thời gian phản hồi tương tác**: Chỉ sử dụng thời lượng chuyển động ngắn từ **`120ms` đến `200ms`** với đường cong mượt `ease-out` cho các trạng thái hover, mở drawer, đóng modal.
- **Không tạo độ trễ nhân tạo**: Tuyệt đối không bắt người dùng chờ hiệu ứng hoạt hình diễn ra xong mới hiển thị dữ liệu hoặc cho phép thao tác tiếp.
- **Hỗ trợ giảm chuyển động (Reduced Motion)**: Tôn trọng thiết lập trợ năng của hệ điều hành:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## 6. Bộ Biểu Tượng Nhất Quán (Iconography)

- Chọn duy nhất một họ icon nét viền nhất quán ở giai đoạn triển khai (khuyến nghị họ icon Lucide hoặc Heroicons Outline).
- Toàn bộ các icon sử dụng định dạng vector với nét vẽ đồng nhất (`stroke-width: 1.5px` hoặc `2px`).
- Mọi nút bấm chỉ có icon (icon-only button) bắt buộc phải có thuộc tính trợ năng `aria-label` mô tả rõ hành động (ví dụ: `aria-label="Đóng cửa sổ chi tiết"`).
