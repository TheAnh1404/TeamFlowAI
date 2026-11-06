# delivery — TV3

Scope phiên tính năng sau: Nộp bài, Reviewer, nghiệm thu và báo cáo Coordinator. Trang phụ trách: P06 submission/review, P08.

Hiện có interface và public entry; chưa có service/repository implementation, component tính năng, query, AI hay dữ liệu demo.

- Public UI entry an toàn cho client: `index.ts`; hiện chỉ export type từ contracts.
- Server-only interface: `server/service.ts`, `server/repository.ts`.
- `components/` giữ chỗ; page adapter mỏng nằm trong `src/app/`.
- Dependencies: UI shell TV1; contracts/DB/auth TV2; lớp AI dùng chung TV3.
- Không import chéo nội bộ feature; UI của feature khác đi qua public entry.
- API giữ URL [CONTRACTS](../../../docs/CONTRACTS.md), hiện trả HTTP 501; ownership grouping không thêm prefix URL mới.
- Nhiệm vụ chưa hoàn thành: [TV3_DELIVERY](../../../docs/tasks/TV3_DELIVERY.md).
- Mapping và điểm chốt: [SCAFFOLD_HANDOFF](../../../docs/SCAFFOLD_HANDOFF.md).

TV3 sẽ cung cấp component nộp/review qua public entry để TV2 ghép vào P06; không cùng sửa page shell. Báo cáo nằm trong module delivery, không tạo feature reports thứ hai.
