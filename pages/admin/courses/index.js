import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useUser, apiFetch } from "../../../lib/useUser";

export default function AdminCourses() {
  const user = useUser(["admin"]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [error, setError] = useState("");

  async function load() {
    try { const d = await apiFetch("/api/courses"); setCourses(d.courses); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function create(e) {
    e.preventDefault();
    try {
      await apiFetch("/api/courses", { method: "POST", body: JSON.stringify(form) });
      setForm({ title: "", description: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Khóa học</h1>
      <p className="text-mute mb-6 text-sm">Admin tạo khóa học, sau đó cấp quyền truy cập cho giáo viên/học sinh.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={create} className="pxl-card p-5 mb-8 grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs text-mute">Tên khóa học</label>
          <input className="pxl-input mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Mô tả</label>
          <input className="pxl-input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="pxl-btn h-[38px]">+ Tạo khóa học</button>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Link key={c.id} href={`/admin/courses/${c.id}`} className="pxl-card p-5 block hover:border-accent transition">
            <div className="font-semibold">{c.title}</div>
            <div className="text-xs text-mute mt-1 line-clamp-2">{c.description}</div>
          </Link>
        ))}
        {courses.length === 0 && <div className="text-mute text-sm">Chưa có khóa học nào.</div>}
      </div>
    </Layout>
  );
}
