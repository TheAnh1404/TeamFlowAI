# Shell dùng chung — TV1

`AppShell` trong app-shell.tsx nhận children, gắn tại src/app/app/layout.tsx. TV2/TV3 giữ page adapter của mình; mọi trang dưới /app dùng chung topbar/sidebar. Không cần bọc AppShell lần nữa.

Nội dung tự khai báo main; các trang TV1 dùng tf-page, các màn TV2 giữ workspace hiện có. Token tại globals.css. Xem docs/TV1_HANDOFF.md.
