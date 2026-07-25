import { DB } from "../../../lib/db";
import { requireRole } from "../../../lib/auth";

// Self-service password change — requires the current password, unlike the
// admin/teacher "reset password" action which does not.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Thiếu mật khẩu hiện tại hoặc mật khẩu mới." });
  }

  const { rows } = await DB.accounts(`SELECT password FROM accounts WHERE id = $1`, [session.id]);
  if (!rows[0] || rows[0].password !== currentPassword) {
    return res.status(401).json({ error: "Mật khẩu hiện tại không đúng." });
  }

  await DB.accounts(`UPDATE accounts SET password = $1 WHERE id = $2`, [newPassword, session.id]);
  res.status(200).json({ ok: true });
}
