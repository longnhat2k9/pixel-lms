import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useUser, apiFetch } from "../../lib/useUser";

const STATUS_LABEL = { scheduled: "Đã lên lịch", active: "Đang diễn ra", ended: "Đã đóng" };
const ATTEMPT_STATUS_LABEL = {
  in_progress: "Đang làm", submitted: "Đã nộp", cancelled: "Đã hủy", force_ended: "Bị buộc kết thúc",
};

export default function ExamsPage() {
  const user = useUser(["admin", "teacher"]);
  const [sessions, setSessions] = useState([]);
  const [papers, setPapers] = useState([]);
  const [form, setForm] = useState({ title: "", paperId: "", timeLimitMinutes: 60, allowMultipleAttempts: false });
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState(null);

  async function load() {
    try {
      const [s, p] = await Promise.all([
        apiFetch("/api/exams/sessions"),
        apiFetch("/api/questionbank/papers"),
      ]);
      setSessions(s.sessions);
      setPapers(p.papers);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function create(e) {
    e.preventDefault();
    if (!form.paperId) return setError("Chọn đề thi.");
    try {
      await apiFetch("/api/exams/sessions", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", paperId: "", timeLimitMinutes: 60, allowMultipleAttempts: false });
      load();
    } catch (e) { setError(e.message); }
  }

  async function toggle(s) {
    if (expanded === s.id) { setExpanded(null); return; }
    setExpanded(s.id);
    try { const d = await apiFetch(`/api/exams/sessions/${s.id}`); setDetail(d); }
    catch (e) { setError(e.message); }
  }

  async function setStatus(s, status) {
    try { await apiFetch(`/api/exams/sessions/${s.id}`, { method: "PUT", body: JSON.stringify({ status }) }); load(); }
    catch (e) { setError(e.message); }
  }

  async function attemptAction(attemptId, action, minutes) {
    try {
      await apiFetch(`/api/submissions/${attemptId}/action`, { method: "POST", body: JSON.stringify({ action, minutes }) });
      const d = await apiFetch(`/api/exams/sessions/${expanded}`);
      setDetail(d);
    } catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Thi</h1>
      <p className="text-mute mb-6 text-sm">Tạo ca thi từ đề thi có sẵn. Học sinh chỉ cần nhập mã ca thi.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={create} className="pxl-card p-5 mb-8 grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs text-mute">Tên ca thi</label>
          <input className="pxl-input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Đề thi</label>
          <select className="pxl-input mt-1" value={form.paperId} onChange={(e) => setForm({ ...form, paperId: e.target.value })} required>
            <option value="">-- Chọn đề --</option>
            {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-mute">Thời gian (phút)</label>
          <input type="number" className="pxl-input mt-1" value={form.timeLimitMinutes}
            onChange={(e) => setForm({ ...form, timeLimitMinutes: Number(e.target.value) })} />
        </div>
        <button className="pxl-btn h-[38px]">+ Tạo ca thi</button>
      </form>

      <div className="space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="pxl-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-mute mt-1">
                  Mã ca thi: <span className="font-mono text-accent">{s.session_code}</span> · {s.time_limit_minutes} phút
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="pxl-badge bg-panel2 text-gray-300">{STATUS_LABEL[s.status]}</span>
                {s.status !== "active" && <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => setStatus(s, "active")}>Mở ca thi</button>}
                {s.status !== "ended" && <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => setStatus(s, "ended")}>Đóng ca thi</button>}
                <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => toggle(s)}>
                  {expanded === s.id ? "Ẩn" : "Xem bài làm"}
                </button>
              </div>
            </div>

            {expanded === s.id && detail && (
              <div className="mt-4 border-t border-line pt-4 space-y-2">
                {detail.attempts.length === 0 && <div className="text-mute text-sm">Chưa có học sinh nào làm bài.</div>}
                {detail.attempts.map((a) => (
                  <div key={a.id} className="bg-panel2 rounded-pixel p-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div>{a.student_name_snapshot}</div>
                      <div className="text-xs text-mute">{ATTEMPT_STATUS_LABEL[a.status]} · Điểm: {a.final_score ?? "—"}</div>
                    </div>
                    {a.status === "in_progress" && (
                      <div className="flex gap-2">
                        <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => attemptAction(a.id, "adjust_time", 5)}>+5 phút</button>
                        <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => attemptAction(a.id, "force_end")}>Kết thúc</button>
                        <button className="pxl-btn-danger text-xs px-2 py-1" onClick={() => attemptAction(a.id, "cancel")}>Hủy bài</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {sessions.length === 0 && <div className="text-mute text-sm">Chưa có ca thi nào.</div>}
      </div>
    </Layout>
  );
}
