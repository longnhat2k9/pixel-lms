import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiFetch } from "../lib/useUser";

const NAV = {
  admin: [
    { href: "/admin", label: "Tổng quan" },
    { href: "/admin/accounts", label: "Tài khoản" },
    { href: "/admin/courses", label: "Khóa học" },
    { href: "/teacher/questionbank", label: "Đề thi" },
    { href: "/teacher/exams", label: "Thi" },
    { href: "/teacher/submissions", label: "Bài làm" },
    { href: "/teacher/posts", label: "Bài viết" },
  ],
  teacher: [
    { href: "/teacher", label: "Tổng quan" },
    { href: "/teacher/courses", label: "Khóa học" },
    { href: "/teacher/questionbank", label: "Đề thi" },
    { href: "/teacher/exams", label: "Thi" },
    { href: "/teacher/submissions", label: "Bài làm" },
    { href: "/teacher/posts", label: "Bài viết" },
    { href: "/admin/accounts", label: "Tài khoản học sinh" },
  ],
  student: [
    { href: "/student", label: "Tổng quan" },
    { href: "/student/courses", label: "Khóa học" },
    { href: "/student/exam", label: "Vào thi" },
    { href: "/student/submissions", label: "Bài làm của tôi" },
  ],
};

const ROLE_LABEL = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };

function WelcomeLine({ user, profile, className = "" }) {
  return (
    <div className={`relative group ${className}`}>
      <Link href="/account" className="block text-sm text-gray-200 hover:text-accent truncate">
        Welcome, {user?.username}
      </Link>
      <div className="pointer-events-none absolute bottom-full left-0 mb-2 w-56 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        <div className="pxl-card p-3 text-xs shadow-lg">
          <div className="font-semibold text-gray-100">{profile?.full_name || user?.fullName}</div>
          <div className="text-mute mt-1">Tên đăng nhập: {profile?.username || user?.username}</div>
          <div className="text-mute">Email: {profile?.email || "Chưa cập nhật"}</div>
          <div className="text-mute">SĐT: {profile?.phone || "Chưa cập nhật"}</div>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ user, children }) {
  const router = useRouter();
  const nav = NAV[user?.role] || [];
  const [profile, setProfile] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiFetch("/api/account/profile").then((d) => setProfile(d.profile)).catch(() => {});
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const roleLabel = ROLE_LABEL[user?.role] || "";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-gray-100">
      {/* Mobile top bar */}
      <div className="md:hidden border-b border-line bg-panel">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-bold text-lg tracking-tight">Pixel LMS</div>
            <div className="text-xs text-mute">{roleLabel}</div>
          </div>
          <button
            className="pxl-btn-outline text-sm px-3 py-1.5"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? "Đóng ✕" : "Menu ☰"}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-line px-4 py-3 space-y-3">
            <WelcomeLine user={user} profile={profile} />
            <nav className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-pixel text-sm ${
                    router.pathname === item.href
                      ? "bg-accent text-ink font-semibold"
                      : "text-gray-300 hover:bg-panel2"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-panel2 rounded-pixel"
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-line bg-panel flex-col">
        <div className="p-5 border-b border-line">
          <div className="font-bold text-lg tracking-tight">Pixel LMS</div>
          <div className="text-xs text-mute mt-0.5">{roleLabel}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-pixel text-sm ${
                router.pathname === item.href
                  ? "bg-accent text-ink font-semibold"
                  : "text-gray-300 hover:bg-panel2"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-line space-y-2">
          <WelcomeLine user={user} profile={profile} className="px-3" />
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-panel2 rounded-pixel"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
