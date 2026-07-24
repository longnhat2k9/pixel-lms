import { DB } from "../../../lib/db";
import { createSessionToken, setSessionCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Thiếu tên đăng nhập hoặc mật khẩu." });
  }

  const { rows } = await DB.accounts(
    `SELECT * FROM accounts WHERE username = $1`,
    [username]
  );
  const user = rows[0];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu." });
  }

  if (user.delete_requested_at) {
    await DB.accounts(
      `UPDATE accounts SET delete_requested_at = NULL, delete_requested_by = NULL WHERE id = $1`,
      [user.id]
    );
  }
  await DB.accounts(`UPDATE accounts SET last_login_at = now() WHERE id = $1`, [user.id]);

  const token = createSessionToken({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
  });
  setSessionCookie(res, token);
  res.status(200).json({
    ok: true,
    user: { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
  });
}
