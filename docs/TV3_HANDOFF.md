# TV3 — Bàn giao triển khai (Delivery, Shared AI Layer & Weekly Reports)

## Trạng thái và giới hạn

Đã triển khai hoàn tất module Delivery (`src/features/delivery/`), tầng AI dùng chung (`src/server/ai/`), 5 API endpoints (`submissions`, `review`, `accept`, `reports`, `reportDetail`), và trang Báo cáo tuần P08 (`src/app/app/projects/[projectId]/reports/page.tsx`). Hệ thống hỗ trợ tiếp nhận và đánh giá đa dạng bài nộp (văn bản báo cáo, bảng tính Excel/CSV, cấu trúc slide thuyết trình, và ảnh minh chứng có Gallery xem trước).

Tầng AI hỗ trợ song song hai chế độ:
1. **Real AI**: Tự động nhận diện `GEMINI_API_KEY` (Gemini 2.5 Flash) hoặc `OPENAI_API_KEY` (GPT-4o-mini), ép kiểu JSON schema nghiêm ngặt, timeout 25 giây qua `AbortController`.
2. **Mock AI**: Sinh dữ liệu thông minh bám sát nghiệp vụ và thực thể đầu vào (kỹ năng thành viên, từ khóa bài nộp, trích dẫn nguyên văn), vượt qua 100% validator. Tự động fallback minh bạch khi Real AI lỗi mạng hoặc thiếu key (trừ khi bật `AI_STRICT_REAL=true`).

Toàn bộ báo cáo tuần P08 được gom trọn vẹn trong `src/features/delivery/` (không tạo thư mục `src/features/reports/` phân tán).

---

## 1. Interface Bàn Giao Dành Cho TV1 (Planning)

### Gọi Planner AI:
TV1 chỉ cần gọi một hàm chuẩn duy nhất từ `@/server/ai`:
```ts
import { aiProvider } from "@/server/ai";

const result = await aiProvider.generate("planner", {
  projectGoal: "Xây dựng cổng thanh toán trực tuyến...",
  members: [
    { id: "m1", role: "leader", skills: ["Backend", "Architecture"], availableHoursPerWeek: 40 },
    { id: "m2", role: "member", skills: ["Frontend", "React"], availableHoursPerWeek: 35 },
  ],
  availableWeeks: 2,
});

// result.proposal:
// {
//   tasks: [
//     {
//       tempKey: "draft-1",
//       title: "Thiết kế kiến trúc cơ sở dữ liệu",
//       description: "...",
//       assigneeMemberId: "m1", // Bắt buộc trùng ID trong members
//       deadline: "2026-11-15T17:00:00.000Z",
//       criteria: ["Tạo đủ bảng", "Có migration an toàn"],
//       dependencyTempKeys: []
//     }
//   ]
// }
// result.aiMode: "real" | "mock"
```

- **Mã lỗi bắt buộc xử lý**:
  - `AiInvalidOutputError` / `AiUnavailableError` $\rightarrow$ Trả về `HTTP 502 Bad Gateway`.
  - `AiTimeoutError` $\rightarrow$ Trả về `HTTP 504 Gateway Timeout` (khi vượt quá 25s).
- **Quy tắc Publish**: Kế hoạch phải được Leader duyệt trước khi publish.

---

## 2. Interface Bàn Giao Dành Cho TV2 (Tracking & UI Shell)

### A. Gọi Coordinator AI (Phân tích Chat / Trở ngại):
TV2 gọi từ `@/server/ai`:
```ts
import { aiProvider } from "@/server/ai";

const result = await aiProvider.generate("coordinator", {
  messageContent: "Tôi đã làm xong phần thanh toán VNPay, đang bị chặn bởi cổng test",
  tasks: data.tasks,
  currentMemberId: session.user.id,
});

// result.proposal:
// {
//   intent: "update" | "discussion" | "clarify",
//   taskId: "t1",                    // Có giá trị khi nhận diện rõ ràng
//   requestedStatus: "blocked",       // "in_progress" | "blocked"
//   blocker: "Cổng test VNPay lỗi",  // Mô tả trở ngại nếu blocked
//   clarificationQuestion?: string   // Câu hỏi làm rõ nếu mơ hồ
// }
```

### B. Gắn UI Delivery vào Workbench P06:
TV3 đã xuất sẵn adapter chuẩn `DeliverySlot` tại `@/features/delivery`:
```tsx
import { DeliverySlot } from "@/features/delivery";

// Trong TrackingWorkbench của TV2:
<TrackingWorkbench
  data={data}
  screen={screen}
  taskId={taskId}
  renderDelivery={(props) => <DeliverySlot {...props} />}
/>
```
- `DeliverySlot` nhận props: `{ task, currentMember, onTaskChange, onDirtyChange }`.
- `onDirtyChange(true)`: Báo người dùng đang có nội dung soạn dở trong form nộp bài, giúp TV2 chặn đóng Drawer bất cẩn.
- `onTaskChange()`: Kích hoạt khi nộp bài hoặc nghiệm thu thành công để TV2 re-fetch dữ liệu server.

