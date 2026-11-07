# tracking — TV2

Scope đã triển khai: session/project read model P02, task list P05, chi tiết full page / panel P06 và chat/làm rõ cập nhật P07.

Đã có UI, API, service, repository Neon, store và transaction helpers cho tracking. Coordinator hỗ trợ chế độ quy tắc mô phỏng rõ ràng hoặc nối provider AI TV3 khi có. Không có API tạo/công bố project/task, nộp bài/review/report trong module này.

- Public UI entry: `index.ts` export `TrackingWorkbench`, `SessionBar`, `TaskDetailPanel`, `StatusBadge`, `WorkspaceData`, `ProjectsPage`, `TaskList`, `TaskDetail`, `ProjectChat`.
- Server entry: `server/index.ts` export `trackingService`, `createTrackingService`, `trackingReader`, `loadWorkspace`.
- `server/service.ts` và `server/repository.ts` giữ interface chuẩn; `server/implementation.ts`, `server/neon-repository.ts`, `server/store.ts` cung cấp implementation đầy đủ và transaction-safe.
- `server/policy.ts` giữ quy tắc xác định task/quyền/chuyển trạng thái; `server/coordinator.ts` nối provider TV3 hoặc quy tắc mock được chọn rõ.
- `components/` giữ UI riêng TV2, CSS module dùng token chung; page adapter mỏng nằm trong `src/app/`.
- Delivery slot: `TaskDetail` nhận `children` và `TrackingWorkbench` nhận `renderDelivery` để TV3 cung cấp UI nộp/review qua public entry delivery mà không vi phạm ranh giới module.
- Xem [TV2_HANDOFF](../../../docs/TV2_HANDOFF.md) cho hướng dẫn chạy, kiểm thử, migration và tích hợp.
