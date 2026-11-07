# TeamFlow AI

> Cập nhật TV2: đã triển khai schema/migration, session/quyền, API tracking và UI P02/P05/P06 shell/P07. Xem [bàn giao TV2](docs/TV2_HANDOFF.md) để cấu hình và nối TV1/TV3. Neon thật và vòng tích hợp toàn nhóm chưa được kiểm chứng; các mục scaffold bên dưới mô tả nền ban đầu.

Dự án nhóm TV1/TV2/TV3 tham gia **DevDay Exchange Community: Da Nang City**, hỗ trợ nhóm nhỏ (3–8 người) lập kế hoạch, theo dõi và nghiệm thu công việc bằng ba trợ lý AI.

---

## 1. Hiện Trạng Repository

Repository hiện đã hoàn tất phiên **Khởi tạo khung kiến trúc nền tảng (Project Scaffolding)**:
- Đã thiết lập cấu trúc mã nguồn Next.js App Router, hệ thống TypeScript contracts, layout và các trang placeholder.
- Đã cấu hình bộ token màu sắc, typography và trạng thái công việc tại `src/app/globals.css`.
- Đã tạo các route handler API stub trả về mã **HTTP 501 Not Implemented** theo hợp đồng thiết kế.
- Đã cấu hình điểm nối cơ sở dữ liệu **Neon PostgreSQL** qua Drizzle ORM theo cơ chế khởi tạo lười (Lazy connection).
- **Tuyệt đối chưa có logic nghiệp vụ**: Chưa có bảng database thực, chưa có auth/session, chưa gọi AI provider và chưa có dữ liệu demo.

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
> Ứng dụng ở mức placeholder **chạy được ngay mà không cần cấu hình database hay API key AI**. Các trang P01–P08 đều mở được bình thường.

### Biên dịch bản phát hành (Production build)
```bash
npm run build
npm run start
```

---

## 4. Danh Sách Tuyến Đường (Routes & API Stubs)

### Giao diện Người dùng (UI Pages — Mức Placeholder)
- `/`: **P01 — Landing Page** (Chủ quản: TV1).
- `/app`: **P02 — Danh sách dự án & Điểm vào Demo** (Chủ quản: TV1/TV2).
- `/app/projects/new`: **P03 — Wizard tạo dự án 3 bước** (Chủ quản: TV1).
- `/app/projects/:projectId/plan`: **P04 — Xem, sửa & duyệt kế hoạch** (Chủ quản: TV1).
- `/app/projects/:projectId/tasks`: **P05 — Workspace quản lý công việc** (Chủ quản: TV2).
- `/app/projects/:projectId/tasks/:taskId`: **P06 — Chi tiết công việc & Nghiệm thu** (Chủ quản: TV2/TV3).
- `/app/projects/:projectId/chat`: **P07 — Kênh trao đổi & Coordinator tracking** (Chủ quản: TV2).
- `/app/projects/:projectId/reports`: **P08 — Báo cáo tiến độ tuần** (Chủ quản: TV3).

### Tuyến API Kiểm tra Trạng thái
- `GET /api/health`: Trả về `200 OK` phản ánh trạng thái tiến trình (không tuyên bố kết nối DB/AI).

### Tuyến API Nghiệp vụ (Hiện trả mã HTTP 501)
- **Planning (TV1)**: `/api/projects`, `/api/projects/:id`, `/api/projects/:id/members`, `/api/projects/:id/plan`, `/api/plans/:id/draft`, `/api/plans/:id/publish`.
- **Tracking (TV2)**: `/api/session`, `/api/users`, `/api/projects/:id/tasks`, `/api/tasks/:id`, `/api/projects/:id/messages`, `/api/tasks/:id/progress-updates`, `/api/messages/:id/resolve`.
- **Delivery & AI (TV3)**: `/api/tasks/:id/submissions`, `/api/submissions/:id/review`, `/api/tasks/:id/accept`, `/api/projects/:id/reports`, `/api/reports/:id`.

---

## 5. Hướng Dẫn Cấu Hình Neon Database và Bảo Vệ Bí Mật

Khi bắt đầu phiên triển khai nghiệp vụ, thành viên cần cấu hình chuỗi kết nối Neon:
1. Đăng nhập [Neon Console](https://console.neon.tech/), chọn dự án của nhóm.
2. Sao chép chuỗi kết nối:
   - Dùng URL **Pooled connection** cho biến `DATABASE_URL` (cho runtime ứng dụng).
   - Dùng URL **Direct connection** (Unpooled) cho biến `DATABASE_DIRECT_URL` (cho công cụ migration Drizzle).
3. Tạo tệp `.env.local` ở thư mục gốc (tệp này được `.gitignore` bảo vệ, tuyệt đối không commit lên Git):
   ```env
   DATABASE_URL=postgresql://user:password@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require
   DATABASE_DIRECT_URL=postgresql://user:password@ep-xyz.region.neon.tech/neondb?sslmode=require
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-4o-mini
   ```

---

## 6. Phân Công Trách Nhiệm và Tài Liệu Hướng Dẫn

| Thành viên | Trách nhiệm chính | Tài liệu nhiệm vụ |
|---|---|---|
| **TV1** | Giao diện chung, Shell layout, Landing Page (P01), Wizard tạo dự án (P03), Kế hoạch (P04), API planning | [TV1_PLANNING.md](docs/tasks/TV1_PLANNING.md) |
| **TV2** | Bảng task (P05), Drawer shell (P06), Chat (P07), DB Neon, Migration Drizzle, Session/Auth, API tracking | [TV2_TRACKING.md](docs/tasks/TV2_TRACKING.md) |
| **TV3** | Form nộp bài & Bảng review trong P06, Báo cáo tuần (P08), Tầng tích hợp AI chung, API delivery/reports | [TV3_DELIVERY.md](docs/tasks/TV3_DELIVERY.md) |

### Liên kết tài liệu quan trọng
- 📋 [Tài liệu Bàn giao Khung sườn](docs/SCAFFOLD_HANDOFF.md)
- 📐 [Quy tắc Giao diện (UI Rules)](docs/ui/UI_RULES.md)
- 🎨 [Hệ thống Thiết kế (Design System)](docs/ui/DESIGN_SYSTEM.md)
- 🗺️ [Kiến trúc Trang & Luồng (Sitemap & Flows)](docs/ui/SITEMAP_AND_FLOWS.md)
- 📄 [Đặc tả Màn hình Chi tiết (Page Specs)](docs/ui/PAGE_SPECS.md)
- 🧩 [Danh mục Thành phần & Trạng thái (Component States)](docs/ui/COMPONENT_STATES.md)
- ✅ [Checklist Nghiệm thu UI](docs/ui/UI_ACCEPTANCE_CHECKLIST.md)
- 📜 [Hợp đồng Thiết kế MVP (Contracts)](docs/CONTRACTS.md)
- ⏱️ [Kế hoạch Thời gian 4 Giờ](docs/TIMELINE_4H.md)
- 🎬 [Kịch bản Trình diễn Demo 225s](docs/DEMO_CHECKLIST.md)
