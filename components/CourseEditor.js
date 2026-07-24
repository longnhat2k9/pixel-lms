import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/useUser";

export default function CourseEditor({ courseId, isAdmin }) {
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newLessonTitle, setNewLessonTitle] = useState({}); // { [chapterId]: title }
  const [access, setAccess] = useState(null);
  const [showAccess, setShowAccess] = useState(false);

  async function load() {
    try {
      const d = await apiFetch(`/api/courses/${courseId}`);
      setCourse(d.course);
      setChapters(d.chapters);
    } catch (e) { setError(e.message); }
  }

  async function loadAccess() {
    try {
      const d = await apiFetch(`/api/courses/${courseId}/access`);
      setAccess(d.accounts);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (courseId) load(); }, [courseId]);

  async function addChapter(e) {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    try {
      await apiFetch(`/api/courses/${courseId}/chapters`, {
        method: "POST", body: JSON.stringify({ title: newChapterTitle }),
      });
      setNewChapterTitle("");
      load();
    } catch (e) { setError(e.message); }
  }

  async function deleteChapter(id) {
    if (!confirm("Xóa chương này (và toàn bộ bài học bên trong)?")) return;
    try { await apiFetch(`/api/chapters/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e.message); }
  }

  async function addLesson(chapterId) {
    const title = newLessonTitle[chapterId];
    if (!title?.trim()) return;
    try {
      await apiFetch(`/api/chapters/${chapterId}`, {
        method: "POST", body: JSON.stringify({ title, content: "" }),
      });
      setNewLessonTitle({ ...newLessonTitle, [chapterId]: "" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function deleteLesson(id) {
    if (!confirm("Xóa bài học này?")) return;
    try { await apiFetch(`/api/lessons/${id}`, { method: "DELETE" }); load(); }
    catch (e) { setError(e.message); }
  }

  async function toggleAccess(userId) {
    const current = new Set(access.filter((a) => a.granted).map((a) => a.id));
    if (current.has(userId)) current.delete(userId); else current.add(userId);
    try {
      await apiFetch(`/api/courses/${courseId}/access`, {
        method: "POST", body: JSON.stringify({ userIds: Array.from(current) }),
      });
      loadAccess();
    } catch (e) { setError(e.message); }
  }

  if (!course) return <div className="text-mute">Đang tải...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-mute text-sm mb-6">{course.description}</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      {isAdmin && (
        <div className="pxl-card p-5 mb-8">
          <button className="pxl-btn-outline text-sm"
            onClick={() => { setShowAccess(!showAccess); if (!access) loadAccess(); }}>
            {showAccess ? "Ẩn danh sách quyền truy cập" : "Quản lý quyền truy cập khóa học"}
          </button>
          {showAccess && (
            <div className="mt-4 grid md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {access === null && <div className="text-mute text-sm">Đang tải...</div>}
              {access?.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm bg-panel2 rounded-pixel px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={a.granted} onChange={() => toggleAccess(a.id)} />
                  <span>{a.full_name}</span>
                  <span className="text-xs text-mute ml-auto">{a.role === "teacher" ? "GV" : "HS"}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={addChapter} className="flex gap-2 mb-6">
        <input className="pxl-input" placeholder="Tên chương mới"
          value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} />
        <button className="pxl-btn whitespace-nowrap">+ Thêm chương</button>
      </form>

      <div className="space-y-4">
        {chapters.map((ch) => (
          <div key={ch.id} className="pxl-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{ch.title}</div>
              <button className="text-danger text-xs" onClick={() => deleteChapter(ch.id)}>Xóa chương</button>
            </div>

            <div className="space-y-2 mb-3">
              {ch.lessons.map((l) => (
                <div key={l.id} className="bg-panel2 rounded-pixel px-4 py-3 flex items-center justify-between gap-3">
                  <Link href={`/lessons/${l.id}`} className="text-sm font-medium hover:text-accent min-w-0 truncate">
                    {l.title}
                  </Link>
                  <div className="flex gap-3 shrink-0">
                    <Link href={`/lessons/${l.id}`} className="text-accent text-xs">Mở bài học</Link>
                    <button className="text-danger text-xs" onClick={() => deleteLesson(l.id)}>Xóa</button>
                  </div>
                </div>
              ))}
              {ch.lessons.length === 0 && <div className="text-xs text-mute">Chưa có bài học.</div>}
            </div>

            <div className="flex gap-2">
              <input className="pxl-input" placeholder="Tên bài học mới"
                value={newLessonTitle[ch.id] || ""}
                onChange={(e) => setNewLessonTitle({ ...newLessonTitle, [ch.id]: e.target.value })} />
              <button className="pxl-btn-outline text-sm whitespace-nowrap" onClick={() => addLesson(ch.id)}>+ Thêm bài học</button>
            </div>
          </div>
        ))}
        {chapters.length === 0 && <div className="text-mute text-sm">Chưa có chương nào.</div>}
      </div>
    </div>
  );
}
