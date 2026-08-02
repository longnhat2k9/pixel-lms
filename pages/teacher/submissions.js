import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
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

  async function load() {
    try { const d = await apiFetch("/api/submissions"); setAttempts(d.attempts); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function action(id, act, minutes) {
    try {
      await apiFetch(`/api/submissions/${id}/action`, { method: "POST", body: JSON.stringify({ action: act, minutes }) });
      load();
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
          <div key={a.id} className="pxl-card p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Link href={`/teacher/submissions/${a.id}`} className="font-semibold hover:text-accent">
                {a.exam_title_snapshot}
              </Link>
              {a.kind === "practice" && (
                <span className="pxl-badge bg-accent/20 text-accent ml-2">Luyện tập</span>
              )}
              <div className="text-xs text-mute mt-1">
                {a.student_name_snapshot} · Bắt đầu {new Date(a.started_at).toLocaleString("vi-VN")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`pxl-badge ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              <span className="text-sm">Điểm: {a.final_score ?? "—"}</span>
              {a.status === "in_progress" && (
                <>
                  <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => action(a.id, "adjust_time", -5)}>-5 phút</button>
                  <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => action(a.id, "adjust_time", 5)}>+5 phút</button>
                  <button className="pxl-btn-outline text-xs px-2 py-1" onClick={() => action(a.id, "force_end")}>Kết thúc</button>
                  <button className="pxl-btn-danger text-xs px-2 py-1" onClick={() => action(a.id, "cancel")}>Hủy</button>
                </>
              )}
              <Link href={`/teacher/submissions/${a.id}`} className="pxl-btn-outline text-xs px-2 py-1">
                Xem chi tiết
              </Link>
            </div>
          </div>
        ))}
        {attempts.length === 0 && <div className="text-mute text-sm">Chưa có bài làm nào.</div>}
      </div>
    </Layout>
  );
}
