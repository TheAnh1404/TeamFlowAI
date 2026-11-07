# TeamFlow AI

Dự án nhóm TV1/TV2/TV3 tham gia **DevDay Exchange Community: Da Nang City**, hỗ trợ nhóm nhỏ (3–8 người) lập kế hoạch, theo dõi và nghiệm thu công việc bằng ba trợ lý AI.

---

## 1. Hiện Trạng Repository

Repository hiện đã hoàn tất phiên **Khởi tạo khung kiến trúc nền tảng (Project Scaffolding)**:
- Đã thiết lập cấu trúc mã nguồn Next.js App Router, hệ thống TypeScript contracts, layout và các trang placeholder.
- Đã cấu hình bộ token màu sắc, typography và trạng thái công việc tại `src/app/globals.css`.
- Đã tạo các route handler API stub trả về mã **HTTP 501 Not Implemented** theo hợp đồng thiết kế.
- Đã cấu hình điểm nối cơ sở dữ liệu **Neon PostgreSQL** qua Drizzle ORM theo cơ chế khởi tạo lười (Lazy connection).
- **Cập nhật phiên TV2**: Đã triển khai schema/migration Neon, session demo có mã truy cập phía server, quyền theo membership, danh sách dự án/task, chi tiết task và chat/làm rõ cập nhật. Seed chỉ tạo ba tài khoản TV1/TV2/TV3, không tạo dự án/task sản phẩm.
- Planning của TV1 và delivery/review/report/AI provider của TV3 vẫn chưa triển khai. Coordinator mặc định dùng quy tắc demo có nhãn `mock`; không phải AI thật và không tự chuyển sang mock khi AI lỗi.
- Kết quả kiểm tra, giới hạn và entry bàn giao hiện hành: [TV2_HANDOFF](docs/TV2_HANDOFF.md). Phần mô tả scaffold bên trên là nền đã có từ phiên trước.

---

## 2. Công Nghệ và Yêu Cầu Môi Trường (Stack)

