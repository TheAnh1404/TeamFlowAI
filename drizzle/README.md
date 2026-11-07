# Migration — TV2

Phiên TV2 đã thêm `0000_tracking_foundation.sql` cùng snapshot/journal và áp dụng lên Neon của nhóm sau khi xác nhận database chưa có bảng public. Migration tạo 10 bảng entity và 2 bảng kỹ thuật (session/idempotency), không reset dữ liệu.

Entry schema: `src/server/db/schema/index.ts`. `npm run db:generate` dùng Drizzle Kit API, không cần kết nối DB; `npm run db:migrate` dùng Drizzle migrator với Neon WebSocket transaction và `DATABASE_DIRECT_URL` phía server (direct/unpooled). Cấu hình CLI tương đương vẫn ở `drizzle.config.ts`. TV2 điều phối duy nhất mọi thay đổi schema/migration; không cùng chạy trên database chung.

`npm run db:seed` chỉ thêm ba tài khoản demo nếu chưa có, không tạo project/task hoặc reset. Kết quả và điểm nối: [TV2_HANDOFF](../docs/TV2_HANDOFF.md).
