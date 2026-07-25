import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { useUser, apiFetch } from "../../lib/useUser";

const COURSE_PATH = { admin: "/admin/courses", teacher: "/teacher/courses", student: "/student/courses" };

const STATUS_LABEL = { scheduled: "Đã lên lịch", active: "Đang diễn ra", ended: "Đã đóng" };

export default function LessonPage() {
  const user = useUser(["admin", "teacher", "student"]);
  const router = useRouter();
  const { id } = router.query;

  const [lesson, setLesson] = useState(null);
  const [meta, setMeta] = useState({ courseTitle: "", chapterTitle: "", canEdit: false });
  const [linkedSessions, setLinkedSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [entering, setEntering] = useState(null);

  async function load() {
    try {
      const d = await apiFetch(`/api/lessons/${id}`);
      setLesson(d.lesson);
      setMeta({ courseTitle: d.courseTitle, chapterTitle: d.chapterTitle, canEdit: d.canEdit });
      setDraft({ title: d.lesson.title, content: d.lesson.content });
      const ex = await apiFetch(`/api/lessons/${id}/exams`);
      setLinkedSessions(ex.sessions);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => { if (user && id) load(); }, [user, id]);

  async function loadAllSessions() {
    try { const d = await apiFetch("/api/exams/sessions"); setAllSessions(d.sessions); }
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

  async function toggleSessionLink(sessionId) {
    const current = new Set(linkedSessions.map((s) => s.id));
    if (current.has(sessionId)) current.delete(sessionId); else current.add(sessionId);
    try {
      await apiFetch(`/api/lessons/${id}/exams`, {
        method: "POST", body: JSON.stringify({ sessionIds: Array.from(current) }),
      });
      const ex = await apiFetch(`/api/lessons/${id}/exams`);
      setLinkedSessions(ex.sessions);
    } catch (e) { setError(e.message); }
  }

  async function startPractice(session) {
    setEntering(session.id);
    try {
      const d = await apiFetch("/api/exams/enter", { method: "POST", body: JSON.stringify({ code: session.session_code }) });
      if (d.waiting) {
        router.push(`/exam/waiting/${d.sessionCode}`);
      } else {
        router.push(`/exam/take/${d.attemptId}`);
      }
    } catch (e) {
      setError(e.message);
      setEntering(null);
    }
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
                  onClick={() => { setShowSessionPicker(!showSessionPicker); if (!allSessions.length) loadAllSessions(); }}
                >
                  {showSessionPicker ? "Đóng" : "Gán đề thi"}
                </button>
              )}
            </div>

            {showSessionPicker && (
              <div className="mb-4 grid gap-2 max-h-56 overflow-y-auto border-b border-line pb-4">
                {allSessions.length === 0 && <div className="text-xs text-mute">Chưa có ca thi nào. Tạo ca thi ở mục "Thi" trước.</div>}
                {allSessions.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm bg-panel2 rounded-pixel px-3 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkedSessions.some((l) => l.id === s.id)}
                      onChange={() => toggleSessionLink(s.id)}
                    />
                    <span>{s.title}</span>
                    <span className="text-xs text-mute font-mono ml-auto">{s.session_code}</span>
                  </label>
                ))}
              </div>
            )}

            {linkedSessions.length === 0 ? (
              <div className="text-sm text-mute">Chưa có đề thi thực hành nào được gán cho bài học này.</div>
            ) : (
              <div className="space-y-2">
                {linkedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-panel2 rounded-pixel px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{s.title}</div>
                      <div className="text-xs text-mute">{STATUS_LABEL[s.status]} · {s.time_limit_minutes} phút</div>
                    </div>
                    {user.role === "student" ? (
                      <button
                        className="pxl-btn text-xs px-3 py-1.5"
                        disabled={s.status === "ended" || entering === s.id}
                        onClick={() => startPractice(s)}
                      >
                        {entering === s.id
                          ? "Đang vào..."
                          : s.status === "active"
                          ? "Bắt đầu làm bài"
                          : s.status === "scheduled"
                          ? "Chờ mở ca thi"
                          : "Đã đóng"}
                      </button>
                    ) : (
                      <span className="text-xs text-mute font-mono">{s.session_code}</span>
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
