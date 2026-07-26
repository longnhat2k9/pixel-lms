import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

function emptyForm() {
  return { title: "", excerpt: "", content: "", published: true };
}

export default function PostsPage() {
  const user = useUser(["admin", "teacher"]);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    try { const d = await apiFetch("/api/posts"); setPosts(d.posts); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function save(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/api/posts/${editingId}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await apiFetch("/api/posts", { method: "POST", body: JSON.stringify(form) });
      }
      setForm(emptyForm());
      setEditingId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  function edit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, excerpt: p.excerpt, content: p.content, published: p.published });
  }

  async function remove(id) {
    if (!confirm("Xóa bài viết này?")) return;
    try { await apiFetch(`/api/posts/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e.message); }
  }

  async function togglePublish(p) {
    try { await apiFetch(`/api/posts/${p.id}`, { method: "PUT", body: JSON.stringify({ published: !p.published }) }); load(); }
    catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Bài viết</h1>
      <p className="text-mute mb-6 text-sm">Bài viết đã đăng sẽ hiển thị trên trang chủ.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={save} className="pxl-card p-5 mb-8 space-y-3">
        <input className="pxl-input" placeholder="Tiêu đề" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="pxl-input" placeholder="Tóm tắt ngắn (tùy chọn)" value={form.excerpt}
          onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />

        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <textarea className="pxl-input font-mono text-sm" rows={10} placeholder="Nội dung (hỗ trợ Markdown & LaTeX)" value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })} required />
            <div className="text-xs text-mute mt-2">
              Hỗ trợ Markdown & LaTeX: chèn ảnh bằng <code>![mô tả](url)</code>, công thức bằng <code>$...$</code> hoặc <code>$$...$$</code>.
            </div>
          </div>
          <div className="lg:sticky lg:top-5 self-start">
            <div className="text-xs text-mute mb-2">Xem trước</div>
            <div className="pxl-card p-5 bg-panel2">
              {form.content ? (
                <MarkdownRenderer content={form.content} className="text-gray-200" />
              ) : (
                <span className="text-mute italic text-sm">(chưa có nội dung)</span>
              )}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          Đăng công khai trên trang chủ
        </label>
        <div className="flex gap-2">
          <button className="pxl-btn">{editingId ? "Lưu chỉnh sửa" : "+ Đăng bài viết"}</button>
          {editingId && (
            <button type="button" className="pxl-btn-outline" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Hủy</button>
          )}
        </div>
      </form>

      <div className="space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="pxl-card p-5 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">{p.title}</div>
              <div className="text-xs text-mute mt-1">{p.author_name_snapshot} · {new Date(p.created_at).toLocaleDateString("vi-VN")}</div>
            </div>
            <div className="flex gap-2 shrink-0 items-center">
              <span className={`pxl-badge ${p.published ? "bg-accent2/20 text-accent2" : "bg-panel2 text-mute"}`}>
                {p.published ? "Đã đăng" : "Nháp"}
              </span>
              <button className="text-accent text-xs" onClick={() => togglePublish(p)}>{p.published ? "Ẩn" : "Đăng"}</button>
              <button className="text-accent text-xs" onClick={() => edit(p)}>Sửa</button>
              <button className="text-danger text-xs" onClick={() => remove(p.id)}>Xóa</button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <div className="text-mute text-sm">Chưa có bài viết nào.</div>}
      </div>
    </Layout>
  );
}