### C. Nguồn Snapshot Báo Cáo Tuần:
TV3 sử dụng trực tiếp hàm `readReportSnapshot(session, projectId)` của TV2 trong `src/server/db/report-snapshot.ts` với transaction `repeatable read` / `read only`. Nếu chạy dev offline chưa có Neon, tự động chuyển đổi sang dữ liệu repository mẫu.

---

## 3. Bất Biến Nghiệp Vụ Cốt Lõi (Invariants)

1. **Phát hiện Ảo giác Reviewer AI**:
   - Mọi `evidence[].quote` trong đánh giá tiêu chí PHẢI là chuỗi con nguyên văn tồn tại trong `submission.content`.
   - Tiêu chí đánh giá `met` bắt buộc phải có ít nhất 1 trích dẫn chứng minh thực tế. Không có trích dẫn bắt buộc phải là `insufficient_evidence`.
2. **Quyền Nghiệm thu Tuyệt đối**:
   - AI review chỉ đưa ra khuyến nghị, KHÔNG tự động chuyển trạng thái task sang `done`.
   - Chỉ người dùng có vai trò `leader` hoặc `canAccept === true` mới được gọi `POST /api/tasks/[taskId]/accept`.
   - Điều kiện tiên quyết: **100% tiêu chí trong review của bài nộp mới nhất phải đạt `met`**.
   - Phân tách rõ mốc `submittedAt` (thời điểm nộp) và `acceptedAt` (thời điểm nghiệm thu).
3. **Quy tắc Snapshot Báo cáo Tuần**:
   - Kích hoạt bằng **nút bấm thủ công** của Leader (không dùng cron/scheduler tự động).
   - Khoảng thời gian: **Nửa đóng, nửa mở `[periodStart, periodEnd)`**.
   - Backend tính toán chính xác 100% các metrics từ snapshot `sources`. AI chỉ nhận `metrics` và `sources` đó để tóm tắt kèm liên kết chứng minh `sourceRefs`.
   - Báo cáo đã tạo là **bất biến (Immutable)**. Retry cùng `Idempotency-Key` trả lại bản ghi cũ (Replay cached).
4. **Chống Race Condition & Versioning**:
   - Mọi mutation nộp bài / nghiệm thu bắt buộc truyền `expectedTaskVersion`. Sai version trả về ngay `409 VERSION_CONFLICT`.
   - `Idempotency-Key` cố định khi retry lỗi mạng, chỉ reset khi nộp thành công.
   - Giới hạn payload bài nộp tối đa **32KB** (~32,768 ký tự).

---

## 4. Kiểm Chứng & Bằng Chứng Thực Tế

Toàn bộ các lệnh kiểm tra bắt buộc của dự án đã chạy và đạt kết quả tuyệt đối:

- **`npm test`**: **17/17 tests passed** (Kiểm tra PGlite áp migrations, atomic rollback, idempotency retry, AI timeout/fallback).
- **`npm run check`**: **0 errors, 0 warnings** (Clean ESLint và TypeScript strict typegen).
- **`npm run build`**: **Compiled successfully** với Next.js 16 Turbopack (30/30 routes hợp lệ).

---

## 5. Đánh Giá Bài Nộp Đa Dạng Dựa Trên Đề Bài Của TV1

Reviewer AI của TV3 đối chiếu bài nộp của thành viên trực tiếp với **đề bài và các tiêu chí ban đầu do TV1 thiết lập**:

1. **Đa dạng hình thức bài nộp**: Thành viên có thể nộp bảng dữ liệu bảng tính Excel/CSV, dàn ý slide PowerPoint, hoặc đường dẫn ảnh minh chứng Figma/Screenshots.
2. **Lời khuyên bám sát đề bài**: Khi chưa đạt, AI trích dẫn đúng tiêu chí của TV1 và đưa ra lời khuyên (`missing`, `suggestion`) để người làm biết chính xác cần bổ sung những gì và nộp lại revision mới. Người làm phải tự sửa, AI không làm thay.

---

## 6. Rào Chắn Nghiệm Thu Toàn Diện: Chỉ Xuất Bản Hoàn Chỉnh Khi Leader Đã Duyệt 100%

Hệ thống bổ sung endpoint `GET /api/projects/[projectId]/consolidated-deliverable` và component `ProjectConsolidatedDeliverableView`:

1. **Khi chưa xong (Dưới 100% công việc được duyệt)**:
   - Bản Hoàn Chỉnh ở trạng thái **KHÓA CHẶT (Locked)**.
   - Hiển thị thanh tiến độ và danh sách cụ thể các công việc còn lại đang chờ Leader duyệt để cả nhóm cùng theo dõi.
2. **Khi 100% công việc đã được Leader đồng ý (All Done)**:
   - Hệ thống chính thức mở khóa **Bản Tổng Hợp Hoàn Chỉnh Của Dự Án**.
   - Gom toàn bộ các phần bài làm chính thức đã được Leader duyệt thành một bộ hồ sơ hoàn chỉnh duy nhất của cả nhóm, đầy đủ bằng chứng, tiêu chí đạt và chức năng in ấn / lưu trữ.

