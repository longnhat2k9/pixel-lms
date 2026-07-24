import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../../components/Layout";
import { useUser, apiFetch } from "../../../lib/useUser";

export default function StudentCourses() {
  const user = useUser(["student"]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/courses").then((d) => setCourses(d.courses)).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Khóa học của tôi</h1>
      <p className="text-mute mb-6 text-sm">Các khóa học bạn được cấp quyền truy cập.</p>
      {error && <div className="mb-4 text-sm text-danger">{error}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        {courses.map((c) => (
          <Link key={c.id} href={`/student/courses/${c.id}`} className="pxl-card p-5 block hover:border-accent transition">
            <div className="font-semibold">{c.title}</div>
            <div className="text-xs text-mute mt-1 line-clamp-2">{c.description}</div>
          </Link>
        ))}
        {courses.length === 0 && <div className="text-mute text-sm">Bạn chưa được cấp quyền vào khóa học nào.</div>}
      </div>
    </Layout>
  );
}
