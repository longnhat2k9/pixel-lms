import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../../lib/useUser";

const STATUS_LABEL = {
  in_progress: "Đang làm", submitted: "Đã nộp", cancelled: "Đã hủy", force_ended: "Bị buộc kết thúc",
};
const STATUS_COLOR = {
  in_progress: "bg-warn/20 text-warn",
  submitted: "bg-accent2/20 text-accent2",
  cancelled: "bg-danger/20 text-danger",
  force_ended: "bg-danger/20 text-danger",
};
const TYPE_LABEL = {
  choice2: "2 lựa chọn (Đúng/Sai)",
  choice4: "4 lựa chọn",
  fill_blank: "Điền khuyết",
  essay: "Tự luận",
  matching: "Nối câu",
};
const LETTERS = ["A", "B", "C", "D"];

function autoPoints(q, given) {
  if (q.type === "choice2" || q.type === "choice4") {
    return given !== undefined && String(given) === String(q.correct_answer?.value) ? Number(q.points) : 0;
  }
  if (q.type === "fill_blank") {
    const norm = (s) => String(s || "").trim().toLowerCase();
    return given !== undefined && norm(given) === norm(q.correct_answer?.value) ? Number(q.points) : 0;
  }
  return 0; // essay/matching: no auto grade until a teacher enters one
}

