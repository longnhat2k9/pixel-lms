import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

const COURSE_PATH = { admin: "/admin/courses", teacher: "/teacher/courses", student: "/student/courses" };

export default function LessonPage() {
  const user = useUser(["admin", "teacher", "student"]);
  const router = useRouter();
  const { id } = router.query;

  const [lesson, setLesson] = useState(null);
  const [meta, setMeta] = useState({ courseTitle: "", chapterTitle: "", canEdit: false });
  const [linkedPapers, setLinkedPapers] = useState([]);
  const [allPapers, setAllPapers] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [showPaperPicker, setShowPaperPicker] = useState(false);

  async function load() {
    try {
      const d = await apiFetch(`/api/lessons/${id}`);
      setLesson(d.lesson);
      setMeta({ courseTitle: d.courseTitle, chapterTitle: d.chapterTitle, canEdit: d.canEdit });
      setDraft({ title: d.lesson.title, content: d.lesson.content });
      const p = await apiFetch(`/api/lessons/${id}/practice`);
      setLinkedPapers(p.papers);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (user && id) load(); }, [user, id]);

  async function loadAllPapers() {
    try { const d = await apiFetch("/api/questionbank/papers"); setAllPapers(d.papers); }
    catch (e) { setError(e.message); }
  }

  async function saveContent() {
    try {
      await apiFetch(`/api/lessons/${id}`, { method: "PUT", body: JSON.stringify(draft) });
      setEditing(false);
      load();
    } catch (e) { setError(e.message); }
  }

  async function deleteLesson() {
    if (!confirm("Xóa bài học này?")) return;
    try {
      await apiFetch(`/api/lessons/${id}`, { method: "DELETE" });
      router.push(`${COURSE_PATH[user.role]}/${lesson.course_id}`);
    } catch (e) { setError(e.message); }
  }

  async function togglePaperLink(paperId) {
    const current = new Set(linkedPapers.map((p) => p.id));
    if (current.has(paperId)) current.delete(paperId); else current.add(paperId);
    try {
      await apiFetch(`/api/lessons/${id}/practice`, {
        method: "POST", body: JSON.stringify({ paperIds: Array.from(current) }),
      });
      const p = await apiFetch(`/api/lessons/${id}/practice`);
      setLinkedPapers(p.papers);
    } catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <button
        className="text-sm text-mute hover:text-accent mb-4"
        onClick={() => router.push(`${COURSE_PATH[user.role]}/${lesson?.course_id || ""}`)}
      >
        ← Quay lại khóa học
      </button>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}
      {!lesson ? (
        <div className="text-mute">Đang tải...</div>
      ) : (
        <div className="max-w-2xl">
          <div className="text-xs text-mute mb-1">{meta.courseTitle} · {meta.chapterTitle}</div>

          {editing ? (
            <div className="space-y-3 mb-8">
              <input className="pxl-input text-xl font-bold" value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <textarea className="pxl-input font-mono text-sm" rows={14} value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
              <div className="text-xs text-mute">
                Hỗ trợ Markdown & LaTeX: chèn ảnh bằng <code>![mô tả](url)</code>, công thức bằng <code>$...$</code> hoặc <code>$$...$$</code>.
              </div>
              <div className="flex gap-2">
                <button className="pxl-btn" onClick={saveContent}>Lưu</button>
                <button className="pxl-btn-outline" onClick={() => { setEditing(false); setDraft({ title: lesson.title, content: lesson.content }); }}>Hủy</button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold">{lesson.title}</h1>
                {meta.canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button className="pxl-btn-outline text-xs px-3 py-1.5" onClick={() => setEditing(true)}>Sửa nội dung</button>
                    <button className="pxl-btn-danger text-xs px-3 py-1.5" onClick={deleteLesson}>Xóa bài học</button>
                  </div>
                )}
              </div>
              <MarkdownRenderer content={lesson.content} className="text-gray-200 mb-10" />
            </>
          )}

          <div className="pxl-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-sm">📝 Thực hành</div>
              {meta.canEdit && (
                <button
                  className="pxl-btn-outline text-xs px-2 py-1"
                  onClick={() => { setShowPaperPicker(!showPaperPicker); if (!allPapers.length) loadAllPapers(); }}
                >
                  {showPaperPicker ? "Đóng" : "Gán đề thi"}
                </button>
              )}
            </div>

            {meta.canEdit && (
              <div className="text-xs text-mute mb-3">
                Học sinh có thể bấm làm bài trực tiếp, không giới hạn số lần làm lại (khác với ca thi ở mục "Thi"). Mỗi lần nộp đều được ghi lại trong mục Bài làm.
              </div>
            )}

            {showPaperPicker && (
              <div className="mb-4 grid gap-2 max-h-56 overflow-y-auto border-b border-line pb-4">
                {allPapers.length === 0 && <div className="text-xs text-mute">Chưa có đề thi nào. Tạo đề thi ở mục "Đề thi" trước.</div>}
                {allPapers.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm bg-panel2 rounded-pixel px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedPapers.some((l) => l.id === p.id)}
                      onChange={() => togglePaperLink(p.id)}
                    />
                    <span>{p.title}</span>
                  </label>
                ))}
              </div>
            )}

            {linkedPapers.length === 0 ? (
              <div className="text-sm text-mute">Chưa có đề thi luyện tập nào được gán cho bài học này.</div>
            ) : (
              <div className="space-y-2">
                {linkedPapers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-panel2 rounded-pixel px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-mute">{p.question_count} câu hỏi</div>
                    </div>
                    {user.role === "student" ? (
                      <Link href={`/practice/${p.id}`} className="pxl-btn text-xs px-3 py-1.5">
                        Làm bài
                      </Link>
                    ) : (
                      <Link href={`/practice/${p.id}`} className="text-xs text-accent">Xem thử</Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
