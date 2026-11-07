# TeamFlow AI

> **Coordinator V2 (07/11/2026):** đã bổ sung backend chat lưu trước AI, check-in/revision, lịch nhắc app/chat/email, queue/lease/retry, verified email và report draft/snapshot/publish. Điểm nối tại [COORDINATOR_FRONTEND_HANDOFF](docs/COORDINATOR_FRONTEND_HANDOFF.md). Hướng dẫn cấu hình/kiểm thử: [COORDINATOR_OPERATIONS](docs/COORDINATOR_OPERATIONS.md).
>
> Ứng dụng của nhóm TV1/TV2/TV3 tại DevDay Exchange Community: Da Nang City. Luồng chính: nhập dự án → rà soát yêu cầu → Planner đề xuất → trưởng nhóm sửa/duyệt/công bố → tracking qua chat → nộp/review/nghiệm thu → báo cáo tuần theo nút bấm.

## 1. Công nghệ và Yêu cầu môi trường

- **Runtime & Ngôn ngữ**: Node.js `>= 24.0.0` (Khuyến nghị `24.19.x`), npm `>= 11.0.0`.
- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/).
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) (Strict mode).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Mapping token từ [DESIGN_SYSTEM.md](docs/ui/DESIGN_SYSTEM.md)).
- **Database & ORM**: [Neon Serverless PostgreSQL](https://neon.com/) + [Drizzle ORM](https://orm.drizzle.team/).
- **Validation**: [Zod v4](https://zod.dev/) cho contracts dữ liệu.

## 2. Hướng dẫn cài đặt và khởi chạy

```powershell
npm ci
npm run dev
```

### Chạy kiểm tra mã nguồn (Verification Checks)
```powershell
npm run check
npm test
npm run build
```

## 3. Bản đồ tuyến đường giao diện (8 Màn hình MVP + Mở rộng)

| Trang | Tuyến đường | Mục đích |
|---|---|---|
| **P01** | `/` | Landing Page giới thiệu giải pháp, 3 trợ lý AI, interactive preview |
| **P02** | `/app` | Danh sách dự án trong cơ sở dữ liệu & banner dự án minh họa |
| **P03** | `/app/projects/new` | Wizard 3 bước tạo dự án |
| **P04** | `/app/projects/:id/plan` | Trưởng nhóm duyệt/chỉnh sửa kế hoạch do Planner AI soạn |
| **P05** | `/app/projects/:id/tasks` | Bảng công việc (Task Board) theo trạng thái |
| **P06** | `/app/projects/:id/tasks/:taskId` | Chi tiết công việc, nộp bài đa phương thức & Review AI |
| **P07** | `/app/projects/:id/chat` | Kênh Chat Messenger điều phối tiến độ & trở ngại |
| **P08** | `/app/projects/:id/reports` | Báo cáo tuần & Bảng giao nộp tổng hợp (Consolidated Deliverables) |
| **Auth** | `/login` & `/register` | Đăng ký & Đăng nhập (Mật khẩu tối thiểu 8 ký tự, tự động đăng nhập) |
| **Cài đặt AI** | `/app/settings/ai` | Cài đặt API Key mã hóa cá nhân |
| **Giám sát** | `/app/projects/:id/supervision` | Bảng quản lý Mentor và cảnh báo tiến độ |

## 4. Tài liệu hướng dẫn & Bàn giao

- 📜 [Quy tắc Codex (AGENTS.md)](AGENTS.md), [Quy tắc dự án](docs/PROJECT_RULES.md), [Contracts](docs/CONTRACTS.md).
- 📋 [Tài liệu Bàn giao TV1](docs/TV1_HANDOFF.md), [Bàn giao TV2](docs/TV2_HANDOFF.md), [Bàn giao TV3](docs/TV3_HANDOFF.md).
- 📐 [Quy tắc Giao diện](docs/ui/UI_RULES.md), [Hệ thống Thiết kế](docs/ui/DESIGN_SYSTEM.md), [Checklist UI](docs/ui/UI_ACCEPTANCE_CHECKLIST.md).
- 🎬 [Kế hoạch triển khai Auth](docs/AUTH_IMPLEMENTATION_PLAN.md), [Vận hành Coordinator](docs/COORDINATOR_OPERATIONS.md).
