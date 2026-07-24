import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// PATCH body: { action: "reset_password", password } | { action: "request_delete" } | { action: "cancel_delete" }
// DELETE: immediate delete (only allowed for teacher/student targets, or admin deleting self-created non-admin)
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;

  const { rows: targetRows } = await DB.accounts(`SELECT * FROM accounts WHERE id = $1`, [id]);
  const target = targetRows[0];
  if (!target) return res.status(404).json({ error: "Không tìm thấy tài khoản." });

  if (session.role === "teacher" && target.role !== "student") {
    return res.status(403).json({ error: "Giáo viên chỉ thao tác được với tài khoản học sinh." });
  }

  if (req.method === "PATCH") {
    const { action, password } = req.body || {};

    if (action === "reset_password") {
      if (!password) return res.status(400).json({ error: "Thiếu mật khẩu mới." });
      await DB.accounts(`UPDATE accounts SET password = $1 WHERE id = $2`, [password, id]);
      return res.status(200).json({ ok: true });
    }

    if (action === "request_delete") {
      if (target.role !== "admin") {
        return res.status(400).json({ error: "Chỉ cần dùng bước xóa trực tiếp cho tài khoản không phải admin." });
      }
      if (session.role !== "admin") {
        return res.status(403).json({ error: "Chỉ admin mới được xóa tài khoản admin khác." });
      }
      if (target.id === session.id) {
        return res.status(400).json({ error: "Không thể tự xóa chính mình." });
      }
      await DB.accounts(
        `UPDATE accounts SET delete_requested_at = now(), delete_requested_by = $1 WHERE id = $2`,
        [session.id, id]
      );
      return res.status(200).json({ ok: true, message: "Đã yêu cầu xóa. Tài khoản sẽ bị xóa sau 5 ngày nếu không đăng nhập lại." });
    }

    if (action === "cancel_delete") {
      await DB.accounts(
        `UPDATE accounts SET delete_requested_at = NULL, delete_requested_by = NULL WHERE id = $1`,
        [id]
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Hành động không hợp lệ." });
  }

  if (req.method === "DELETE") {
    if (target.role === "admin") {
      return res.status(400).json({ error: "Tài khoản admin phải xóa qua cơ chế yêu cầu xóa (chờ 5 ngày)." });
    }
    if (target.id === session.id) {
      return res.status(400).json({ error: "Không thể tự xóa chính mình." });
    }
    await DB.accounts(`DELETE FROM accounts WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
