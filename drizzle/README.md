# Migration — TV2

Schema 12 bảng, entry `src/server/db/schema/index.ts`; cấu hình `drizzle.config.ts` dùng DATABASE_DIRECT_URL direct/unpooled. Chạy `npm run db:migrate` theo journal, chỉ TV2 áp dụng lên DB chung. Xem `docs/TV2_HANDOFF.md`.

Migration `0001` sắp unique constraint trước foreign key vì SQL tự sinh có thứ tự chưa hợp lệ. `0002_invariants.sql` chứa trigger publication/khóa nội dung Task và foreign key nghiệm thu deferred; giữ khi tạo migration tiếp theo. Không dùng db push thay cho journal/trigger. Seed chỉ thêm danh tính demo, không tạo Task công bố giả hoặc xóa dữ liệu.

Đã kiểm tra migration bằng PostgreSQL PGlite cục bộ; chưa chạy trên Neon thật khi chưa có cấu hình kết nối.
