import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Head from "next/head";
import { dashboardPath } from "../lib/useUser";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  // If already logged in (e.g. came back from the homepage), skip the form
  // entirely instead of asking to log in again.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) router.replace(dashboardPath(d.user.role));
        else setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(dashboardPath(data.user.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <Head>
        <title>Đăng nhập · Pixel LMS</title>
      </Head>
      <form onSubmit={submit} className="pxl-card w-full max-w-sm p-8">
        <Link href="/" className="text-2xl font-bold mb-1 block hover:text-accent">Pixel LMS</Link>
        <div className="text-mute text-sm mb-6">Đăng nhập để tiếp tục</div>
        {error && <div className="mb-4 text-sm text-danger">{error}</div>}
        <label className="text-xs text-mute">Tên đăng nhập</label>
        <input className="pxl-input mt-1 mb-4" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <label className="text-xs text-mute">Mật khẩu</label>
        <input className="pxl-input mt-1 mb-6" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="pxl-btn w-full" disabled={loading}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
    </div>
  );
}
