import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import MarkdownRenderer from "../../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../../lib/useUser";

const POLL_MS = 3000;

export default function ExamWaitingRoom() {
  const user = useUser(["student"]);
  const router = useRouter();
  const { code } = router.query;

  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const enteringRef = useRef(false);

  async function poll() {
    if (!code || enteringRef.current) return;
    try {
      const d = await apiFetch(`/api/exams/status/${code}`);
      setSession(d.session);

      if (d.session.status === "active") {
        enteringRef.current = true;
        const entered = await apiFetch("/api/exams/enter", { method: "POST", body: JSON.stringify({ code }) });
        if (entered.attemptId) {
          router.replace(`/exam/take/${entered.attemptId}`);
          return;
        }
        // Still not actually open (edge case: opened then closed again fast) — keep waiting.
        enteringRef.current = false;
      } else if (d.session.status === "ended") {
        setError("Ca thi đã bị đóng trước khi bắt đầu.");
      }
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!user || !code) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [user, code]);

  if (!user) return null;

  return (
    <Layout user={user}>
      <div className="max-w-sm mx-auto mt-16 text-center">
        <div className="pxl-card p-8">
          {error ? (
            <>
              <div className="text-lg font-semibold text-danger mb-2">Không thể vào thi</div>
              <div className="text-sm text-mute mb-6">{error}</div>
              <button className="pxl-btn-outline" onClick={() => router.push("/student/exam")}>← Nhập mã khác</button>
            </>
          ) : (
            <>
              <div className="text-3xl mb-4 animate-pulse">⏳</div>
              <div className="text-lg font-semibold mb-1">{session?.title || "Đang kiểm tra..."}</div>
              <div className="text-sm text-mute mb-1">Ca thi chưa bắt đầu.</div>
              <div className="text-sm text-mute mb-6">
                Vui lòng chờ, hệ thống sẽ tự động đưa bạn vào thi ngay khi giáo viên mở ca thi.
              </div>
              <div className="font-mono text-xs text-accent mb-6">Mã ca thi: {code}</div>
              <button className="pxl-btn-outline text-xs" onClick={() => router.push("/student/exam")}>Hủy, quay lại</button>
            </>
          )}
        </div>

        {!error && session?.notes && (
          <div className="pxl-card p-6 mt-4 text-left border border-warn/40 bg-warn/5">
            <div className="text-sm font-semibold text-warn mb-2">📋 Lưu ý ca thi</div>
            <MarkdownRenderer content={session.notes} className="text-sm text-gray-200" />
          </div>
        )}
      </div>
    </Layout>
  );
}