export default function SubmissionDetail() {
  const user = useUser(["admin", "teacher"]);
  const router = useRouter();
  const { id } = router.query;

  const [detail, setDetail] = useState(null);
  const [scores, setScores] = useState({}); // { [questionId]: string }
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    try {
      const d = await apiFetch(`/api/exams/attempt-questions/${id}`);
      setDetail(d);
      const overrides = d.attempt.manual_overrides || {};
      const initial = {};
      for (const q of d.questions) {
        const given = d.attempt.answers?.[q.id];
        initial[q.id] = String(
          Object.prototype.hasOwnProperty.call(overrides, q.id) ? overrides[q.id] : autoPoints(q, given)
        );
      }
      setScores(initial);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user && id) load(); }, [user, id]);

  async function action(act, minutes) {
    try {
      await apiFetch(`/api/submissions/${id}/action`, { method: "POST", body: JSON.stringify({ action: act, minutes }) });
      load();
    } catch (e) { setError(e.message); }
  }

  async function saveGrading() {
    setError("");
    setSaved(false);
    try {
      const overrides = {};
      for (const [qid, val] of Object.entries(scores)) overrides[qid] = Number(val || 0);
      await apiFetch(`/api/submissions/${id}/action`, {
        method: "POST", body: JSON.stringify({ action: "grade", overrides }),
      });
      setSaved(true);
      load();
    } catch (e) { setError(e.message); }
  }

  if (!user) return null;
  if (!detail) return <Layout user={user}>{error ? <div className="text-danger">{error}</div> : <div className="text-mute">Đang tải...</div>}</Layout>;

  const { attempt, questions } = detail;
  const totalMax = questions.reduce((s, q) => s + Number(q.points), 0);
  const totalNow = Object.values(scores).reduce((s, v) => s + Number(v || 0), 0);

  return (
    <Layout user={user}>
      <button className="text-sm text-mute hover:text-accent mb-4" onClick={() => router.push("/teacher/submissions")}>
        ← Quay lại danh sách bài làm
      </button>

      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-2xl font-bold">{attempt.exam_title_snapshot}</h1>
          <span className={`pxl-badge shrink-0 ${STATUS_COLOR[attempt.status]}`}>{STATUS_LABEL[attempt.status]}</span>
        </div>
        <div className="text-sm text-mute mb-6">
          {attempt.student_name_snapshot} · Bắt đầu {new Date(attempt.started_at).toLocaleString("vi-VN")}
          {attempt.submitted_at && <> · Nộp lúc {new Date(attempt.submitted_at).toLocaleString("vi-VN")}</>}
        </div>

        {error && <div className="mb-4 text-sm text-danger">{error}</div>}

        <div className="pxl-card p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="text-xs text-mute">Tổng điểm hiện tại</div>
            <div className="text-2xl font-bold text-accent2">{totalNow} / {totalMax}</div>
            {attempt.final_score !== null && <div className="text-xs text-mute mt-1">Đã lưu: {attempt.final_score} / {totalMax}</div>}
          </div>
          <div className="flex gap-2">
            {attempt.status === "in_progress" && (
              <>
                <button className="pxl-btn-outline text-xs px-3 py-1.5" onClick={() => action("adjust_time", 5)}>+5 phút</button>
                <button className="pxl-btn-outline text-xs px-3 py-1.5" onClick={() => action("force_end")}>Kết thúc</button>
                <button className="pxl-btn-danger text-xs px-3 py-1.5" onClick={() => action("cancel")}>Hủy bài</button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {questions.map((q, idx) => {
            const given = attempt.answers?.[q.id];
            const isChoice = q.type === "choice2" || q.type === "choice4";
            return (
              <div key={q.id} className="pxl-card p-5">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="pxl-badge bg-panel2 text-gray-300">{TYPE_LABEL[q.type]}</span>
                  <span className="pxl-badge bg-panel2 text-gray-300">{q.points} điểm tối đa</span>
                </div>

                <div className="flex gap-2 mb-3">
                  <span className="text-sm font-semibold text-mute shrink-0">Câu {idx + 1}.</span>
                  <div className="text-sm flex-1 min-w-0"><MarkdownRenderer content={q.content} /></div>
                </div>

                {isChoice && (
                  <div className={`grid gap-2 mb-3 ${q.type === "choice4" ? "md:grid-cols-2" : ""}`}>
                    {(q.data?.options || []).map((o, i) => {
                      const isCorrect = String(i) === String(q.correct_answer?.value);
                      const isChosen = given !== undefined && String(i) === String(given);
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded-pixel px-3 py-2 text-sm ${
                            isCorrect
                              ? "bg-accent2/10 border border-accent2/40"
                              : isChosen
                              ? "bg-danger/10 border border-danger/40"
                              : "bg-panel2 border border-transparent"
                          }`}
                        >
                          <span
                            className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                              isCorrect ? "bg-accent2 text-ink" : isChosen ? "bg-danger text-ink" : "bg-line text-gray-300"
                            }`}
                          >
                            {q.type === "choice4" ? LETTERS[i] : isCorrect ? "✓" : isChosen ? "✕" : ""}
                          </span>
                          <span className={`min-w-0 ${isCorrect ? "text-accent2" : isChosen ? "text-danger" : "text-gray-300"}`}>
                            <MarkdownRenderer content={o} inline />
                          </span>
                          {isChosen && <span className="text-[10px] text-mute ml-auto shrink-0">Học sinh chọn</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === "fill_blank" && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-3">
                    <div className="bg-panel2 rounded-pixel px-3 py-2 text-sm">
                      <div className="text-[11px] text-mute mb-0.5">Học sinh trả lời</div>
                      {given ? <MarkdownRenderer content={String(given)} inline /> : <span className="text-mute">— chưa trả lời —</span>}
                    </div>
                    <div className="bg-accent2/10 border border-accent2/40 rounded-pixel px-3 py-2 text-sm text-accent2">
                      <div className="text-[11px] text-mute mb-0.5">Đáp án đúng</div>
                      <MarkdownRenderer content={String(q.correct_answer?.value ?? "")} inline />
                    </div>
                  </div>
                )}

                {(q.type === "essay" || q.type === "matching") && (
                  <div className="bg-panel2 rounded-pixel px-3 py-2 text-sm mb-3">
                    <div className="text-[11px] text-mute mb-0.5">Học sinh trả lời</div>
                    {given ? <div className="whitespace-pre-line">{given}</div> : <span className="text-mute">— chưa trả lời —</span>}
                    <div className="text-[11px] text-mute mt-2">Không có đáp án mẫu cố định — chấm theo nội dung trả lời.</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <label className="text-xs text-mute">Điểm cho câu này:</label>
                  <input
                    type="number" step="0.1" min="0" max={q.points}
                    className="pxl-input w-24"
                    value={scores[q.id] ?? "0"}
                    onChange={(e) => setScores({ ...scores, [q.id]: e.target.value })}
                  />
                  <span className="text-xs text-mute">/ {q.points}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button className="pxl-btn" onClick={saveGrading}>Lưu điểm</button>
          {saved && <span className="text-sm text-accent2">Đã lưu.</span>}
        </div>
      </div>
    </Layout>
  );
}
