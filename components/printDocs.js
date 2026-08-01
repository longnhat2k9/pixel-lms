import MarkdownRenderer from "./MarkdownRenderer";
import { fillBlankValues } from "../lib/grading";
import { seededShuffle } from "../lib/shuffle";

const LETTERS = ["A", "B", "C", "D"];
const today = () => new Date().toLocaleDateString("vi-VN");

export function ExamPaperDoc({ paper, questions }) {
  return (
    <div>
      <div className="doc-title">{paper.title}</div>
      <div className="doc-meta">Đề thi · {questions.length} câu · Họ tên thí sinh: ______________________ · Ngày in: {today()}</div>
      {questions.map((q, idx) => {
        const orderItems = q.type === "ordering" ? (q.data?.items || []) : [];
        const shuffledIdx = orderItems.length ? seededShuffle(orderItems.map((_, i) => i), `${paper.id}-${q.id}`) : [];
        return (
          <div className="question" key={q.id}>
            <div className="stem">
              <span className="qnum">Câu {idx + 1}.</span>
              <MarkdownRenderer content={q.content} inline />{" "}
              <span className="pts">({q.points} điểm)</span>
            </div>

            {(q.type === "choice2" || q.type === "choice4") && (
              <div className={`options ${q.type === "choice2" ? "single-col" : ""}`}>
                {(q.data?.options || []).map((o, i) => (
                  <div className="option" key={i}>
                    <span className="letter">{q.type === "choice4" ? LETTERS[i] : i === 0 ? "Đ" : "S"}</span>
                    <span><MarkdownRenderer content={o} inline /></span>
                  </div>
                ))}
              </div>
            )}

            {q.type === "fill_blank" && <div className="blank-line">Trả lời: ______________________________</div>}
            {q.type === "ordering" && (
              <div className="options single-col">
                {shuffledIdx.map((origIdx) => (
                  <div className="option" key={origIdx}>
                    <span className="letter">__</span>
                    <span><MarkdownRenderer content={orderItems[origIdx]} inline /></span>
                  </div>
                ))}
                <div className="blank-line">(Ghi số thứ tự đúng 1, 2, 3... vào ô trống cạnh mỗi mục)</div>
              </div>
            )}
            {(q.type === "essay" || q.type === "matching") && (
              <div className="blank-line">Trả lời: ______________________________________________________</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AnswerKeyDoc({ paper, questions }) {
  return (
    <div>
      <div className="doc-title">Đáp án — {paper.title}</div>
      <div className="doc-meta">{questions.length} câu · Ngày in: {today()}</div>
      <table>
        <thead>
          <tr><th style={{ width: 50 }}>Câu</th><th>Đáp án đúng</th><th style={{ width: 60 }}>Điểm</th></tr>
        </thead>
        <tbody>
          {questions.map((q, idx) => (
            <tr key={q.id}>
              <td>{idx + 1}</td>
              <td>
                {q.type === "choice4" && (
                  <>
                    <b>{LETTERS[Number(q.correct_answer?.value)] || "?"}</b>{" — "}
                    <MarkdownRenderer content={q.data?.options?.[Number(q.correct_answer?.value)] || ""} inline />
                  </>
                )}
                {q.type === "choice2" && <b>{q.correct_answer?.value === "0" ? "Đúng" : "Sai"}</b>}
                {q.type === "fill_blank" && (
                  <span className="flex flex-wrap gap-1">
                    {fillBlankValues(q.correct_answer).map((v, i) => (
                      <span key={i}>
                        {i > 0 && " hoặc "}
                        <MarkdownRenderer content={v} inline />
                      </span>
                    ))}
                  </span>
                )}
                {q.type === "ordering" && (
                  <span>
                    {(q.data?.items || []).map((text, i) => (
                      <span key={i} style={{ display: "block" }}>
                        {i + 1}. <MarkdownRenderer content={text} inline />
                      </span>
                    ))}
                  </span>
                )}
                {(q.type === "essay" || q.type === "matching") && <span className="note">Chấm tay</span>}
              </td>
              <td>{q.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SESSION_STATUS_LABEL = { scheduled: "Đã lên lịch", active: "Đang diễn ra", ended: "Đã đóng" };

export function SessionListDoc({ sessions }) {
  return (
    <div>
      <div className="doc-title">Danh sách ca thi</div>
      <div className="doc-meta">{sessions.length} ca thi · Ngày in: {today()}</div>
      <table>
        <thead>
          <tr><th>Tên ca thi</th><th>Mã ca thi</th><th>Thời gian làm bài</th><th>Trạng thái</th></tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.title}</td>
              <td className="creds-pass">{s.session_code}</td>
              <td>{s.time_limit_minutes} phút</td>
              <td>{SESSION_STATUS_LABEL[s.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ROLE_LABEL = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };

export function AccountCredentialsDoc({ accounts }) {
  return (
    <div>
      <div className="doc-title">Danh sách tài khoản</div>
      <div className="doc-meta">{accounts.length} tài khoản vừa tạo/đổi mật khẩu · Ngày in: {today()}</div>
      <table>
        <thead>
          <tr><th>Họ tên</th><th>Vai trò</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>{a.fullName}</td>
              <td>{ROLE_LABEL[a.role]}</td>
              <td className="creds-pass">{a.username}</td>
              <td className="creds-pass">{a.password}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="note">Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.</div>
    </div>
  );
}
