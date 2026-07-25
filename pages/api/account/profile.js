import { DB } from "../../../lib/db";
import { requireRole } from "../../../lib/auth";

// A user's own profile — separate from /api/auth/me (which only reflects
// what's in the signed session cookie). Email/phone/full name can change
// without needing to re-log in, so this always reads fresh from the DB.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows } = await DB.accounts(
      `SELECT id, username, full_name, email, phone, role FROM accounts WHERE id = $1`,
      [session.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Không tìm thấy tài khoản." });
    return res.status(200).json({ profile: rows[0] });
  }

  if (req.method === "PUT") {
    const { fullName, email, phone } = req.body || {};
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Thiếu họ tên." });
    const { rows } = await DB.accounts(
      `UPDATE accounts SET full_name = $1, email = $2, phone = $3 WHERE id = $4
       RETURNING id, username, full_name, email, phone, role`,
      [fullName.trim(), email || null, phone || null, session.id]
    );
    return res.status(200).json({ profile: rows[0] });
  }

  res.status(405).end();
}
