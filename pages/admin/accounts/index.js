import { useEffect, useState } from "react";
import Layout from "../../../components/Layout";
import { printReact } from "../../../lib/print";
import { AccountCredentialsDoc } from "../../../components/printDocs";
import { useUser, apiFetch } from "../../../lib/useUser";

const ROLE_LABEL = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };
const ROLE_COLOR = { admin: "bg-danger/20 text-danger", teacher: "bg-accent/20 text-accent", student: "bg-accent2/20 text-accent2" };

function daysLeft(deleteRequestedAt) {
  const deadline = new Date(deleteRequestedAt).getTime() + 5 * 24 * 60 * 60 * 1000;
  const ms = deadline - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function AdminAccounts() {
  const user = useUser(["admin", "teacher"]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", password: "", fullName: "", role: "student" });
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPw, setResetPw] = useState("");

  // Tài khoản vừa được tạo hoặc đổi mật khẩu trong phiên làm việc này — chỉ
  // những tài khoản này mới có mật khẩu dạng plaintext để in ra (mật khẩu
  // không được API trả lại khi tải danh sách, vì lý do bảo mật).
  const [recentCreds, setRecentCreds] = useState({}); // { [id]: {id, username, password, fullName, role} }
  const [printSelected, setPrintSelected] = useState(new Set());

  async function load() {
    try {
      const d = await apiFetch("/api/admin/accounts");
      setAccounts(d.accounts);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  function rememberCreds(entry) {
    setRecentCreds((prev) => ({ ...prev, [entry.id]: entry }));
    setPrintSelected((prev) => new Set(prev).add(entry.id));
  }

  async function createAccount(e) {
    e.preventDefault();
    setError("");
    try {
      const d = await apiFetch("/api/admin/accounts", { method: "POST", body: JSON.stringify(form) });
      rememberCreds({
        id: d.account.id, username: d.account.username, password: form.password,
        fullName: d.account.full_name, role: d.account.role,
      });
      setForm({ username: "", password: "", fullName: "", role: "student" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function resetPassword() {
    try {
      await apiFetch(`/api/admin/accounts/${resetTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset_password", password: resetPw }),
      });
      rememberCreds({
        id: resetTarget.id, username: resetTarget.username, password: resetPw,
        fullName: resetTarget.full_name, role: resetTarget.role,
      });
      setResetTarget(null);
      setResetPw("");
      load();
    } catch (e) { setError(e.message); }
  }

  async function deleteDirect(acc) {
    if (!confirm(`Xóa tài khoản "${acc.full_name}"?`)) return;
    try {
      await apiFetch(`/api/admin/accounts/${acc.id}`, { method: "DELETE" });
      load();
    } catch (e) { setError(e.message); }
  }

  async function requestDeleteAdmin(acc) {
    if (!confirm(`Yêu cầu xóa admin "${acc.full_name}"? Sẽ bị xóa sau 5 ngày nếu họ không đăng nhập lại.`)) return;
    try {
      await apiFetch(`/api/admin/accounts/${acc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "request_delete" }),
      });
      load();
    } catch (e) { setError(e.message); }
  }

  async function cancelDelete(acc) {
    try {
      await apiFetch(`/api/admin/accounts/${acc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel_delete" }),
      });
      load();
    } catch (e) { setError(e.message); }
  }

  function togglePrintSelect(id) {
    setPrintSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function printSelectedAccounts() {
    const chosen = Object.values(recentCreds).filter((c) => printSelected.has(c.id));
    if (chosen.length === 0) return;
    printReact("Danh sach tai khoan", <AccountCredentialsDoc accounts={chosen} />);
  }

  if (!user) return null;

  const printableCount = Object.keys(recentCreds).length;

  return (
    <Layout user={user}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-2xl font-bold">
          {user.role === "teacher" ? "Tài khoản học sinh" : "Quản lý tài khoản"}
        </h1>
        {printableCount > 0 && (
          <button
            className="pxl-btn-outline text-xs px-3 py-1.5 shrink-0"
            disabled={printSelected.size === 0}
            onClick={printSelectedAccounts}
          >
            🖨️ In tài khoản đã chọn ({printSelected.size})
          </button>
        )}
      </div>
      <p className="text-mute mb-6 text-sm">
        {user.role === "admin"
          ? "Tạo, xóa và đổi mật khẩu cho tài khoản admin, giáo viên, học sinh."
          : "Tạo, xóa và đổi mật khẩu cho tài khoản học sinh."}
        {" "}Chỉ có thể in mật khẩu của tài khoản vừa tạo hoặc vừa đổi mật khẩu trong phiên làm việc này.
      </p>

      {error && <div className="mb-4 text-sm text-danger">{error}</div>}

      <form onSubmit={createAccount} className="pxl-card p-5 mb-8 grid md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs text-mute">Tên đăng nhập</label>
          <input className="pxl-input mt-1" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Mật khẩu</label>
          <input className="pxl-input mt-1" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Họ tên</label>
          <input className="pxl-input mt-1" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-mute">Vai trò</label>
          {user.role === "admin" ? (
            <select className="pxl-input mt-1" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="student">Học sinh</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Admin</option>
            </select>
          ) : (
            <input className="pxl-input mt-1 opacity-60" value="Học sinh" disabled />
          )}
        </div>
        <button className="pxl-btn h-[38px]">+ Tạo tài khoản</button>
      </form>

      <div className="pxl-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-panel2 text-mute text-left">
            <tr>
              <th className="p-3 w-8"></th>
              <th className="p-3">Họ tên</th>
              <th className="p-3">Tên đăng nhập</th>
              <th className="p-3">Email</th>
              <th className="p-3">Số điện thoại</th>
              <th className="p-3">Vai trò</th>
              <th className="p-3">Đăng nhập gần nhất</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const printable = !!recentCreds[acc.id];
              return (
                <tr key={acc.id} className="border-t border-line">
                  <td className="p-3">
                    {printable && (
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={printSelected.has(acc.id)}
                        onChange={() => togglePrintSelect(acc.id)}
                        title="Chọn để in"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {acc.full_name}
                    {printable && <span className="pxl-badge bg-accent2/20 text-accent2 ml-2">Mới</span>}
                  </td>
                  <td className="p-3 font-mono text-xs">{acc.username}</td>
                  <td className="p-3 text-xs text-gray-300">{acc.email || "-"}</td>
                  <td className="p-3 text-xs text-gray-300">{acc.phone || "-"}</td>
                  <td className="p-3">
                    <span className={`pxl-badge ${ROLE_COLOR[acc.role]}`}>{ROLE_LABEL[acc.role]}</span>
                  </td>
                  <td className="p-3 text-mute text-xs">
                    {acc.last_login_at ? new Date(acc.last_login_at).toLocaleString("vi-VN") : "Chưa đăng nhập"}
                  </td>
                  <td className="p-3 text-xs">
                    {acc.delete_requested_at ? (
                      <span className="text-warn">
                        Chờ xóa · còn {daysLeft(acc.delete_requested_at)} ngày
                      </span>
                    ) : (
                      <span className="text-mute">Bình thường</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button className="pxl-btn-outline text-xs px-2 py-1"
                        onClick={() => setResetTarget(acc)}>Đổi mật khẩu</button>
                      {acc.role === "admin" ? (
                        acc.delete_requested_at ? (
                          <button className="pxl-btn-outline text-xs px-2 py-1"
                            onClick={() => cancelDelete(acc)}>Hủy yêu cầu xóa</button>
                        ) : (
                          acc.id !== user.id && (
                            <button className="pxl-btn-danger text-xs px-2 py-1"
                              onClick={() => requestDeleteAdmin(acc)}>Yêu cầu xóa</button>
                          )
                        )
                      ) : (
                        <button className="pxl-btn-danger text-xs px-2 py-1"
                          onClick={() => deleteDirect(acc)}>Xóa</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="pxl-card p-6 w-full max-w-sm">
            <div className="font-semibold mb-4">Đổi mật khẩu cho {resetTarget.full_name}</div>
            <input className="pxl-input mb-4" placeholder="Mật khẩu mới"
              value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoFocus />
            <div className="flex gap-2 justify-end">
              <button className="pxl-btn-outline" onClick={() => { setResetTarget(null); setResetPw(""); }}>Hủy</button>
              <button className="pxl-btn" onClick={resetPassword}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
