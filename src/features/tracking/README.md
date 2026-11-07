# tracking — TV2

Đã có UI/API/service/query cho P02 dữ liệu/session, P05, P06 shell và P07.

- Public UI: `index.ts` export Workbench, TaskDetailPanel, DemoSessionBar, DeliverySlotProps và WorkspaceData.
- Server entry: `server/index.ts` export trackingService, createTrackingService, trackingReader, loadWorkspace.
- `server/service.ts` và `server/repository.ts` giữ interface scaffold để tham chiếu; implementation sử dụng store và transaction helpers, không cần caller tự ghép các lệnh ghi riêng lẻ.
- Xem [bàn giao TV2](../../../docs/TV2_HANDOFF.md) cho cấu hình, migration, quyền, API, retry và điểm gắn TV1/TV3.
- Neon thật và vòng tích hợp với API planning/delivery chưa được kiểm chứng. Provider AI và nội dung nộp/review vẫn thuộc dependency TV3.
- Không import chéo nội bộ feature; UI Delivery đi qua public entry và renderDelivery slot.
