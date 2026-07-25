import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import MarkdownRenderer from "../../components/MarkdownRenderer";
import { dashboardPath } from "../../lib/useUser";

export default function PostDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(undefined); // undefined = checking, null = anonymous

  useEffect(() => {
    if (!id) return;
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((d) => (d.post ? setPost(d.post) : setError(d.error || "Không tìm thấy bài viết.")));
  }, [id]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null));
  }, []);

  const content = (
    <article className={user ? "max-w-3xl" : "max-w-3xl mx-auto px-6 py-14"}>
      {error && <div className="text-danger">{error}</div>}
      {post && (
        <>
          <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
          <div className="text-xs text-mute mb-8">
            {post.author_name_snapshot} · {new Date(post.created_at).toLocaleDateString("vi-VN")}
          </div>
          <MarkdownRenderer content={post.content} className="text-gray-200" />
        </>
      )}
    </article>
  );

  // Still checking session — avoid a flash of the wrong chrome.
  if (user === undefined) return null;

  // Logged in: keep the dashboard navigation instead of dropping to the
  // public header, so "← quay lại" and the sidebar/topbar stay in place.
  if (user) {
    return (
      <Layout user={user}>
        <Link href={dashboardPath(user.role)} className="text-sm text-mute hover:text-accent mb-4 inline-block">
          ← Quay lại tổng quan
        </Link>
        {content}
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-gray-100">
      <header className="border-b border-line">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">Pixel LMS</Link>
          <Link href="/login" className="pxl-btn">Đăng nhập</Link>
        </div>
      </header>
      {content}
    </div>
  );
}
