# Tài Liệu Bàn Giao Khung Sườn Dự Án (Scaffold Handoff) — TeamFlow AI

> [!IMPORTANT]
> **Tài liệu bàn giao hạ tầng kỹ thuật cho 3 thành viên (TV1, TV2, TV3) triển khai phiên tính năng 240 phút.**
> Khung sườn dự án đã được thiết lập và kiểm tra biên dịch thành công. Phiên scaffold **chỉ tạo nền tảng, tuyệt đối chưa triển khai bất kỳ logic nghiệp vụ nào**.

---

## 1. Bản Đồ Cấu Trúc Mã Nguồn và Trách Nhiệm Sở Hữu (Ownership Map)

| Đường dẫn thư mục / tệp tin | Mục đích kỹ thuật | Đầu mối sở hữu (Owner) | Bên sử dụng / Phối hợp |
|---|---|---|---|
| `src/contracts/` | Bộ type và Zod schema dùng chung cho cả client và server | **TV2** | TV1, TV3 import types; không sửa schema độc lập |
| `src/lib/routes.ts` | Khai báo đường dẫn URL trang và API route type-safe | **TV1** (Giao diện) & **TV2** (API) | Dùng chung toàn dự án để điều hướng |
| `src/lib/api-client.ts` | Wrapper gọi fetch chuẩn hóa lỗi ở client | **TV1** | Dùng trong các component gọi API |
| `src/lib/utils.ts` | Tiện ích hạ tầng (nối class `cn`, format ngày) | **TV1** | Dùng chung toàn dự án |
| `src/components/layout/` | Shell giao diện, Topbar, Sidebar, Drawer wrapper | **TV1** | TV2, TV3 gửi slot nội dung vào shell |
| `src/components/ui/` | Primitive components (Button, Badge, Dialog...) | **TV1** | TV2, TV3 tái sử dụng |
| `src/components/scaffolding/` | PlaceholderPage component phục vụ giai đoạn khung | **TV1** | Dùng tạm cho các trang chưa triển khai |
| `src/app/page.tsx` | P01: Landing Page | **TV1** | Giới thiệu sản phẩm |
| `src/app/app/page.tsx` | P02: Danh sách dự án & Demo Entry | **TV1** (UI) / **TV2** (Data) | Nạp danh sách dự án của session |
| `src/app/app/projects/new/` | P03: Wizard tạo dự án 3 bước | **TV1** | Gọi Planner AI tạo nháp |
| `src/app/app/projects/[id]/plan/` | P04: Xem, sửa trực tiếp và duyệt kế hoạch | **TV1** | Sửa task nháp, publish plan |
| `src/app/app/projects/[id]/tasks/` | P05: Workspace danh sách công việc | **TV2** | Bảng task, bộ lọc, summary |
| `src/app/app/projects/[id]/tasks/[taskId]/` | P06: Chi tiết task, nộp bài & review | **TV2** (Vỏ Drawer) + **TV3** (Nộp & Review) | Ghép component của TV3 vào drawer của TV2 |
| `src/app/app/projects/[id]/chat/` | P07: Kênh trao đổi & Coordinator tracking | **TV2** | Chat ghi nhận tiến độ / trở ngại |
| `src/app/app/projects/[id]/reports/` | P08: Báo cáo tuần & snapshot dẫn chứng | **TV3** | Nút tạo báo cáo, xem metrics & nguồn |
| `src/features/planning/` | Domain logic TV1: Project, Member, Plan, Publish | **TV1** | Dùng auth/db TV2, AI TV3 |
| `src/features/tracking/` | Domain logic TV2: Task, ProgressUpdate, Chat | **TV2** | Cung cấp dữ liệu task cho TV1, TV3 |
| `src/features/delivery/` | Domain logic TV3: Submission, Review, Report | **TV3** | Nối dữ liệu task TV2, AI dùng chung |
| `src/server/db/client.ts` | Lazy connection client Drizzle + Neon | **TV2** | Repository các feature sử dụng |
| `src/server/db/schema/` | Drizzle schema các bảng thực thể | **TV2** | TV2 điều phối duy nhất mọi thay đổi DB |
| `src/server/auth/` | SessionProvider & AuthorizationProvider | **TV2** | Server endpoints gọi kiểm tra quyền |
| `src/server/ai/` | Interface và stub cho 4 trợ lý AI | **TV3** | TV1 gọi Planner, TV2 gọi Coordinator |
| `src/server/env.ts` | Đọc biến môi trường server an toàn | **TV2** | Không bundle vào client |
| `src/server/http/` | Chuẩn hóa lỗi HTTP (501, 401, 403, 404, 409...) | **TV2** | Dùng trong tất cả route handlers |
| `drizzle/` | Thư mục chứa SQL migrations | **TV2** | TV2 chạy migration; không chạy song song |

