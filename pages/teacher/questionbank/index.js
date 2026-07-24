import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useUser, apiFetch } from "../../../lib/useUser";

export default function QuestionBank() {
  const user = useUser(["admin", "teacher"]);
  const [papers, setPapers] = useState([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [error, setError] = useState("");

  async function load() {
    try { const d = await apiFetch("/api/questionbank/papers"); setPapers(d.papers); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function create(e) {
    e.preventDefault();
    try {
      await apiFetch("/api/questionbank/papers", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm("Xóa đề thi này?")) return;
    try { await apiFetch(`/api/questionbank/papers/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Đề thi</h1>
      <p className="text-mute mb-6 text-sm">Chỉ giáo viên và admin thấy được mục này.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={create} className="pxl-card p-5 mb-8 grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs text-mute">Tên đề thi</label>
          <input className="pxl-input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Mô tả</label>
          <input className="pxl-input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="pxl-btn h-[38px]">+ Tạo đề thi</button>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        {papers.map((p) => (
          <div key={p.id} className="pxl-card p-5">
            <Link href={`/teacher/questionbank/${p.id}`} className="font-semibold hover:text-accent">{p.title}</Link>
            <div className="text-xs text-mute mt-1 mb-3 line-clamp-2">{p.description}</div>
            <button className="text-danger text-xs" onClick={() => remove(p.id)}>Xóa</button>
          </div>
        ))}
        {papers.length === 0 && <div className="text-mute text-sm">Chưa có đề thi nào.</div>}
      </div>
    </Layout>
  );
}
