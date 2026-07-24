import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useUser, apiFetch } from "../../../lib/useUser";

export default function StudentCourseDetail() {
  const user = useUser(["student"]);
  const router = useRouter();
  const { id } = router.query;
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !id) return;
    apiFetch(`/api/courses/${id}`)
      .then((d) => { setCourse(d.course); setChapters(d.chapters); })
      .catch((e) => setError(e.message));
  }, [user, id]);

  if (!user) return null;

  return (
    <Layout user={user}>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}
      {!course ? (
        <div className="text-mute">Đang tải...</div>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-1">{course.title}</h1>
          <p className="text-mute mb-6 text-sm">{course.description}</p>
          <div className="space-y-4">
            {chapters.map((ch) => (
              <div key={ch.id} className="pxl-card p-5">
                <div className="font-semibold mb-3">{ch.title}</div>
                <div className="space-y-2">
                  {ch.lessons.map((l) => (
                    <Link
                      key={l.id}
                      href={`/lessons/${l.id}`}
                      className="block bg-panel2 rounded-pixel px-4 py-3 text-sm font-medium hover:text-accent transition"
                    >
                      {l.title}
                    </Link>
                  ))}
                  {ch.lessons.length === 0 && <div className="text-xs text-mute">Chưa có bài học.</div>}
                </div>
              </div>
            ))}
            {chapters.length === 0 && <div className="text-mute text-sm">Chưa có nội dung.</div>}
          </div>
        </>
      )}
    </Layout>
  );
}
