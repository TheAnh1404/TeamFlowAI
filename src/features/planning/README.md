# planning — TV1

Scope phiên tính năng sau: Nhập project/member, Planner, sửa draft và duyệt/công bố task. Trang phụ trách: P01, P02, P03, P04.

Hiện có interface và public entry; chưa có service/repository implementation, component tính năng, query, AI hay dữ liệu demo.

- Public UI entry an toàn cho client: `index.ts`; hiện chỉ export type từ contracts.
- Server-only interface: `server/service.ts`, `server/repository.ts`.
- `components/` giữ chỗ; page adapter mỏng nằm trong `src/app/`.
- Dependencies: UI chung TV1; contracts/DB/auth TV2; AI TV3.
- Không import chéo nội bộ feature; UI của feature khác đi qua public entry.
- API giữ URL [CONTRACTS](../../../docs/CONTRACTS.md), hiện trả HTTP 501; ownership grouping không thêm prefix URL mới.
- Nhiệm vụ chưa hoàn thành: [TV1_PLANNING](../../../docs/tasks/TV1_PLANNING.md).
- Mapping và điểm chốt: [SCAFFOLD_HANDOFF](../../../docs/SCAFFOLD_HANDOFF.md).

TV1 giữ root layout và src/components/layout, src/components/ui; P02 theo yêu cầu scaffold hiện tại thuộc TV1, khác ghi chú UI lịch sử. Chưa triển khai thiết kế trang.
