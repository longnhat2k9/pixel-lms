import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// GET: list accounts (admin sees all, teacher sees only students)
// POST: create an account
export default async function handler(req, res) {
  if (req.method === "GET") {
    const session = requireRole(req, res, ["admin", "teacher"]);
    if (!session) return;
    const roleFilter = session.role === "teacher" ? "AND role = 'student'" : "";
    const { rows } = await DB.accounts(
      `SELECT id, username, full_name, role, email, phone, created_at, last_login_at,
              delete_requested_at, delete_requested_by
       FROM accounts WHERE true ${roleFilter} ORDER BY created_at DESC`
    );
    return res.status(200).json({ accounts: rows });
  }

  if (req.method === "POST") {
    const session = requireRole(req, res, ["admin", "teacher"]);
    if (!session) return;
    const { username, password, fullName, role } = req.body || {};
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc." });
    }
    if (session.role === "teacher" && role !== "student") {
      return res.status(403).json({ error: "Giáo viên chỉ được tạo tài khoản học sinh." });
    }
    if (!["admin", "teacher", "student"].includes(role)) {
      return res.status(400).json({ error: "Vai trò không hợp lệ." });
    }
    try {
      const { rows } = await DB.accounts(
        `INSERT INTO accounts (username, password, full_name, role, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, username, full_name, role, created_at`,
        [username, password, fullName, role, session.id]
      );
      return res.status(201).json({ account: rows[0] });
    } catch (e) {
      if (String(e.message).includes("duplicate key")) {
        return res.status(409).json({ error: "Tên đăng nhập đã tồn tại." });
      }
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
}
