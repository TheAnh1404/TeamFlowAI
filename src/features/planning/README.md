# planning — TV1

Đã triển khai project/member, Planner adapter, sửa nháp và duyệt/công bố. Xem [bàn giao TV1](../../../docs/TV1_HANDOFF.md) để chạy và tích hợp.

- Public UI client-safe: `index.ts` export ProjectWizard, PlanEditor và domain types.
- Server: `server/implementation.ts` export createPlanningService(db, planner?) và planningService().
- Planner: `server/planner.ts`, mặc định dùng provider TV3, mock chỉ khi PLANNING_AI_MODE=mock.
- UI P01/P03/P04 và shell thuộc TV1; P02 giữ implementation TV2.
- Schema/auth/transactions thuộc TV2; provider AI thuộc TV3. Không thay contracts hoặc migrations.
- Kiểm thử PGlite và browser fixture không thay cho vòng tích hợp Neon thật.
