# Migration — TV2

Schema 12 bảng, entry `src/server/db/schema/index.ts`; cấu hình `drizzle.config.ts` dùng `DATABASE_DIRECT_URL` direct/unpooled. Chạy `npm run db:migrate` theo journal, chỉ TV2 áp dụng lên DB chung. Xem [TV2_HANDOFF](../docs/TV2_HANDOFF.md).

Migration `0000_rare_logan.sql` / `0000_tracking_foundation.sql` cùng `0001_romantic_starjammers.sql` và `0002_invariants.sql` tạo 10 bảng entity và 2 bảng kỹ thuật (session/idempotency). Migration `0001` sắp unique constraint trước foreign key; `0002_invariants.sql` chứa trigger publication/khóa nội dung Task và foreign key nghiệm thu deferred. Không dùng db push thay cho journal/trigger. Seed chỉ thêm danh tính demo (`npm run db:seed`), không tạo Task công bố giả hoặc xóa dữ liệu.
