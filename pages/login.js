import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      const role = data.user.role;
      router.push(role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink">
      <form onSubmit={submit} className="pxl-card w-full max-w-sm p-8">
        <div className="text-2xl font-bold mb-1">Pixel LMS</div>
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
