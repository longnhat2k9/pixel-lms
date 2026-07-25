import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useUser, apiFetch } from "../../lib/useUser";

const ROLE_LABEL = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };

export default function AccountPage() {
  const user = useUser(["admin", "teacher", "student"]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  async function load() {
    try {
      const d = await apiFetch("/api/account/profile");
      setProfile(d.profile);
      setForm({ fullName: d.profile.full_name, email: d.profile.email || "", phone: d.profile.phone || "" });
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      await apiFetch("/api/account/profile", { method: "PUT", body: JSON.stringify(form) });
      setSaved(true);
      load();
    } catch (e) { setError(e.message); }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSaved(false);
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("Mật khẩu mới nhập lại không khớp.");
      return;
    }
    try {
      await apiFetch("/api/account/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwSaved(true);
    } catch (e) { setPwError(e.message); }
  }

  if (!user) return null;

  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Tài khoản của tôi</h1>
      <p className="text-mute mb-8 text-sm">Cập nhật thông tin cá nhân và mật khẩu đăng nhập.</p>

      {!profile ? (
        <div className="text-mute">Đang tải...</div>
      ) : (
        <div className="max-w-xl space-y-8">
          <div className="pxl-card p-5">
            <div className="text-xs text-mute mb-3">
              Tên đăng nhập <span className="text-gray-300 font-mono">{profile.username}</span> · Vai trò{" "}
              <span className="text-gray-300">{ROLE_LABEL[profile.role]}</span>
            </div>

            <form onSubmit={saveProfile} className="space-y-3">
              {error && <div className="text-sm text-danger">{error}</div>}
              {saved && <div className="text-sm text-accent2">Đã lưu thông tin.</div>}
              <div>
                <label className="text-xs text-mute">Họ tên</label>
                <input className="pxl-input mt-1" value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-mute">Email</label>
                <input type="email" className="pxl-input mt-1" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-xs text-mute">Số điện thoại</label>
                <input className="pxl-input mt-1" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0901234567" />
              </div>
              <button className="pxl-btn">Lưu thông tin</button>
            </form>
          </div>

          <div className="pxl-card p-5">
            <div className="font-semibold text-sm mb-3">Đổi mật khẩu</div>
            <form onSubmit={changePassword} className="space-y-3">
              {pwError && <div className="text-sm text-danger">{pwError}</div>}
              {pwSaved && <div className="text-sm text-accent2">Đã đổi mật khẩu.</div>}
              <div>
                <label className="text-xs text-mute">Mật khẩu hiện tại</label>
                <input type="password" className="pxl-input mt-1" value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-mute">Mật khẩu mới</label>
                <input type="password" className="pxl-input mt-1" value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-mute">Nhập lại mật khẩu mới</label>
                <input type="password" className="pxl-input mt-1" value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
              <button className="pxl-btn">Đổi mật khẩu</button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
