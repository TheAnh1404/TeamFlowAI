# Cấu hình OpenAI và kiểm tra các trợ lý

Vào **Cấu hình AI** trên thanh điều hướng hoặc `/app/settings/ai`, sau khi đăng nhập.

## Nhập và sử dụng khóa

1. Dán OpenAI API key vào ô mật khẩu. Không gửi khóa trong chat hoặc đưa vào ảnh/màn chiếu.
2. Giữ hoặc nhập model ID mà tài khoản được cấp quyền. Giá trị ban đầu giữ theo cấu hình hiện có; không phải cam kết model còn khả dụng với mọi tài khoản.
3. Bấm **Kiểm tra khóa và model**. Máy chủ gọi `GET https://api.openai.com/v1/models` bằng Bearer authentication, hiển thị model có thể thấy. Bước này xác thực khóa/quyền đọc model, chưa chứng minh quota hoặc khả năng chạy trợ lý. Khóa bị giới hạn quyền đọc model có thể cần kiểm tra lại quyền dù được phép tạo nội dung.
4. Nếu cần, bấm **Chạy thử 4 trợ lý · Có thể tính phí**. Hệ thống gửi tối đa bốn yêu cầu tạo nội dung, dùng dữ liệu thử riêng, không dùng dự án của bạn; giới hạn đầu ra 2.048 token mỗi yêu cầu. Kết quả chỉ đạt khi phản hồi từ API thật đáp ứng cấu trúc/tiêu chí kiểm tra của từng trợ lý. Không giả kết quả bằng mock. Hành động này có thể phát sinh phí OpenAI; không tự chạy khi mở trang hoặc lưu cấu hình.
5. Chọn **Dùng OpenAI thật với khóa của tôi**, rồi bấm **Lưu cấu hình** để áp dụng. Hoặc chọn **Dùng mẫu** để giữ diễn tập xác định. Chế độ **Theo cấu hình máy chủ** giữ cơ chế env/provider hiện có.

Cấu hình là **theo tài khoản đang đăng nhập**, không tự chia sẻ key cho các thành viên/mentor. Mọi tác vụ Planner, Coordinator, Reviewer và Báo cáo do tài khoản đó yêu cầu sẽ dùng cấu hình này. Lựa chọn OpenAI riêng được ưu tiên hơn AI_FORCE_MOCK của bản diễn tập cho đúng yêu cầu của người dùng, không đổi mode của tài khoản khác. Với mode OpenAI thật riêng, lỗi không tự chuyển sang mẫu. Các kết quả cũ giữ nguyên aiMode đã lưu, không tạo lại kế hoạch đã công bố.

Nếu đổi model hoặc nhập khóa mới, kiểm tra lại. Có thể kiểm tra khóa chưa lưu; khóa chỉ được lưu khi bấm Lưu cấu hình. Sau khi lưu, ô mật khẩu luôn trống; để trống ở lần lưu tiếp theo để giữ khóa cũ. Nút xóa chỉ xóa cấu hình riêng và quay về cấu hình máy chủ.

## Bảo vệ khóa

- API chỉ nhận khóa qua body JSON cùng origin và session hợp lệ. Không có tham số URL chứa key; không lưu vào localStorage/sessionStorage và không trả lại khóa hoặc ciphertext qua API.
- DB chỉ lưu ciphertext AES-256-GCM với nonce ngẫu nhiên và AAD theo user ID. Khóa của người A không được dùng để giải mã hàng của người B. Xử lý đồng thời dùng AsyncLocalStorage, tránh lẫn credential giữa các yêu cầu.
- Local demo giữ khóa mã hóa riêng tại `.cache/private-ai/encryption-key`, được Git ignore. Cần bảo toàn cả DB `.cache/<DEMO_DATABASE_NAME>` và thư mục khóa khi sao lưu/khôi phục trên máy. Không xóa hoặc công bố thư mục khóa.
- Trên Neon/máy chủ, người vận hành phải đặt `AI_SETTINGS_ENCRYPTION_KEY` (32 byte mã hóa base64) trong môi trường bảo mật. Nếu chưa có, UI báo chưa thể lưu khóa an toàn. Không đặt khóa mã hóa chung trong DB/Git; thay khóa mã hóa cần kế hoạch chuyển đổi ciphertext hoặc người dùng nhập lại API key.
- Lỗi 401, 403, 404, 429, timeout và đầu ra không đúng cấu trúc được phân biệt bằng thông báo ngắn. Không trả raw error body từ OpenAI hoặc log API key. Endpoint kiểm tra giới hạn 8 lần/tài khoản/phút trong mỗi tiến trình.

## Thay đổi và kiểm chứng

- Migration `0004_user_ai_settings.sql` thêm bảng `user_ai_settings`; không sửa/xóa dữ liệu nghiệp vụ. Cần migrate trước khi gọi các luồng AI mới. Local demo dùng `demo:setup` sau khi dừng web; không mở hai tiến trình cùng ghi PGlite. Chưa áp migration vào Neon chung.
- API: GET/PUT/DELETE `/api/ai/settings`, POST `/api/ai/settings/check`.
- Khóa nhập trên UI chỉ dùng qua máy chủ. `store:false` được gửi trong yêu cầu Chat Completions; việc này không thay thế chính sách dữ liệu của nhà cung cấp.
- Đã kiểm tra bằng unit tests, API giả lập cho luồng check và giao diện. Kiểm thử production lưu khóa giả trong mode mock, xác nhận không echo key, tách tài khoản, giữ cấu hình qua restart và xóa cấu hình riêng. Các test không gọi OpenAI bằng khóa thật và không phát sinh phí mô hình.
- Chưa nhận khóa thực của người dùng, vì vậy chưa tuyên bố khóa/model của người dùng đã hoạt động. Người dùng kiểm tra trực tiếp trên trang cấu hình, không gửi key vào hội thoại.

Nguồn giao thức: [Authentication và bảo vệ API key](https://developers.openai.com/api/reference/overview), [List models](https://developers.openai.com/api/reference/resources/models/methods/list), [Chat Completions, JSON mode và giới hạn đầu ra](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
