import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

export default function PracticePaper() {
  const user = useUser(["admin", "teacher", "student"]);
  const router = useRouter();
  const { paperId } = router.query;

  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // { score, maxScore, breakdown }
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const d = await apiFetch(`/api/questionbank/practice/${paperId}`);
      setPaper(d.paper);
      setQuestions(d.questions);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user && paperId) load(); }, [user, paperId]);

  function setAnswer(qId, value) {
    setAnswers((a) => ({ ...a, [qId]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const d = await apiFetch(`/api/questionbank/practice/${paperId}/submit`, {
        method: "POST", body: JSON.stringify({ answers }),
      });
      setResult(d);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function retry() {
    setAnswers({});
    setResult(null);
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
            <span className="pxl-badge bg-panel2 text-gray-300 shrink-0">Luyện tập · không giới hạn số lần</span>
          </div>
          <p className="text-mute text-sm mb-6">Làm xong bấm "Nộp bài" để xem điểm ngay. Có thể làm lại bao nhiêu lần tùy thích — mỗi lần nộp đều được lưu vào mục Bài làm.</p>

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
                            <input type="radio" name={q.id} checked={isChosen} onChange={() => setAnswer(q.id, String(i))} />
                            <MarkdownRenderer content={opt} inline />
                            {isRightAnswer && <span className="text-accent2 text-xs ml-auto">Đáp án đúng</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "fill_blank" && (
                    <div>
                      <input className="pxl-input" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
                      {b && b.correctAnswer !== null && (
                        <div className="text-xs text-accent2 mt-1">
                          Đáp án đúng: <MarkdownRenderer content={String(b.correctAnswer)} inline />
                        </div>
                      )}
                    </div>
                  )}

                  {(q.type === "essay" || q.type === "matching") && (
                    <div>
                      <textarea className="pxl-input" rows={4} value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
                      {result && <div className="text-xs text-mute mt-1">Loại câu hỏi này không tự chấm được.</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="pxl-btn w-full py-3 mt-6" onClick={submit} disabled={submitting}>
            {submitting ? "Đang chấm..." : result ? "Nộp lại" : "Nộp bài"}
          </button>
        </div>
      )}
    </Layout>
  );
}
