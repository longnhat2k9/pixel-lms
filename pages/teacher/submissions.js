import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

const STATUS_LABEL = {
  in_progress: "Đang làm", submitted: "Đã nộp", cancelled: "Đã hủy", force_ended: "Bị buộc kết thúc",
};
const STATUS_COLOR = {
  in_progress: "bg-warn/20 text-warn",
  submitted: "bg-accent2/20 text-accent2",
  cancelled: "bg-danger/20 text-danger",
  force_ended: "bg-danger/20 text-danger",
};

export default function SubmissionsPage() {
  const user = useUser(["admin", "teacher"]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [overrides, setOverrides] = useState({});

  async function load() {
    try { const d = await apiFetch("/api/submissions"); setAttempts(d.attempts); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function openDetail(a) {
    if (openId === a.id) { setOpenId(null); setDetail(null); return; }
    setOpenId(a.id);
    try {
      const d = await apiFetch(`/api/exams/attempt-questions/${a.id}`);
      setDetail(d);
      setOverrides(d.attempt.manual_overrides || {});
    } catch (e) { setError(e.message); }
  }

  async function action(id, act, minutes) {
    try {
      await apiFetch(`/api/submissions/${id}/action`, { method: "POST", body: JSON.stringify({ action: act, minutes }) });
      load();
      if (openId === id) openDetailById(id);
    } catch (e) { setError(e.message); }
  }

  async function openDetailById(id) {
    const d = await apiFetch(`/api/exams/attempt-questions/${id}`);
    setDetail(d);
    setOverrides(d.attempt.manual_overrides || {});
  }

  async function saveGrading() {
    try {
      await apiFetch(`/api/submissions/${openId}/action`, {
        method: "POST", body: JSON.stringify({ action: "grade", overrides }),
      });
      load();
      openDetailById(openId);
    } catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Bài làm</h1>
      <p className="text-mute mb-6 text-sm">Giám sát và chấm bài. Học sinh chỉ xem được bài làm của chính mình.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <div className="space-y-3">
        {attempts.map((a) => (
          <div key={a.id} className="pxl-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{a.exam_title_snapshot}</div>
                <div className="text-xs text-mute mt-1">
                  {a.student_name_snapshot} · Bắt đầu {new Date(a.started_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pxl-badge ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                <span className="text-sm">Điểm: {a.final_score ?? "—"}</span>
                {a.status === "in_progress" && (
                  <>
                    <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => action(a.id, "adjust_time", 5)}>+5 phút</button>
                    <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => action(a.id, "force_end")}>Kết thúc</button>
                    <button className="pxl-btn-danger text-xs px-2 py-1" onClick={() => action(a.id, "cancel")}>Hủy</button>
                  </>
                )}
                <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => openDetail(a)}>
                  {openId === a.id ? "Ẩn" : "Xem bài làm"}
                </button>
              </div>
            </div>

            {openId === a.id && detail && (
              <div className="mt-4 border-t border-line pt-4 space-y-3">
                {detail.questions.map((q, idx) => {
                  const given = detail.attempt.answers?.[q.id];
                  const needsManual = q.type === "essay" || q.type === "matching";
                  return (
                    <div key={q.id} className="bg-panel2 rounded-pixel p-3">
                      <div className="text-sm font-medium mb-1">
                        <span className="text-mute">Câu {idx + 1} ({q.points} điểm):</span>{" "}
                        <MarkdownRenderer content={q.content} inline />
                      </div>
                      <div className="text-sm text-gray-300 mb-2">Trả lời: {given ?? <span className="text-mute">— chưa trả lời —</span>}</div>
                      {needsManual && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-mute">Điểm chấm tay:</label>
                          <input
                            type="number" step="0.1" className="pxl-input w-24"
                            value={overrides[q.id] ?? ""}
                            onChange={(e) => setOverrides({ ...overrides, [q.id]: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="pxl-btn text-sm" onClick={saveGrading}>Lưu điểm chấm tay</button>
              </div>
            )}
          </div>
        ))}
        {attempts.length === 0 && <div className="text-mute text-sm">Chưa có bài làm nào.</div>}
      </div>
    </Layout>
  );
}
