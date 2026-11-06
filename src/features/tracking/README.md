# tracking — TV2

Scope phiên tính năng sau: Task list/detail shell, chat, Coordinator ghi tiến độ/trở ngại. Trang phụ trách: P05, P06 shell, P07.

Hiện có interface và public entry; chưa có service/repository implementation, component tính năng, query, AI hay dữ liệu demo.

- Public UI entry an toàn cho client: `index.ts`; hiện chỉ export type từ contracts.
- Server-only interface: `server/service.ts`, `server/repository.ts`.
- `components/` giữ chỗ; page adapter mỏng nằm trong `src/app/`.
- Dependencies: UI shell TV1; Task công bố từ planning; contracts/DB/auth TV2; AI TV3.
- Không import chéo nội bộ feature; UI của feature khác đi qua public entry.
- API giữ URL [CONTRACTS](../../../docs/CONTRACTS.md), hiện trả HTTP 501; ownership grouping không thêm prefix URL mới.
- Nhiệm vụ chưa hoàn thành: [TV2_TRACKING](../../../docs/tasks/TV2_TRACKING.md).
- Mapping và điểm chốt: [SCAFFOLD_HANDOFF](../../../docs/SCAFFOLD_HANDOFF.md).

TV2 giữ P06 full page; slot nộp/review sau này nhận public UI export từ delivery. Scaffold chưa có slot/component nghiệp vụ hay Drawer.
