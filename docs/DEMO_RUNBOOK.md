# Hướng dẫn diễn tập và demo sân khấu

## Chạy ổn định trên máy, không cần Docker hoặc Internet

Chế độ diễn tập dùng PostgreSQL PGlite lưu dưới `.cache/stage-demo`, cùng schema và logic nghiệp vụ với Neon. AI là mẫu theo quy tắc và hiển thị `mock`; không gọi đây là AI thật hoặc dữ liệu Neon. Sau khi đã cài dependencies và build, chế độ này chạy không cần mạng. Không mở hai máy chủ/worker cùng ghi vào một thư mục PGlite.

1. Dùng Node.js 24.x, npm 11.x; cài dependencies bằng `npm ci` nếu chưa cài.
2. Tạo `.env.local`, đặt `DEMO_ACCESS_CODE` là chuỗi riêng tối thiểu 16 ký tự. Không đưa mã vào Git hoặc màn chiếu. `.env.local` được ignore. Có thể chọn tên DB riêng qua `DEMO_DATABASE_NAME=stage-demo` (chỉ chữ, số, `_`, `-`).
3. Chạy lần lượt:

```powershell
npm run demo:setup
npm run build
npm run demo:start
```

4. Mở `http://127.0.0.1:3000/app`. Chọn TV1, TV2, TV3 hoặc MENTOR và nhập mã đã đặt. Tên tài khoản không tự cấp quyền: quyền của từng dự án do dữ liệu membership/grant quyết định.
5. Trước khi lên sân khấu, chạy thử cùng trình duyệt và tắt chế độ ngủ của máy. Chuẩn bị sẵn cửa sổ trưởng nhóm và mentor để giảm thao tác đổi phiên. Không đóng tiến trình ứng dụng khi đang demo.

`demo:setup` chỉ migrate/seed DB diễn tập cục bộ; chạy lại giữ nguyên dự án, tin nhắn, bài nộp và báo cáo. Không xóa `.cache/stage-demo` nếu muốn giữ dữ liệu. Tạo dự án mới để bắt đầu lượt demo khác. `demo:start` chỉ bind 127.0.0.1, bật đăng nhập demo và AI mẫu rõ ràng, chạy bộ quét deadline ngay trong tiến trình web để không mở DB PGlite từ hai tiến trình.

## Kịch bản đề xuất

1. TV1 tạo dự án, nhập mục tiêu/đầu ra/deadline, chọn thành viên, kỹ năng và giờ khả dụng. Ở bước xác nhận, bấm **Rà soát yêu cầu**, trả lời phạm vi và rủi ro. Đây là bước hướng dẫn cấu trúc, chưa gọi mô hình AI.
2. Tạo nháp. Chỉ rõ các bước thực hiện, lý do phân công, ước lượng cần xác nhận và tiêu chí riêng cho mỗi việc. Bản mẫu phân công theo kỹ năng và khối lượng; nếu thời gian không đủ, hiển thị cảnh báo năng lực thay vì tự đổi deadline.
3. Sửa một tiêu chí → lưu → duyệt/công bố. Timeline và thanh tiến độ ở đầu bảng công việc. Tiến độ = số task đã được nghiệm thu / tổng task đã công bố; trạng thái đang làm hoặc chờ review chưa được tính hoàn thành.
4. Mở **Mentor đồng hành**, chọn tài khoản MENTOR và cấp quyền xem. Mentor chỉ có trang giám sát; không sửa nháp, giao việc hoặc nghiệm thu bằng quyền này.
5. Người phụ trách hoặc trưởng nhóm nộp bài. Trong chế độ Reviewer mẫu, tạo các tiêu đề Markdown trùng tiêu chí, bổ sung dưới mỗi tiêu đề kết quả/cách kiểm tra/bằng chứng cụ thể. Chỉ chép lại tiêu chí hoặc viết “đã xong” không đủ. Reviewer mẫu chỉ đối chiếu cấu trúc và trích dẫn; người nghiệm thu vẫn phải đánh giá nội dung.
6. Yêu cầu review, sau đó trưởng nhóm/người nghiệm thu xác nhận. Thanh tiến độ tăng từ dữ liệu `done`, không suy phần trăm từ chat.
7. Trưởng nhóm bấm tạo báo cáo. Báo cáo giữ số liệu tại mốc đã lưu; nút nguồn mở bản ghi thực. Với Task, ghi rõ đang xem trạng thái hiện tại, không tính lại báo cáo cũ.
8. Khi đã dùng hết 80% thời gian dự án mà tiến độ nghiệm thu chưa vượt 80%, bộ quét tạo một thông báo cho mỗi thành viên và mentor đang được cấp quyền. Hộp thông báo tự tải lại khoảng 30 giây hoặc bấm **Tải lại**. Đánh dấu đã đọc được lưu. Đừng đổi đồng hồ máy để giả cảnh báo.

Để diễn tập cảnh báo trong thời gian ngắn, bộ kiểm thử toàn ứng dụng tạo một dự án có hạn 30 giây qua API, dùng đồng hồ thật và đợi bộ quét nền. Không có endpoint công khai để giả thời gian hoặc tự cấp quyền.

## Kiểm chứng trước demo

```powershell
npm run check
npm test
npm run build
npm run test:ui
node --import tsx tests/browser/planning.ts
npm run test:rehearsal
```

`test:rehearsal` chạy production thật ở cổng 3011, DB cục bộ mới dưới `.cache/e2e-*`, Edge headless trên Windows, AI mẫu và phiên riêng cho mentor. Nó kiểm cả thao tác UI, worker deadline và việc đọc lại dữ liệu sau khi dừng/khởi động máy chủ. Ảnh ở `.cache/rehearsal-ui/`; dữ liệu này không được commit. Không dùng chung cổng hoặc DB của ứng dụng đang demo.

## Chạy với Neon và AI thật

Đặt `TEAMFLOW_DATABASE_MODE=neon`, cấu hình DATABASE_URL/DATABASE_DIRECT_URL, bật demo auth có mã riêng nếu dùng các tài khoản demo. Đầu mối DB đọc migration rồi chạy migrate/seed trên DB đã thống nhất. Phiên nâng cấp chưa áp migration lên Neon chung.

Đặt API key/model phía server, `AI_FORCE_MOCK=false`, giữ `AI_STRICT_REAL=true`. Nếu provider lỗi, yêu cầu báo lỗi và giữ dữ liệu để thử lại; không tự nhận thành công hoặc âm thầm đổi sang mock. Chế độ AI được hiển thị theo kết quả đã lưu.

Chạy ứng dụng và `npm run worker:deadlines` dưới trình quản lý tiến trình trên máy chủ. Worker Neon hoạt động độc lập với tab; báo cáo tuần vẫn chỉ được tạo bằng nút bấm. Không chạy worker CLI này trên DB cục bộ khi web đang dùng nó. Chỉ xác nhận Neon/AI thật sau khi diễn tập lại trên đúng môi trường đó.
