import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

function fmt(ms) {
  if (ms == null) return "--:--";
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function PracticePaper() {
  const user = useUser(["admin", "teacher", "student"]);
  const router = useRouter();
  const { paperId } = router.query;
  const minutes = router.query.minutes ? Number(router.query.minutes) : null;
  const isTimed = !!minutes && minutes > 0;

  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // { score, maxScore, breakdown }
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [remaining, setRemaining] = useState(null);

  async function load() {
    try {
      const d = await apiFetch(`/api/questionbank/practice/${paperId}`);
      setPaper(d.paper);
      setQuestions(d.questions);
      setDeadline(minutes ? Date.now() + minutes * 60000 : null);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user && paperId) load(); }, [user, paperId]);

  useEffect(() => {
    if (!deadline) { setRemaining(null); return; }
    const tick = () => {
      const ms = deadline - Date.now();
      setRemaining(ms);
      if (ms <= 0) submit(true);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const locked = isTimed && result != null;

  function setAnswer(qId, value) {
    if (locked) return;
    setAnswers((a) => ({ ...a, [qId]: value }));
  }

  async function submit(auto) {
    if (auto && (submitting || result)) return;
    setSubmitting(true);
    setError("");
    try {
      const d = await apiFetch(`/api/questionbank/practice/${paperId}/submit`, {
        method: "POST", body: JSON.stringify({ answers }),
      });
      setResult(d);
      setDeadline(null);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function retry() {
    setAnswers({});
    setResult(null);
    setDeadline(isTimed ? Date.now() + minutes * 60000 : null);
  }

  const breakdownByQ = {};
  (result?.breakdown || []).forEach((b) => { breakdownByQ[b.questionId] = b; });

  if (!user) return null;

  return (
    <Layout user={user}>
      <button className="text-sm text-mute hover:text-accent mb-4" onClick={() => router.back()}>← Quay lại</button>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      {!paper ? (
        <div className="text-mute">Đang tải...</div>
      ) : (
        <div className="max-w-2xl">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h1 className="text-2xl font-bold">{paper.title}</h1>
            {isTimed ? (
              <span className={`font-mono text-lg shrink-0 ${remaining < 60000 ? "text-danger" : "text-accent"}`}>
                ⏱ {fmt(remaining)}
              </span>
            ) : (
              <span className="pxl-badge bg-panel2 text-gray-300 shrink-0">Luyện tập · không giới hạn số lần</span>
            )}
          </div>
          <p className="text-mute text-sm mb-6">
            {isTimed
              ? `Bạn có ${minutes} phút cho lượt làm bài này. Hết giờ sẽ tự động nộp. Có thể "Làm lại" để thử lượt mới với đủ thời gian.`
              : "Làm xong bấm \"Nộp bài\" để xem điểm ngay. Có thể làm lại bao nhiêu lần tùy thích — mỗi lần nộp đều được lưu vào mục Bài làm."}
          </p>

          {result && (
            <div className="pxl-card p-5 mb-6 flex items-center justify-between">
              <div>
                <div className="text-xs text-mute">Kết quả lần này</div>
                <div className="text-2xl font-bold text-accent2">{result.score} / {result.maxScore}</div>
                {result.showAnswers === false && (
                  <div className="text-xs text-mute mt-1">Giáo viên đã tắt xem đáp án cho đề này.</div>
                )}
              </div>
              <button className="pxl-btn-outline text-sm" onClick={retry}>↻ Làm lại</button>
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const b = breakdownByQ[q.id];
              return (
                <div
                  key={q.id}
                  className={`pxl-card p-5 ${b ? (b.isCorrect === true ? "border-accent2/50" : b.isCorrect === false ? "border-danger/50" : "") : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="text-sm font-medium flex-1">
                      <span className="text-mute">Câu {idx + 1} ({q.points} điểm):</span>{" "}
                      <MarkdownRenderer content={q.content} inline />
                    </div>
                    {b && b.isCorrect !== null && (
                      <span className={`pxl-badge shrink-0 ${b.isCorrect ? "bg-accent2/20 text-accent2" : "bg-danger/20 text-danger"}`}>
                        {b.isCorrect ? "Đúng" : "Sai"}
                      </span>
                    )}
                  </div>

                  {(q.type === "choice2" || q.type === "choice4") && (
                    <div className="space-y-2">
                      {(q.data?.options || (q.type === "choice2" ? ["Đúng", "Sai"] : [])).map((opt, i) => {
                        const isChosen = answers[q.id] === String(i);
                        const isRightAnswer = b && String(i) === String(b.correctAnswer);
                        return (
                          <label
                            key={i}
                            className={`flex items-center gap-2 text-sm rounded-pixel px-3 py-2 cursor-pointer ${
                              isRightAnswer ? "bg-accent2/10 border border-accent2/40" : "bg-panel2 border border-transparent"
                            }`}
                          >
                            <input type="radio" name={q.id} checked={isChosen} disabled={locked} onChange={() => setAnswer(q.id, String(i))} />
                            <MarkdownRenderer content={opt} inline />
                            {isRightAnswer && <span className="text-accent2 text-xs ml-auto">Đáp án đúng</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "fill_blank" && (
                    <div>
                      <input className="pxl-input" disabled={locked} value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
                      {b && b.correctAnswer !== null && (
                        <div className="text-xs text-accent2 mt-1">
                          Đáp án đúng: <MarkdownRenderer content={String(b.correctAnswer)} inline />
                        </div>
                      )}
                    </div>
                  )}

                  {(q.type === "essay" || q.type === "matching") && (
                    <div>
                      <textarea className="pxl-input" rows={4} disabled={locked} value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
                      {result && <div className="text-xs text-mute mt-1">Loại câu hỏi này không tự chấm được.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!locked && (
            <button className="pxl-btn w-full py-3 mt-6" onClick={() => submit(false)} disabled={submitting}>
              {submitting ? "Đang chấm..." : result ? "Nộp lại" : "Nộp bài"}
            </button>
          )}
        </div>
      )}
    </Layout>
  );
}
