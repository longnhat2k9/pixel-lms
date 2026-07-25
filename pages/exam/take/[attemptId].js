import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useUser, apiFetch } from "../../../lib/useUser";
import MarkdownRenderer from "../../../components/MarkdownRenderer";

function useCountdown(deadline, onExpire) {
  const [remaining, setRemaining] = useState(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const ms = new Date(deadline).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) onExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

function fmt(ms) {
  if (ms == null) return "--:--";
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ExamTake() {
  const user = useUser(["admin", "teacher", "student"]);
  const router = useRouter();
  const { attemptId } = router.query;

  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dirty = useRef(false);

  async function load() {
    try {
      const d = await apiFetch(`/api/exams/attempt-questions/${attemptId}`);
      setAttempt(d.attempt);
      setQuestions(d.questions);
      setAnswers(d.attempt.answers || {});
      setShowAnswers(!!d.showAnswers);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (user && attemptId) load(); }, [user, attemptId]);

  // autosave every 10s while in progress
  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;
    const id = setInterval(() => {
      if (dirty.current) {
        apiFetch(`/api/submissions/${attemptId}`, { method: "PUT", body: JSON.stringify({ answers }) }).catch(() => {});
        dirty.current = false;
      }
    }, 10000);
    return () => clearInterval(id);
  }, [attempt, answers, attemptId]);

  const deadline = attempt
    ? new Date(new Date(attempt.started_at).getTime() + (attempt.time_limit_minutes + (attempt.time_adjust_minutes || 0)) * 60000)
    : null;
  const remaining = useCountdown(attempt?.status === "in_progress" ? deadline : null, () => submit(true));

  function setAnswer(qId, value) {
    setAnswers((a) => ({ ...a, [qId]: value }));
    dirty.current = true;
  }

  async function submit(auto) {
    if (submitting) return;
    if (!auto && !confirm("Nộp bài ngay bây giờ?")) return;
    setSubmitting(true);
    try {
      const d = await apiFetch(`/api/submissions/${attemptId}`, {
        method: "PUT",
        body: JSON.stringify({ answers, submit: true }),
      });
      setAttempt(d.attempt);
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;
  if (error) return <div className="min-h-screen bg-ink text-danger p-8">{error}</div>;
  if (!attempt) return <div className="min-h-screen bg-ink text-mute p-8">Đang tải...</div>;

  const finished = attempt.status !== "in_progress";

  return (
    <div className="min-h-screen bg-ink text-gray-100">
      <div className="sticky top-0 bg-panel border-b border-line z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <div className="font-semibold">{attempt.exam_title_snapshot}</div>
            <div className="text-xs text-mute">{attempt.student_name_snapshot}</div>
          </div>
          {!finished ? (
            <div className={`font-mono text-xl ${remaining < 60000 ? "text-danger" : "text-accent"}`}>{fmt(remaining)}</div>
          ) : (
            <div className="pxl-badge bg-accent2/20 text-accent2">Đã nộp bài</div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {finished && (
          <div className="pxl-card p-5">
            <div className="text-sm text-mute">Điểm số</div>
            <div className="text-2xl font-bold">{attempt.final_score ?? attempt.auto_score ?? "Chưa chấm"}</div>
            {!showAnswers && <div className="text-xs text-mute mt-1">Giáo viên đã tắt xem đáp án cho đề này.</div>}
          </div>
        )}

        {questions.map((q, idx) => {
          const given = answers[q.id];
          const hasAnswerKey = finished && showAnswers;
          const isChoice = q.type === "choice2" || q.type === "choice4";
          const isCorrectChoice = (i) => hasAnswerKey && String(i) === String(q.correct_answer?.value);
          const isChosenChoice = (i) => given === String(i);
          const fillCorrect = hasAnswerKey && q.type === "fill_blank" &&
            String(given || "").trim().toLowerCase() === String(q.correct_answer?.value || "").trim().toLowerCase();

          return (
            <div key={q.id} className="pxl-card p-5">
              <div className="text-sm font-medium mb-3">
                <span className="text-mute">Câu {idx + 1} ({q.points} điểm):</span>{" "}
                <MarkdownRenderer content={q.content} inline />
              </div>

              {isChoice && (
                <div className="space-y-2">
                  {(q.data?.options || (q.type === "choice2" ? ["Đúng", "Sai"] : [])).map((opt, i) => {
                    const correct = isCorrectChoice(i);
                    const chosen = isChosenChoice(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-center gap-2 text-sm rounded-pixel px-3 py-2 ${finished ? "" : "cursor-pointer"} ${
                          correct
                            ? "bg-accent2/10 border border-accent2/40"
                            : chosen
                            ? "bg-danger/10 border border-danger/40"
                            : "bg-panel2 border border-transparent"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          disabled={finished}
                          checked={chosen}
                          onChange={() => setAnswer(q.id, String(i))}
                        />
                        <MarkdownRenderer content={opt} inline />
                        {hasAnswerKey && correct && <span className="text-accent2 text-xs ml-auto shrink-0">Đáp án đúng</span>}
                        {hasAnswerKey && chosen && !correct && <span className="text-danger text-xs ml-auto shrink-0">Bạn chọn</span>}
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "fill_blank" && (
                <div>
                  <input
                    className="pxl-input"
                    disabled={finished}
                    value={given || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                  {hasAnswerKey && (
                    <div className={`text-xs mt-1 ${fillCorrect ? "text-accent2" : "text-danger"}`}>
                      Đáp án đúng: <MarkdownRenderer content={String(q.correct_answer?.value ?? "")} inline />
                    </div>
                  )}
                </div>
              )}

              {(q.type === "essay" || q.type === "matching") && (
                <textarea
                  className="pxl-input"
                  rows={4}
                  disabled={finished}
                  value={given || ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}
            </div>
          );
        })}

        {!finished && (
          <button className="pxl-btn w-full py-3" onClick={() => submit(false)} disabled={submitting}>
            {submitting ? "Đang nộp..." : "Nộp bài"}
          </button>
        )}
      </div>
    </div>
  );
}
