# TeamFlow AI

Ứng dụng của nhóm TV1/TV2/TV3 tại DevDay Exchange Community: Da Nang City. Luồng chính: nhập dự án → rà soát yêu cầu → Planner đề xuất → trưởng nhóm sửa/duyệt/công bố → tracking qua chat → nộp/review/nghiệm thu → báo cáo tuần theo nút bấm.

## Công nghệ và khởi chạy

Node.js **24.x**, npm **11.x**, Next.js 16, React 19, TypeScript strict, Tailwind CSS v4, Drizzle ORM. Runtime mặc định dùng Neon PostgreSQL. Có chế độ diễn tập riêng bằng PostgreSQL PGlite lưu trên máy, AI mẫu có nhãn, không cần Docker.

```powershell
npm ci
npm run dev
```

Mở http://localhost:3000. Trang giới thiệu không cần DB; các luồng có dữ liệu yêu cầu cấu hình và migration tương ứng. `.env.example` liệt kê biến môi trường; giữ giá trị thật trong `.env.local`, không commit secret.

**Demo sân khấu:** đọc [DEMO_RUNBOOK](docs/DEMO_RUNBOOK.md). Đặt mã truy cập demo trong `.env.local`, sau đó:

```powershell
npm run demo:setup
npm run build
npm run demo:start
```

`demo:setup` chỉ tạo/cập nhật DB cục bộ, không chạm Neon. `demo:start` chạy ở 127.0.0.1 với AI mẫu và bộ quét deadline trong cùng tiến trình. Dữ liệu lưu ở `.cache/stage-demo` và được giữ sau restart. Không dùng hai tiến trình cùng ghi vào DB PGlite.

## Những phần đã triển khai

- TV1: shell/điều hướng, Landing P01, wizard P03, sửa/duyệt P04 và API planning.
- TV2: session demo/quyền, schema/migrations, P02, bảng task P05, drawer P06, chat/resolve P07.
- TV3: provider AI chung, submission/review/nghiệm thu, báo cáo P08 và API delivery.
- Bản nâng cấp: delivery dùng DB chung; timeline/tiến độ nghiệm thu; mentor chỉ đọc; thông báo lưu bền tại mốc 80% thời gian; Planner có bước làm rõ, hướng dẫn thực hiện, lý do phân công và ước lượng cần xác nhận; chế độ diễn tập lưu bền.

Kế hoạch nháp chưa tạo task chính thức. Publish atomic, kiểm version và chống trùng. Chat không sửa assignee/deadline/criteria hoặc tự xác nhận done. Review phải có nguồn; chỉ người có quyền nghiệm thu revision mới nhất. AI không tự nghiệm thu. Tiến độ là **task đã nghiệm thu / task đã công bố**, không suy từ lời chat.

Thông báo deadline: khi thời gian sử dụng ≥80% và tiến độ nghiệm thu ≤80%, tạo một thông báo cho từng thành viên và mentor đang được cấp quyền. Local demo quét trong web process; Neon cần chạy `npm run worker:deadlines` riêng. Báo cáo tuần vẫn do người dùng bấm tạo.

## Kiểm tra và vận hành

**Nhập OpenAI API key:** vào **Cấu hình AI** tại `/app/settings/ai`. Có kiểm tra khóa/model và chạy thử riêng bốn trợ lý; khóa lưu mã hóa theo tài khoản, không hiện lại trên UI. Đọc [AI_SETTINGS](docs/AI_SETTINGS.md) để phân biệt xác thực khóa, quota và phí chạy thử. Chế độ AI riêng chỉ áp dụng cho tác vụ của tài khoản đó.

```powershell
npm run check
npm test
npm run build
npm run test:ui
npm run test:rehearsal
```

`npm test` áp migrations lên PGlite để kiểm tra nghiệp vụ, quyền, version/revision, retry, snapshot và thông báo. `test:ui` dùng fixture riêng. `test:rehearsal` chạy ứng dụng production thật với DB cục bộ, AI mẫu, tài khoản mentor và kiểm tra restart. Các kiểm tra này không thay cho việc kiểm chứng Neon và AI thật.

Neon: cấu hình DATABASE_URL pooled và DATABASE_DIRECT_URL direct. Đầu mối TV2 kiểm tra SQL trước khi chạy `npm run db:migrate`, rồi `npm run db:seed`; seed chỉ thêm tài khoản TV1/TV2/TV3/MENTOR, không tạo task được công bố giả và không xóa dữ liệu. Bật `ENABLE_DEMO_AUTH=true`, đặt DEMO_ACCESS_CODE tối thiểu 16 ký tự nếu dùng đăng nhập demo. Vai trò thực luôn lấy từ dữ liệu dự án.

AI thật: cấu hình key/model phía server, tắt AI_FORCE_MOCK và giữ AI_STRICT_REAL=true. Không tự chuyển sang mock khi provider lỗi, trừ khi người vận hành đặt rõ `AI_STRICT_REAL=false`. Kết quả mẫu và thật được ghi nhãn theo dữ liệu đã lưu. Không coi kiểm thử mẫu là bằng chứng về chất lượng mô hình thật.

## Tuyến giao diện

| Trang | Đường dẫn |
|---|---|
| P01 giới thiệu | `/` |
| P02 dự án/phiên demo | `/app` |
| P03 wizard | `/app/projects/new` |
| P04 kế hoạch | `/app/projects/:id/plan` |
| P05 công việc | `/app/projects/:id/tasks` |
| P06 chi tiết/nộp bài | `/app/projects/:id/tasks/:taskId` |
| P07 chat | `/app/projects/:id/chat` |
| P08 báo cáo tuần | `/app/projects/:id/reports` |
| Mentor giám sát | `/app/projects/:id/supervision` |

## Tài liệu bàn giao

- [Quy tắc Codex](AGENTS.md), [quy tắc dự án](docs/PROJECT_RULES.md), [contracts](docs/CONTRACTS.md).
- [Nâng cấp backend](docs/BACKEND_UPGRADE.md), [hướng dẫn demo](docs/DEMO_RUNBOOK.md), [bản ghép thử](docs/INTEGRATION_TRIAL.md).
- [Bàn giao TV1](docs/TV1_HANDOFF.md), [bàn giao TV2](docs/TV2_HANDOFF.md), [bàn giao scaffold lịch sử](docs/SCAFFOLD_HANDOFF.md).
- [Nhiệm vụ TV1](docs/tasks/TV1_PLANNING.md), [TV2](docs/tasks/TV2_TRACKING.md), [TV3](docs/tasks/TV3_DELIVERY.md).
- [UI rules](docs/ui/UI_RULES.md), [design system](docs/ui/DESIGN_SYSTEM.md), [page specs](docs/ui/PAGE_SPECS.md), [checklist UI](docs/ui/UI_ACCEPTANCE_CHECKLIST.md).

Tài liệu scaffold/checklist ban đầu có nội dung mô tả thời điểm chưa triển khai; đọc cùng [biên bản kiểm chứng TV1/TV2/TV3](docs/RELEASE_VERIFICATION.md) ngày 07/11/2026 cho bản bàn giao `tv1_hung`. Biên bản ghi rõ kiểm tra đạt và các commit remote mới chưa được tích hợp. Chưa áp migrations lên Neon chung hoặc kiểm chứng bằng khóa AI thật.