- **Runtime & Ngôn ngữ**: Node.js `>= 24.0.0` (Khuyến nghị `24.19.x`), npm `>= 11.0.0`.
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/).
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) (Strict mode).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Mapping token từ [DESIGN_SYSTEM.md](docs/ui/DESIGN_SYSTEM.md)).
- **Database & ORM**: [Neon Serverless PostgreSQL](https://neon.com/) + [Drizzle ORM](https://orm.drizzle.team/).
- **Validation**: [Zod v4](https://zod.dev/) cho contracts dữ liệu.

---

## 3. Hướng Dẫn Cài Đặt và Chạy Ứng Dụng (Setup & Scripts)

### Cài đặt dependencies
```bash
npm ci
# hoặc: npm install
```

### Chạy kiểm tra mã nguồn (Lint & Typecheck)
```bash
npm run check
# bao gồm: npm run lint (eslint) && npm run typecheck (next typegen && tsc --noEmit)
```

### Khởi chạy môi trường phát triển (Dev server)
```bash
npm run dev
# Mở trình duyệt tại: http://localhost:3000
```
> [!NOTE]
> Các trang placeholder P01/P03/P04/P08 mở được mà không cần database hay API key AI.
>
> Sau phiên TV2, các trang P02/P05/P06/P07 dùng API thật và cần Neon đã migrate/seed cùng session hợp lệ để xem dữ liệu. Build vẫn không cần secret. P01/P03/P04/P08 còn là placeholder; chưa có vòng sản phẩm hoàn chỉnh.

### Biên dịch bản phát hành (Production build)
```bash
npm run build
npm run start
```

---

## 4. Danh Sách Tuyến Đường (Routes & API Stubs)

### Giao diện Người dùng (UI Pages — Trạng thái hiện tại)
- `/`: **P01 — Landing Page** (Chủ quản: TV1).
- `/app`: **P02 — Danh sách dự án & Điểm vào Demo** (TV2 đã triển khai).
- `/app/projects/new`: **P03 — Wizard tạo dự án 3 bước** (Chủ quản: TV1).
- `/app/projects/:projectId/plan`: **P04 — Xem, sửa & duyệt kế hoạch** (Chủ quản: TV1).
- `/app/projects/:projectId/tasks`: **P05 — Workspace quản lý công việc** (Chủ quản: TV2).
- `/app/projects/:projectId/tasks/:taskId`: **P06 — Chi tiết công việc full page** (TV2); slot nộp/review/nghiệm thu chờ TV3.
- `/app/projects/:projectId/chat`: **P07 — Kênh trao đổi & Coordinator tracking** (Chủ quản: TV2).
- `/app/projects/:projectId/reports`: **P08 — Báo cáo tiến độ tuần** (Chủ quản: TV3).

### Tuyến API Kiểm tra Trạng thái
- `GET /api/health`: Trả về `200 OK` phản ánh trạng thái tiến trình (không tuyên bố kết nối DB/AI).

### Tuyến API Nghiệp vụ (Trạng thái theo owner)
- **Planning (TV1)**: `/api/projects`, `/api/projects/:id`, `/api/projects/:id/members`, `/api/projects/:id/plan`, `/api/plans/:id/draft`, `/api/plans/:id/publish`.
- **Tracking (TV2)**: `/api/session`, `/api/users`, `/api/projects/:id/tasks`, `/api/tasks/:id`, `/api/projects/:id/messages`, `/api/tasks/:id/progress-updates`, `/api/messages/:id/resolve`.
- **Delivery & AI (TV3)**: `/api/tasks/:id/submissions`, `/api/submissions/:id/review`, `/api/tasks/:id/accept`, `/api/projects/:id/reports`, `/api/reports/:id`.

**Trạng thái mới:** các API tracking đã có implementation. Bổ sung `POST/DELETE /api/session`, `GET /api/projects`, `GET /api/projects/:id/members` cho session và read model TV2; giữ nguyên POST planning tại hai đường dẫn dùng chung. API TV1/TV3 còn trả 501. Danh sách quyền/request/response cập nhật trong [CONTRACTS](docs/CONTRACTS.md).

---

## 5. Hướng Dẫn Cấu Hình Neon Database và Bảo Vệ Bí Mật

Khi bắt đầu phiên triển khai nghiệp vụ, thành viên cần cấu hình chuỗi kết nối Neon:
1. Đăng nhập [Neon Console](https://console.neon.tech/), chọn dự án của nhóm.
2. Sao chép chuỗi kết nối:
   - Dùng URL **Pooled connection** cho biến `DATABASE_URL` (cho runtime ứng dụng).
   - Dùng URL **Direct connection** (Unpooled) cho biến `DATABASE_DIRECT_URL` (cho công cụ migration Drizzle).
3. Tạo tệp `.env.local` ở thư mục gốc (tệp này được `.gitignore` bảo vệ, tuyệt đối không commit lên Git):
   ```env
   DATABASE_URL=
   DATABASE_DIRECT_URL=
   DEMO_ACCESS_CODE=
   COORDINATOR_MODE=mock
   OPENAI_API_KEY=
   OPENAI_MODEL=
   ```

Điền URL và mã truy cập riêng trong `.env.local`; không đưa giá trị thật vào Git hoặc log. `DEMO_ACCESS_CODE` tối thiểu 16 ký tự. Một mã riêng đã được tạo trong file local của phiên này; mở file riêng để lấy mã rồi vào `/app`, chọn TV1/TV2/TV3 để thiết lập session. Đây là xác thực demo của nhóm, chưa phải hệ thống tài khoản production.

Lệnh TV2:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run test:tracking
# Cần dev server cục bộ và Neon: tạo fixture tạm, rồi dọn đúng ID đã tạo
npm run test:tracking:integration
```

Migration đầu tiên đã được áp dụng lên Neon của phiên này; không reset hoặc chạy migration song song. Runtime dùng Neon WebSocket/Drizzle để hỗ trợ transaction tương tác. Trong môi trường chặn child process, build bằng PowerShell:

```powershell
$env:NEXT_BUILD_WORKER_THREADS = '1'
npm run build
```

Flag chỉ đổi cách chạy worker/checker; không bỏ qua TypeScript. Môi trường thông thường dùng `npm run build` như cũ. Xem [TV2_HANDOFF](docs/TV2_HANDOFF.md) cho chi tiết kiểm chứng và các phần còn thiếu.

---

## 6. Phân Công Trách Nhiệm và Tài Liệu Hướng Dẫn

| Thành viên | Trách nhiệm chính | Tài liệu nhiệm vụ |
|---|---|---|
| **TV1** | Giao diện chung, Shell layout, Landing Page (P01), Wizard tạo dự án (P03), Kế hoạch (P04), API planning | [TV1_PLANNING.md](docs/tasks/TV1_PLANNING.md) |
| **TV2** | Danh sách dự án/session demo (P02), Bảng task (P05), Chi tiết full page (P06), Chat (P07), DB Neon, Migration Drizzle, Session/Auth, API tracking | [TV2_TRACKING.md](docs/tasks/TV2_TRACKING.md) |
| **TV3** | Form nộp bài & Bảng review trong P06, Báo cáo tuần (P08), Tầng tích hợp AI chung, API delivery/reports | [TV3_DELIVERY.md](docs/tasks/TV3_DELIVERY.md) |

### Liên kết tài liệu quan trọng
- 📋 [Tài liệu Bàn giao Khung sườn](docs/SCAFFOLD_HANDOFF.md)
- [Bàn giao triển khai TV2](docs/TV2_HANDOFF.md)
- 📐 [Quy tắc Giao diện (UI Rules)](docs/ui/UI_RULES.md)
- 🎨 [Hệ thống Thiết kế (Design System)](docs/ui/DESIGN_SYSTEM.md)
- 🗺️ [Kiến trúc Trang & Luồng (Sitemap & Flows)](docs/ui/SITEMAP_AND_FLOWS.md)
- 📄 [Đặc tả Màn hình Chi tiết (Page Specs)](docs/ui/PAGE_SPECS.md)
- 🧩 [Danh mục Thành phần & Trạng thái (Component States)](docs/ui/COMPONENT_STATES.md)
- ✅ [Checklist Nghiệm thu UI](docs/ui/UI_ACCEPTANCE_CHECKLIST.md)
- 📜 [Hợp đồng Thiết kế MVP (Contracts)](docs/CONTRACTS.md)
- ⏱️ [Kế hoạch Thời gian 4 Giờ](docs/TIMELINE_4H.md)
- 🎬 [Kịch bản Trình diễn Demo 225s](docs/DEMO_CHECKLIST.md)
