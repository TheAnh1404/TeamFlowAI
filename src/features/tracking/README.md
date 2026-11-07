# tracking — TV2

Scope đã triển khai: session/project read model P02, task list P05, chi tiết full page P06 và chat/làm rõ cập nhật P07.

Đã có service/repository Neon, UI và API tracking. Coordinator mặc định là quy tắc demo có nhãn mock; chưa có AI provider thật. Không có API tạo/công bố project/task, nộp bài/review/report trong module này.

- Public UI entry: `index.ts` export `ProjectsPage`, `TaskList`, `TaskDetail`, `ProjectChat` và types, không export mã server.
- Interface ổn định: `server/service.ts`, `server/repository.ts`; implementation: `server/implementation.ts`, `server/neon-repository.ts`.
- `server/policy.ts` giữ quy tắc xác định task/quyền/chuyển trạng thái; `server/coordinator.ts` nối provider TV3 hoặc quy tắc mock được chọn rõ.
- `components/` giữ UI riêng TV2, CSS module dùng token chung; page adapter mỏng nằm trong `src/app/`.
- Dependencies: UI shell TV1; Task công bố từ planning; contracts/DB/auth TV2; AI TV3.
- Không import chéo nội bộ feature; UI của feature khác đi qua public entry.
- API giữ URL [CONTRACTS](../../../docs/CONTRACTS.md), đã nối handler TV2. Các POST planning và API delivery vẫn giữ stub của owner tương ứng.
- Nhiệm vụ chưa hoàn thành: [TV2_TRACKING](../../../docs/tasks/TV2_TRACKING.md).
- Mapping, cách chạy và kiểm chứng hiện hành: [TV2_HANDOFF](../../../docs/TV2_HANDOFF.md).

TV2 giữ P06 full page. `TaskDetail` nhận `children` để TV3 cung cấp UI nộp/review qua public entry delivery; không cùng sửa page adapter hoặc import nội bộ feature khác. Chưa làm Drawer desktop.
