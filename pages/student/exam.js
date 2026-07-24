import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { useUser, apiFetch } from "../../lib/useUser";

export default function StudentExamEntry() {
  const user = useUser(["student"]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function enter(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const d = await apiFetch("/api/exams/enter", { method: "POST", body: JSON.stringify({ code }) });
      router.push(`/exam/take/${d.attemptId}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <div className="max-w-sm mx-auto mt-16">
        <div className="pxl-card p-8 text-center">
          <div className="text-lg font-semibold mb-1">Vào thi</div>
          <div className="text-mute text-sm mb-6">Nhập mã ca thi giáo viên cung cấp.</div>
          {error && <div className="mb-4 text-sm text-danger">{error}</div>}
          <form onSubmit={enter}>
            <input
              className="pxl-input text-center text-xl tracking-widest font-mono mb-4"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MÃ CA THI"
              autoFocus
            />
            <button className="pxl-btn w-full" disabled={loading}>
              {loading ? "Đang kiểm tra..." : "Vào thi"}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
