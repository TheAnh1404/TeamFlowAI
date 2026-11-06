# Migration — TV2

Thư mục giữ chỗ, chưa có migration hoặc schema nghiệp vụ. Phiên scaffold không chạy generate, push, migrate, introspect, seed hay reset.

Entry schema: `src/server/db/schema/index.ts`. Cấu hình: `drizzle.config.ts`, dùng `DATABASE_DIRECT_URL` phía server (direct/unpooled). TV2 sẽ thêm db scripts sau khi nhóm thống nhất schema; không cùng chạy migration lên database chung.
