import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/useUser";
import MarkdownRenderer from "./MarkdownRenderer";

const COURSE_PATH = { admin: "/admin/courses", teacher: "/teacher/courses", student: "/student/courses" };
const SUBMISSIONS_PATH = { admin: "/teacher/submissions", teacher: "/teacher/submissions", student: "/student/submissions" };

const ATTEMPT_STATUS_LABEL = {
  in_progress: "Đang làm", submitted: "Đã nộp", cancelled: "Đã hủy", force_ended: "Bị buộc kết thúc",
};
const ATTEMPT_STATUS_COLOR = {
  in_progress: "bg-warn/20 text-warn",
  submitted: "bg-accent2/20 text-accent2",
  cancelled: "bg-danger/20 text-danger",
  force_ended: "bg-danger/20 text-danger",
};

export default function Overview({ user }) {
  const [posts, setPosts] = useState(null);
  const [courses, setCourses] = useState(null);
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiFetch("/api/posts"),
      apiFetch("/api/courses"),
      apiFetch("/api/submissions"),
    ])
      .then(([p, c, a]) => {
        setPosts(p.posts.slice(0, 4));
        setCourses(c.courses.slice(0, 3));
        setAttempts(a.attempts.slice(0, 3));
      })
      .catch((e) => setError(e.message));
  }, [user]);

  const coursePath = COURSE_PATH[user?.role] || "/";
  const submissionsPath = SUBMISSIONS_PATH[user?.role] || "/";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Chào, {user?.fullName}</h1>
      <p className="text-mute text-sm mb-8">Đây là tổng quan hoạt động gần đây của bạn trên Pixel LMS.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Bài viết mới nhất</h2>
          <Link href="/" className="text-xs text-accent">Xem tất cả →</Link>
        </div>
        {posts === null ? (
          <div className="text-mute text-sm">Đang tải...</div>
        ) : posts.length === 0 ? (
          <div className="text-mute text-sm">Chưa có bài viết nào.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {posts.map((p) => (
              <Link key={p.id} href={`/posts/${p.id}`} className="pxl-card p-4 block hover:border-accent transition">
                <div className="font-medium text-sm mb-1">{p.title}</div>
                <div className="text-xs text-mute mb-2">
                  {p.author_name_snapshot} · {new Date(p.created_at).toLocaleDateString("vi-VN")}
                </div>
                <div className="text-xs text-gray-400 line-clamp-2">
                  <MarkdownRenderer content={p.excerpt || p.content.slice(0, 160)} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Khóa học tham gia gần đây</h2>
          <Link href={coursePath} className="text-xs text-accent">Xem tất cả →</Link>
        </div>
        {courses === null ? (
          <div className="text-mute text-sm">Đang tải...</div>
        ) : courses.length === 0 ? (
          <div className="text-mute text-sm">Chưa tham gia khóa học nào.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {courses.map((c) => (
              <Link key={c.id} href={`${coursePath}/${c.id}`} className="pxl-card p-4 block hover:border-accent transition">
                <div className="font-medium text-sm mb-1">{c.title}</div>
                <div className="text-xs text-mute line-clamp-2">{c.description}</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Bài làm gần đây</h2>
          <Link href={submissionsPath} className="text-xs text-accent">Xem tất cả →</Link>
        </div>
        {attempts === null ? (
          <div className="text-mute text-sm">Đang tải...</div>
        ) : attempts.length === 0 ? (
          <div className="text-mute text-sm">Chưa có bài làm nào.</div>
        ) : (
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="pxl-card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {a.exam_title_snapshot}
                    {a.kind === "practice" && <span className="pxl-badge bg-accent/20 text-accent ml-2">Luyện tập</span>}
                  </div>
                  <div className="text-xs text-mute mt-0.5">
                    {user.role !== "student" && `${a.student_name_snapshot} · `}
                    {new Date(a.started_at).toLocaleString("vi-VN")}
                  </div>
                </div>
                <span className={`pxl-badge shrink-0 ${ATTEMPT_STATUS_COLOR[a.status]}`}>{ATTEMPT_STATUS_LABEL[a.status]}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
