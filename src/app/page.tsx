import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="tf-topbar" style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(8px)" }}>
        <Link className="tf-brand" href="/">
          ▦ TeamFlow <b>AI</b>
        </Link>
        <nav aria-label="Điều hướng trang chủ" style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <a href="#workflow" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
            Cách hoạt động
          </a>
          <a href="#assistants" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
            Ba trợ lý AI
          </a>
          <a href="#faq" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
            Câu hỏi thường gặp
          </a>
        </nav>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Link href="/login" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600, padding: "0.5rem 0.75rem" }}>
            Đăng nhập
          </Link>
          <Link className="tf-button" href="/app" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}>
            Bắt đầu lập kế hoạch →
          </Link>
        </div>
      </header>

      <main className="tf-landing">
        {/* HERO SECTION */}
        <section className="tf-hero">
          <div>
            <p className="tf-eyebrow">DÀNH CHO NHÓM NHỎ · 3–8 THÀNH VIÊN</p>
            <h1>
              Cả nhóm rõ việc.
              <br />
              Trưởng nhóm <em>nắm tiến độ.</em>
            </h1>
            <p className="tf-lead">
              Lập kế hoạch có duyệt, cập nhật tiến độ qua chat tự nhiên và nghiệm thu theo tiêu chí rõ ràng.
              Ba trợ lý AI hỗ trợ toàn diện, con người luôn nắm quyền quyết định.
            </p>
            <div className="tf-actions">
              <Link className="tf-button" href="/app">
                Bắt đầu lập kế hoạch →
              </Link>
              <a className="tf-button secondary" href="#workflow">
                Xem cách hoạt động
              </a>
            </div>
            <p className="tf-muted" style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🔒</span> Kế hoạch chưa duyệt không công bố task. Chỉ con người mới có quyền nghiệm thu.
            </p>
          </div>

          {/* REAL PRODUCT PREVIEW COMPONENT */}
          <div className="tf-preview" aria-label="Xem trước sản phẩm">
            <div className="tf-row" style={{ borderBottom: "1px solid var(--color-border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <b style={{ fontSize: "0.9375rem", color: "var(--color-text-primary)" }}>Không gian công việc & Điều phối AI</b>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Website đăng ký sự kiện DevDay Da Nang</p>
              </div>
              <span className="tf-badge">Dữ liệu minh họa</span>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              {/* Mini Task Board Preview */}
              <div style={{ background: "var(--color-canvas)", borderRadius: "10px", padding: "12px", border: "1px solid var(--color-border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  <span>CÔNG VIỆC CHÍNH THỨC</span>
                  <span>TRẠNG THÁI</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.8125rem", border: "1px solid var(--color-border-subtle)" }}>
                    <span style={{ fontWeight: 500 }}>1. Thiết kế Landing Page & Form đăng ký</span>
                    <span style={{ background: "var(--color-status-in-review-bg)", color: "var(--color-status-in-review-fg)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 600 }}>Chờ nghiệm thu</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", background: "var(--color-surface)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.8125rem", border: "1px solid #FDE68A" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 500 }}>2. Xây dựng API sinh mã QR gửi email</span>
                      <span style={{ background: "var(--color-status-blocked-bg)", color: "var(--color-status-blocked-fg)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 600 }}>Bị chặn</span>
                    </div>
                    <small style={{ color: "var(--color-status-blocked-fg)", fontSize: "0.6875rem", marginTop: "4px" }}>⚠️ Trở ngại: Dịch vụ email SMTP gặp sự cố rate limit 429</small>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.8125rem", border: "1px solid var(--color-border-subtle)" }}>
                    <span style={{ fontWeight: 500 }}>3. Tích hợp module quét vé tại cổng</span>
                    <span style={{ background: "var(--color-status-in-progress-bg)", color: "var(--color-status-in-progress-fg)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.6875rem", fontWeight: 600 }}>Đang làm</span>
                  </div>
                </div>
              </div>

              {/* Mini Coordinator Stream Preview */}
              <div style={{ background: "var(--color-canvas)", borderRadius: "10px", padding: "12px", border: "1px solid var(--color-border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: "8px" }}>
                  KÊNH TRAO ĐỔI & TRỢ LÝ COORDINATOR
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.8125rem" }}>
                  <div style={{ alignSelf: "flex-end", background: "var(--color-primary)", color: "var(--color-on-primary)", padding: "8px 12px", borderRadius: "14px 14px 2px 14px", maxWidth: "85%" }}>
                    Đã hoàn thành giao diện đăng ký, nhưng module email gửi vé đang bị lỗi rate limit.
                  </div>
                  <div style={{ alignSelf: "flex-start", background: "#F0FDFA", border: "1px solid #CCFBF1", color: "#115E59", padding: "8px 12px", borderRadius: "14px 14px 14px 2px", maxWidth: "90%", fontSize: "0.75rem" }}>
                    <div style={{ fontWeight: 600, marginBottom: "2px" }}>🤖 Coordinator AI</div>
                    <div>✓ Đã ghi nhận tiến độ cho <strong>Task 1</strong> (chờ nộp bài).</div>
                    <div>⚠️ Đã ghi nhận trở ngại cho <strong>Task 2</strong>: Dịch vụ email gặp sự cố rate limit.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THE PROBLEM SECTION */}
        <section style={{ margin: "60px 0", padding: "40px 0", borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="tf-eyebrow" style={{ textAlign: "center" }}>VẤN ĐỀ THỰC TẾ CỦA NHÓM DỰ ÁN</p>
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", margin: "0 auto 36px", maxWidth: "680px" }}>
            Tại sao các dự án nhóm thường bị chậm tiến độ và vỡ kế hoạch?
          </h2>

          <div className="tf-three">
            <article className="tf-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "1.75rem" }}>📋</div>
              <h3 style={{ fontSize: "1.125rem", margin: 0 }}>Kế hoạch mơ hồ</h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Giao việc qua tin nhắn trôi dạt hoặc thỏa thuận miệng. Không ai biết rõ người phụ trách, thời hạn chót và tiêu chí cụ thể để tính là hoàn thành.
              </p>
            </article>

            <article className="tf-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "1.75rem" }}>💬</div>
              <h3 style={{ fontSize: "1.125rem", margin: 0 }}>Tiến độ thất lạc</h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Mỗi người báo cáo một nơi. Trưởng nhóm phải liên tục nhắn tin hỏi &ldquo;làm đến đâu rồi&rdquo; và các trở ngại (blockers) chỉ được phát hiện khi đã quá hạn.
              </p>
            </article>

            <article className="tf-card" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "1.75rem" }}>🔍</div>
              <h3 style={{ fontSize: "1.125rem", margin: 0 }}>Nghiệm thu cảm tính</h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Tranh cãi khi bàn giao vì không có bằng chứng đối chiếu. Người làm tưởng xong, người nhận bảo chưa đạt, dẫn đến trễ hạn toàn bộ dự án.
              </p>
            </article>
          </div>
        </section>

        {/* WORKFLOW 4 STEPS */}
        <section id="workflow" style={{ margin: "60px 0", padding: "40px 0", borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="tf-eyebrow" style={{ textAlign: "center" }}>QUY TRÌNH 4 BƯỚC KHÉP KÍN</p>
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", margin: "0 auto 36px", maxWidth: "680px" }}>
            Một luồng làm việc nhất quán từ ngày đầu đến ngày bàn giao
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            <div className="tf-card" style={{ position: "relative" }}>
              <div style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "1.5rem", marginBottom: "8px" }}>01</div>
              <h3 style={{ fontSize: "1.125rem", margin: "0 0 8px" }}>Đặt mục tiêu & nhóm</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Nhập mục tiêu, danh sách đầu ra và năng lực của từng thành viên (kỹ năng, số giờ khả dụng mỗi tuần).
              </p>
            </div>

            <div className="tf-card" style={{ position: "relative" }}>
              <div style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "1.5rem", marginBottom: "8px" }}>02</div>
              <h3 style={{ fontSize: "1.125rem", margin: "0 0 8px" }}>Planner tạo nháp · Duyệt</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Planner AI phân rã công việc và gán người phụ trách. Trưởng nhóm trực tiếp chỉnh sửa và xác nhận duyệt trước khi công bố.
              </p>
            </div>

            <div className="tf-card" style={{ position: "relative" }}>
              <div style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "1.5rem", marginBottom: "8px" }}>03</div>
              <h3 style={{ fontSize: "1.125rem", margin: "0 0 8px" }}>Cập nhật qua Chat</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Thành viên trao đổi tự nhiên trong kênh chat. Coordinator bóc tách cập nhật, trở ngại và hỏi lại ngay khi chưa rõ.
              </p>
            </div>

            <div className="tf-card" style={{ position: "relative" }}>
              <div style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "1.5rem", marginBottom: "8px" }}>04</div>
              <h3 style={{ fontSize: "1.125rem", margin: "0 0 8px" }}>Review theo tiêu chí</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                Nộp bài dạng văn bản, Markdown hoặc mã. Reviewer AI đối chiếu tiêu chí và trích xuất bằng chứng; trưởng nhóm chốt hoàn thành.
              </p>
            </div>
          </div>
        </section>

        {/* 3 AI ASSISTANTS SECTION */}
        <section id="assistants" style={{ margin: "60px 0", padding: "40px 0", borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="tf-eyebrow" style={{ textAlign: "center" }}>BA TRỢ LÝ ĐỒNG HÀNH</p>
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", margin: "0 auto 36px", maxWidth: "680px" }}>
            Trí tuệ nhân tạo chuyên sâu cho từng giai đoạn điều phối
          </h2>

          <div className="tf-three">
            <article className="tf-card">
              <div style={{ display: "inline-block", background: "var(--color-primary-soft)", padding: "8px 12px", borderRadius: "8px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "12px", fontSize: "0.875rem" }}>
                📋 Planner AI
              </div>
              <h3 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Kế hoạch có thể sửa</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                Phân rã mục tiêu lớn thành các công việc tuần tự có phụ thuộc. Tự động đề xuất người phụ trách phù hợp với kỹ năng và cân đối thời gian thực tế của nhóm.
              </p>
              <div style={{ marginTop: "16px", fontSize: "0.8125rem", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px" }}>
                ✓ Đề xuất bản nháp<br />
                ✓ Tự động gán tiêu chí nghiệm thu<br />
                ✗ Không tự ý công bố
              </div>
            </article>

            <article className="tf-card">
              <div style={{ display: "inline-block", background: "var(--color-primary-soft)", padding: "8px 12px", borderRadius: "8px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "12px", fontSize: "0.875rem" }}>
                💬 Coordinator AI
              </div>
              <h3 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Theo dõi & Báo cáo</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                Lắng nghe trao đổi trong kênh chat dự án, ghi nhận tiến độ và trở ngại vào đúng task. Tạo báo cáo tuần bằng nút bấm với đầy đủ liên kết dẫn chứng.
              </p>
              <div style={{ marginTop: "16px", fontSize: "0.8125rem", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px" }}>
                ✓ Bóc tách tiến độ qua chat<br />
                ✓ Báo cáo tuần có snapshot<br />
                ✗ Không tự bịa phần trăm
              </div>
            </article>

            <article className="tf-card">
              <div style={{ display: "inline-block", background: "var(--color-primary-soft)", padding: "8px 12px", borderRadius: "8px", fontWeight: 700, color: "var(--color-primary)", marginBottom: "12px", fontSize: "0.875rem" }}>
                🔍 Reviewer AI
              </div>
              <h3 style={{ fontSize: "1.25rem", margin: "0 0 8px" }}>Đối chiếu bằng chứng</h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
                Đọc bài nộp và đối chiếu khách quan với từng tiêu chí nghiệm thu đã cam kết. Chỉ ra cụ thể đoạn văn bản chứng minh và nêu điểm cần bổ sung.
              </p>
              <div style={{ marginTop: "16px", fontSize: "0.8125rem", color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border-subtle)", paddingTop: "12px" }}>
                ✓ Đánh giá từng tiêu chí<br />
                ✓ Trích xuất bằng chứng rõ ràng<br />
                ✗ Không tự chuyển task sang Done
              </div>
            </article>
          </div>
        </section>

        {/* HUMAN IN THE LOOP SECTION */}
        <section style={{ margin: "60px 0", padding: "40px", background: "var(--color-surface)", border: "1px solid var(--color-border-subtle)", borderRadius: "16px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto", textAlign: "center" }}>
            <p className="tf-eyebrow">RANH GIỚI KIỂM SOÁT MINH BẠCH</p>
            <h2 style={{ fontSize: "1.75rem", margin: "0 0 16px" }}>
              AI hỗ trợ chuyên môn. Con người luôn nắm quyền quyết định.
            </h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "32px" }}>
              TeamFlow AI kiên quyết nói không với việc để AI tự động thay thế trách nhiệm của trưởng nhóm. Mọi hành động quan trọng đều cần sự xác nhận của con người.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", maxWidth: "800px", margin: "0 auto" }}>
            <div style={{ background: "var(--color-canvas)", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border-subtle)" }}>
              <h3 style={{ color: "var(--color-primary)", margin: "0 0 12px", fontSize: "1rem" }}>🤖 Việc AI được phép làm</h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "grid", gap: "8px" }}>
                <li>Đề xuất danh sách task nháp và tiêu chí nghiệm thu.</li>
                <li>Bóc tách tiến độ và ghi nhận trở ngại qua tin nhắn.</li>
                <li>Hỏi lại người gửi khi tin nhắn chưa rõ ràng.</li>
                <li>Trích dẫn bằng chứng từ bài nộp đối chiếu với tiêu chí.</li>
                <li>Tóm tắt báo cáo tuần dựa trên số liệu snapshot.</li>
              </ul>
            </div>

            <div style={{ background: "var(--color-canvas)", padding: "20px", borderRadius: "12px", border: "1px solid var(--color-border-subtle)" }}>
              <h3 style={{ color: "var(--color-destructive)", margin: "0 0 12px", fontSize: "1rem" }}>🚫 Việc AI tuyệt đối không làm</h3>
              <ul style={{ paddingLeft: "20px", margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", display: "grid", gap: "8px" }}>
                <li>Tự ý công bố kế hoạch khi chưa có trưởng nhóm duyệt.</li>
                <li>Tự ý đổi hạn chót (deadline) hay đổi người phụ trách.</li>
                <li>Tự ý nghiệm thu công việc sang hoàn thành (Done).</li>
                <li>Bịa đặt số liệu hay tự quy đổi thành % hoàn thành giả.</li>
                <li>Xếp hạng hay đánh giá chăm/lười thành viên trong nhóm.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" style={{ margin: "60px 0", padding: "40px 0", borderTop: "1px solid var(--color-border-subtle)" }}>
          <p className="tf-eyebrow" style={{ textAlign: "center" }}>GIẢI ĐÁP THẮC MẮC</p>
          <h2 style={{ textAlign: "center", fontSize: "1.75rem", margin: "0 auto 36px", maxWidth: "680px" }}>
            Câu hỏi thường gặp về TeamFlow AI
          </h2>

          <div style={{ display: "grid", gap: "16px", maxWidth: "760px", margin: "0 auto" }}>
            <div className="tf-card">
              <h3 style={{ fontSize: "1.0625rem", margin: "0 0 8px", color: "var(--color-text-primary)" }}>
                AI có tự ý phân công và bắt đầu giao việc không?
              </h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Không. Planner AI chỉ tạo ra bản kế hoạch nháp (Draft). Bản nháp này chỉ hiển thị với Trưởng nhóm để kiểm tra, chỉnh sửa tên task, người phụ trách, hạn chót và tiêu chí. Chỉ khi Trưởng nhóm bấm &ldquo;Duyệt và công bố&rdquo;, các task mới chính thức được tạo trong hệ thống.
              </p>
            </div>

            <div className="tf-card">
              <h3 style={{ fontSize: "1.0625rem", margin: "0 0 8px", color: "var(--color-text-primary)" }}>
                Thành viên báo cáo tiến độ như thế nào?
              </h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Thành viên chỉ cần nhắn tin trong kênh Chat dự án theo phong cách trao đổi công việc thông thường. Bạn có thể gắn kèm task hoặc để Coordinator tự nhận diện. Nếu nội dung rõ ràng, Coordinator sẽ tự cập nhật task sang &ldquo;Đang làm&rdquo; hoặc &ldquo;Bị chặn&rdquo; (kèm lý do trở ngại). Nếu chưa rõ, Coordinator sẽ hỏi lại.
              </p>
            </div>

            <div className="tf-card">
              <h3 style={{ fontSize: "1.0625rem", margin: "0 0 8px", color: "var(--color-text-primary)" }}>
                Reviewer AI có tự đánh dấu hoàn thành công việc không?
              </h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Tuyệt đối không. Reviewer AI chỉ đóng vai trò trợ lý thẩm định: đối chiếu từng tiêu chí nghiệm thu và trích xuất bằng chứng từ nội dung bài nộp. Quyền quyết định chuyển task sang trạng thái &ldquo;Hoàn thành&rdquo; (Done) hoặc &ldquo;Yêu cầu sửa&rdquo; chỉ thuộc về Trưởng nhóm hoặc người được phân quyền nghiệm thu.
              </p>
            </div>

            <div className="tf-card">
              <h3 style={{ fontSize: "1.0625rem", margin: "0 0 8px", color: "var(--color-text-primary)" }}>
                Báo cáo tuần lấy số liệu từ đâu?
              </h3>
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5 }}>
                Báo cáo tuần được kích hoạt bằng nút bấm của Trưởng nhóm. Toàn bộ các chỉ số (số task đến hạn, nộp đúng hạn, nghiệm thu đúng hạn, quá hạn) được Backend tính toán khách quan 100% từ cơ sở dữ liệu. Coordinator AI chỉ viết tóm tắt diễn giải và mọi nhận định đều có liên kết dẫn chứng đến task, bài nộp hoặc cập nhật tương ứng.
              </p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ textAlign: "center", padding: "60px 20px", background: "linear-gradient(180deg, var(--color-surface) 0%, var(--color-canvas) 100%)", borderRadius: "20px", border: "1px solid var(--color-border-subtle)", margin: "40px 0" }}>
          <h2 style={{ fontSize: "2rem", margin: "0 0 16px", color: "var(--color-text-primary)" }}>
            Sẵn sàng đưa nhóm vào luồng làm việc rõ ràng?
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "1.0625rem", maxWidth: "560px", margin: "0 auto 28px" }}>
            Trải nghiệm ngay ứng dụng điều phối công việc tinh gọn với sự hỗ trợ của ba trợ lý AI.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="tf-button" href="/app" style={{ fontSize: "1rem", padding: "12px 24px" }}>
              Bắt đầu lập kế hoạch ngay →
            </Link>
            <Link className="tf-button secondary" href="/app/projects/demo-event-website/tasks" style={{ fontSize: "1rem", padding: "12px 24px" }}>
              Xem dự án mẫu minh họa
            </Link>
          </div>
        </section>

        <footer style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.875rem", padding: "24px 0" }}>
          TeamFlow AI · Dự án tham dự DevDay Exchange Community: Da Nang City · Thiết kế theo chuẩn WCAG 2.2 Level AA
        </footer>
      </main>
    </>
  );
}
