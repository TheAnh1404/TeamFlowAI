import Link from "next/link";

const agents = [
  ["Planner", "Phân công có căn cứ", "Đề xuất công việc, người phụ trách và tiêu chí dựa trên mục tiêu, kỹ năng, giờ khả dụng.", "Không tự công bố kế hoạch."],
  ["Coordinator", "Cập nhật đúng công việc", "Ghi nhận tiến độ và trở ngại qua chat. Hỏi lại khi thông tin chưa rõ.", "Không tự đổi hạn chót hoặc người phụ trách."],
  ["Reviewer", "Đối chiếu bằng chứng", "Đọc bài nộp theo từng tiêu chí, chỉ ra bằng chứng và phần cần bổ sung.", "Không tự đánh dấu hoàn thành."],
];
const questions = [
  ["AI có tự ý đổi deadline công việc không?", "Không. Chat không thay đổi hạn chót, người phụ trách hoặc tiêu chí đã công bố. Nhóm cần xác nhận kế hoạch trước khi trưởng nhóm công bố."],
  ["Ai có quyền bấm hoàn thành công việc?", "Chỉ trưởng nhóm hoặc thành viên có quyền nghiệm thu. Bài nộp mới nhất phải được review đủ tiêu chí và có bằng chứng trước khi người có quyền xác nhận hoàn thành."],
  ["Báo cáo tuần được tạo ra sao?", "Trưởng nhóm chọn khoảng kỳ và bấm tạo báo cáo. Máy chủ tính số liệu từ dữ liệu đã lưu; AI tóm tắt có nguồn. Thời điểm nộp bài và nghiệm thu được thống kê riêng. Báo cáo không tự chạy theo lịch."],
  ["Hỗ trợ dạng bài nộp nào?", "Bạn có thể dán văn bản, Markdown hoặc đoạn mã trực tiếp vào công việc. Ứng dụng hiển thị nội dung an toàn, không thực thi mã và không tự đọc tệp hay liên kết bên ngoài."],
];

export default function HomePage() {
  return <>
    <a className="tf-skip" href="#noi-dung">Đến nội dung</a>
    <header className="tf-topbar tf-landing-header" id="dau-trang">
      <Link className="tf-brand" href="/">TeamFlow <b>AI</b></Link>
      <nav className="tf-landing-nav" aria-label="Điều hướng giới thiệu">
        <a href="#cach-hoat-dong">Cách hoạt động</a><a href="#ba-tro-ly">Ba trợ lý</a><a href="#cau-hoi-thuong-gap">Câu hỏi thường gặp</a>
      </nav>
      <Link className="tf-button" href="/app">Bắt đầu lập kế hoạch</Link>
    </header>
    <main className="tf-landing" id="noi-dung">
      <section className="tf-hero" aria-labelledby="hero-title">
        <div><p className="tf-eyebrow">TRỢ LÝ ĐIỀU PHỐI CHO NHÓM NHỎ · 3–8 NGƯỜI</p>
          <h1 id="hero-title">Cả nhóm rõ việc.<br /><em>Trưởng nhóm nắm tiến độ.</em></h1>
          <p className="tf-lead">AI gợi ý phân rã mục tiêu và đối chiếu bài nộp theo từng tiêu chí cụ thể. Mọi kế hoạch, công bố và nghiệm thu hoàn thành luôn do con người trực tiếp phê duyệt.</p>
          <div className="tf-actions"><Link className="tf-button" href="/app">Bắt đầu lập kế hoạch</Link><a className="tf-button secondary" href="#cach-hoat-dong">Xem cách hoạt động</a></div>
          <p className="tf-muted">Kế hoạch còn là bản nháp cho đến khi trưởng nhóm duyệt.</p>
        </div>
        <div className="tf-preview" aria-label="Bảng công việc minh họa">
          <div className="tf-row"><b>Dự án đặt phòng</b><span className="tf-badge">Dữ liệu minh họa</span></div>
          <ul className="tf-preview-tasks">{[
            ["Thiết kế giao diện đặt phòng", "Chờ nghiệm thu", "in-review"],
            ["Xây dựng API phòng trống", "Đang làm", "in-progress"],
            ["Tích hợp cổng thanh toán", "Bị chặn", "blocked"],
          ].map(([title, status, kind]) => <li key={title}><strong>{title}</strong><span className="tf-badge" data-status={kind}>{status}</span></li>)}</ul>
          <p className="tf-muted">Trạng thái giúp nhóm biết việc cần làm tiếp. Chỉ con người xác nhận hoàn thành.</p>
        </div>
      </section>
      <section className="tf-landing-section" aria-labelledby="problem-title"><h2 id="problem-title">Một nơi để cả nhóm cùng nắm việc</h2>
        <div className="tf-three">{[
          ["Phân công cảm tính", "Cân nhắc kỹ năng và giờ rảnh trước khi giao việc."],
          ["Cập nhật rời rạc", "Gắn trao đổi, tiến độ và trở ngại với đúng công việc."],
          ["Tổng hợp cuối tuần", "Tạo báo cáo từ số liệu đã lưu và mở nguồn để đối chiếu."],
        ].map(([title, text]) => <div key={title}><h3>{title}</h3><p className="tf-muted">{text}</p></div>)}</div>
      </section>
      <section className="tf-landing-section" id="cach-hoat-dong" aria-labelledby="flow-title"><p className="tf-eyebrow">CÁCH HOẠT ĐỘNG</p><h2 id="flow-title">Từ mục tiêu đến bàn giao</h2>
        <ol className="tf-flow">{["Nhập mục tiêu, đầu ra, kỹ năng và giờ rảnh của nhóm.", "Kiểm tra, sửa và duyệt kế hoạch nháp trước khi công bố.", "Cập nhật qua chat, nộp bài và nghiệm thu bằng bằng chứng.", "Bấm tạo báo cáo tuần, xem số liệu và nguồn dẫn chứng."].map((text, i) => <li key={text}><span aria-hidden="true">0{i + 1}</span><p>{text}</p></li>)}</ol>
      </section>
      <section className="tf-landing-section" id="ba-tro-ly" aria-labelledby="agents-title"><p className="tf-eyebrow">BA TRỢ LÝ</p><h2 id="agents-title">AI hỗ trợ. Bạn quyết định.</h2>
        <div className="tf-three">{agents.map(([name, title, text, limit]) => <article className="tf-card" key={name}><p className="tf-eyebrow">{name}</p><h3>{title}</h3><p>{text}</p><p className="tf-muted"><strong>{limit}</strong></p></article>)}</div>
        <p>Duyệt trước khi công bố. Nghiệm thu cần bằng chứng. Báo cáo minh bạch từ số liệu đã lưu.</p>
      </section>
      <section className="tf-landing-section tf-faq" id="cau-hoi-thuong-gap" aria-labelledby="faq-title"><h2 id="faq-title">Câu hỏi thường gặp</h2>
        {questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      </section>
      <footer>TeamFlow AI · DevDay Exchange Community: Da Nang City<br /><a href="#dau-trang">Về đầu trang ↑</a></footer>
    </main>
  </>;
}
