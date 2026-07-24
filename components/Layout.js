import Link from "next/link";
import { useRouter } from "next/router";

const NAV = {
  admin: [
    { href: "/admin", label: "Tài khoản" },
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
    { href: "/admin", label: "Tài khoản học sinh" },
  ],
  student: [
    { href: "/student", label: "Tổng quan" },
    { href: "/student/courses", label: "Khóa học" },
    { href: "/student/exam", label: "Vào thi" },
    { href: "/student/submissions", label: "Bài làm của tôi" },
  ],
};

export default function Layout({ user, children }) {
  const router = useRouter();
  const nav = NAV[user?.role] || [];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const roleLabel = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" }[user?.role] || "";

  return (
    <div className="min-h-screen flex bg-ink text-gray-100">
      <aside className="w-60 shrink-0 border-r border-line bg-panel flex flex-col">
        <div className="p-5 border-b border-line">
          <div className="font-bold text-lg tracking-tight">Pixel LMS</div>
          <div className="text-xs text-mute mt-0.5">{user?.fullName} · {roleLabel}</div>
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
        <div className="p-3 border-t border-line">
          <Link href="/" className="block px-3 py-2 text-sm text-mute hover:text-gray-200">
            ← Trang chủ
          </Link>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-panel2 rounded-pixel"
          >
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