---

## 2. Phân Định Hiện Trạng Kỹ Thuật (Status Classification)

Để đảm bảo tính trung thực kỹ thuật và không hiểu lầm trạng thái:

### 2.1. Hạ tầng ĐÃ TẠO và ĐÃ KIỂM TRA (Verified Working)
- ✅ **Khung dự án Next.js 16 (App Router) + React 19 + TypeScript strict**: Biên dịch thành công qua `npm run build`.
- ✅ **Linter & Typecheck**: Lệnh `npm run check` (gồm `eslint . --max-warnings=0` và `next typegen && tsc --noEmit`) đạt **0 errors, 0 warnings**.
- ✅ **Hệ thống Design Tokens**: Đã cấu hình tại `src/app/globals.css` ánh xạ đầy đủ màu canvas, surface, primary, trạng thái task (`todo`, `in_progress`, `blocked`, `in_review`, `changes_requested`, `done`), badge `overdue` và typography.
- ✅ **Tất cả các route trang (P01 – P08)**: Mở được ở mức `PlaceholderPage`, có tiêu đề và liên kết điều hướng qua lại hợp lệ.
- ✅ **Tất cả các API route (19 endpoints)**: Đã tạo route handler stub trả về mã **HTTP 501 Not Implemented** theo định dạng JSON thống nhất `{ "error": { "code": "NOT_IMPLEMENTED", "message": "Chức năng chưa được triển khai." } }`.
- ✅ **Route kiểm tra trạng thái tiến trình**: `GET /api/health` trả về HTTP 200 `{ status: "ok", app: "TeamFlow AI", timestamp: ... }`.
- ✅ **Kết nối Neon Lazy**: `getDb()` trong `src/server/db/client.ts` chỉ đọc biến môi trường và khởi tạo kết nối khi được gọi trong runtime; quá trình build/prerender hoàn toàn không đòi hỏi kết nối mạng tới Neon.

### 2.2. Phần CHƯA TRIỂN KHAI (Not Implemented — Dành cho Phiên Tính Năng)
- ❌ **Chưa có Bảng Database (Schema)**: Tệp `src/server/db/schema/index.ts` đang là module rỗng (`export {};`). Chưa có bảng `users`, `projects`, `project_members`, `plans`, `tasks`, `messages`, `submissions`, `reviews`, `reports`.
- ❌ **Chưa có Dữ liệu mẫu (Seed / Fixtures)**: Chưa tạo dữ liệu seed, chưa chạy migration thật.
- ❌ **Chưa có Xác thực & Phân quyền thật**: `sessionProvider` và `authorizationProvider` ném lỗi `FeatureNotImplementedError`.
- ❌ **Chưa có Tích hợp AI thật**: `aiProvider` ném lỗi `FeatureNotImplementedError`.
- ❌ **Chưa có Giao diện thành phần chi tiết**: Chưa có Button/Dialog/Table/Toast hoàn chỉnh; chưa có Form submit; chưa có Drawer P06.

---

## 3. Danh Sách Việc Cần Làm Theo Từng Thành Viên (TODOs by Owner)

### TV1 — Planning & Giao Diện Chung
- [ ] Triển khai layout shell dùng chung tại `src/components/layout/` (Topbar, Sidebar, Responsive container).
- [ ] Triển khai primitive components tại `src/components/ui/` (Button, Badge, Stepper, Tabs, Alert) theo [COMPONENT_STATES.md](ui/COMPONENT_STATES.md).
- [ ] Hoàn thiện Landing Page P01 (`src/app/page.tsx`) theo [PAGE_SPECS.md](ui/PAGE_SPECS.md).
- [ ] Xây dựng Wizard tạo dự án 3 bước P03 (`src/app/app/projects/new/page.tsx`).
- [ ] Xây dựng màn hình xem/sửa kế hoạch P04 (`src/app/app/projects/[projectId]/plan/page.tsx`).
- [ ] Triển khai API planning trong `src/features/planning/server/` và nối vào các route handler `src/app/api/projects/` và `src/app/api/plans/`.

