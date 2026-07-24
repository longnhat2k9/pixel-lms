import { useEffect, useState } from "react";
import Link from "next/link";
import MarkdownRenderer from "../components/MarkdownRenderer";
import { dashboardPath } from "../lib/useUser";

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null); // null = not logged in (default, no redirect here)

  useEffect(() => {
    fetch("/api/posts").then((r) => r.json()).then((d) => setPosts(d.posts || []));
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="min-h-screen bg-ink text-gray-100">
      <header className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="font-bold text-lg">Pixel LMS</div>
          {user ? (
            <Link href={dashboardPath(user.role)} className="pxl-btn">
              Vào hệ thống ({user.fullName})
            </Link>
          ) : (
            <Link href="/login" className="pxl-btn">Đăng nhập</Link>
          )}
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-14">
        <h1 className="text-3xl font-bold mb-2">Bài viết mới</h1>
        <p className="text-mute mb-8">Tin tức và cập nhật từ hệ thống.</p>

        {posts.length === 0 && <div className="text-mute">Chưa có bài viết nào.</div>}

        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <Link key={p.id} href={`/posts/${p.id}`} className="pxl-card p-5 block hover:border-accent transition">
              <h2 className="font-semibold text-lg mb-1">{p.title}</h2>
              <div className="text-xs text-mute mb-3">
                {p.author_name_snapshot} · {new Date(p.created_at).toLocaleDateString("vi-VN")}
              </div>
              <div className="text-sm text-gray-300 line-clamp-4">
                <MarkdownRenderer content={p.excerpt || p.content.slice(0, 240)} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
