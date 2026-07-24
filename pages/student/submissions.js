import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import { useUser, apiFetch } from "../../lib/useUser";

const STATUS_LABEL = {
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  cancelled: "Đã hủy",
  force_ended: "Bị buộc kết thúc",
};
const STATUS_COLOR = {
  in_progress: "bg-warn/20 text-warn",
  submitted: "bg-accent2/20 text-accent2",
  cancelled: "bg-danger/20 text-danger",
  force_ended: "bg-danger/20 text-danger",
};

export default function StudentSubmissions() {
  const user = useUser(["student"]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/submissions").then((d) => setAttempts(d.attempts)).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Bài làm của tôi</h1>
      <p className="text-mute mb-6 text-sm">Lịch sử các lượt thi bạn đã làm.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}
      <div className="pxl-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-mute text-left">
            <tr>
              <th className="p-3">Đề thi</th>
              <th className="p-3">Bắt đầu</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Điểm</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="p-3">{a.exam_title_snapshot}</td>
                <td className="p-3 text-xs text-mute">{new Date(a.started_at).toLocaleString("vi-VN")}</td>
                <td className="p-3"><span className={`pxl-badge ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span></td>
                <td className="p-3">{a.final_score ?? "—"}</td>
                <td className="p-3 text-right">
                  {a.status === "in_progress" ? (
                    <Link href={`/exam/take/${a.id}`} className="text-accent text-xs">Tiếp tục làm bài</Link>
                  ) : (
                    <span className="text-mute text-xs">Đã kết thúc</span>
                  )}
                </td>
              </tr>
            ))}
            {attempts.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-mute text-sm">Chưa có bài làm nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