### TV2 — Tracking, Cơ Sở Dữ Liệu & Phân Quyền
- [ ] Thiết kế Drizzle schema trong `src/server/db/schema/index.ts` dựa trên [CONTRACTS.md](CONTRACTS.md) và chạy migration lên Neon.
- [ ] Triển khai Session demo và Authorization helpers trong `src/server/auth/`.
- [ ] Xây dựng màn hình Workspace danh sách công việc P05 (`src/app/app/projects/[projectId]/tasks/page.tsx`) và vỏ Drawer P06.
- [ ] Xây dựng màn hình Chat & Coordinator P07 (`src/app/app/projects/[projectId]/chat/page.tsx`).
- [ ] Triển khai API tracking trong `src/features/tracking/server/` và nối vào `src/app/api/tasks/`, `src/app/api/messages/`.

### TV3 — Delivery, AI Layer & Báo Cáo
- [ ] Xây dựng tầng tích hợp AI chung tại `src/server/ai/` hỗ trợ 4 kind: `planner`, `coordinator`, `reviewer`, `weekly_report` (hỗ trợ cả mode `real` và `mock`).
- [ ] Triển khai Submission form và Review table component trong `src/features/delivery/components/` để xuất khẩu cho TV2 gắn vào P06.
- [ ] Xây dựng màn hình Báo cáo tuần P08 (`src/app/app/projects/[projectId]/reports/page.tsx`).
- [ ] Triển khai API delivery & reports trong `src/features/delivery/server/` và nối vào `src/app/api/submissions/`, `src/app/api/reports/`.

---

## 4. Các Mốc Tích Hợp Trong Kế Hoạch 240 Phút

- **Phút 0 – 30**:
  - Họp chốt cấu hình môi trường, tài khoản demo, connection string Neon.
  - TV2 công bố schema DB và migration đầu tiên.
  - TV1 công bố điểm cắm layout shell.
  - TV3 công bố interface AI.
- **Phút 30 – 90 (Phát triển độc lập)**:
  - Mỗi thành viên phát triển trên feature module của mình.
  - Sử dụng dữ liệu mẫu (mock data) tuân thủ đúng shape trong `src/contracts/`.
- **Phút 90 (Checkpoint 1)**:
  - Từng luồng thao tác độc lập được trên giao diện với mock data.
- **Phút 90 – 135 (Tích hợp vòng 1)**:
  - TV2 điều phối ghép dữ liệu thật lưu server: TV1 tạo project/plan → TV2 hiển thị task/chat → TV3 nộp bài/review/báo cáo.
- **Phút 135 (Checkpoint 2)**:
  - Dữ liệu lưu bền vững trên Neon; tải lại trang (F5) không mất dữ liệu.
- **Phút 180 (Code Freeze)**:
  - Ngừng thêm tính năng mới; dành 60 phút cuối sửa lỗi và tập dượt kịch bản demo 3 phút 45 giây theo [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md).

---

## 5. Cấu Hình Cơ Sở Dữ Liệu Neon và Lưu Ý An Toàn

1. **Lấy Connection String từ Neon Console**:
   - Truy cập [Neon Console](https://console.neon.tech/), chọn dự án của nhóm.
   - Tại mục **Connection Details**, chọn **Connection pooling** để lấy `DATABASE_URL` (dùng cho runtime ứng dụng).
   - Bỏ chọn pooling (Direct connection) để lấy `DATABASE_DIRECT_URL` (dùng cho công cụ migration `drizzle-kit`).
2. **Cấu hình biến môi trường**:
   - Tạo file `.env.local` ở thư mục gốc (tệp này đã được `.gitignore` bảo vệ, không bao giờ commit lên Git):
     ```env
     DATABASE_URL=postgresql://user:password@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require
     DATABASE_DIRECT_URL=postgresql://user:password@ep-xyz.region.neon.tech/neondb?sslmode=require
     OPENAI_API_KEY=sk-...
     OPENAI_MODEL=gpt-4o-mini
     ```
3. **Quy tắc Migration**:
   - **Chỉ duy nhất TV2 thực hiện chạy migration** (`drizzle-kit push` hoặc `drizzle-kit migrate`) lên database chung.
   - TV1 và TV3 tuyệt đối không tự ý chạy migration độc lập để tránh phá vỡ cấu trúc bảng của nhau.
