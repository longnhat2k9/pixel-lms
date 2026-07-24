import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

async function canEdit(session, courseId) {
  if (session.role === "admin") return true;
  if (session.role !== "teacher") return false;
  const { rows } = await DB.courses(
    `SELECT 1 FROM course_access WHERE course_id = $1 AND user_id = $2`,
    [courseId, session.id]
  );
  return rows.length > 0;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;
  if (!(await canEdit(session, id))) {
    return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa khóa học này." });
  }
  if (req.method !== "POST") return res.status(405).end();

  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: "Thiếu tên chương." });
  const { rows: countRows } = await DB.courses(
    `SELECT COUNT(*)::int AS c FROM chapters WHERE course_id = $1`,
    [id]
  );
  const { rows } = await DB.courses(
    `INSERT INTO chapters (course_id, title, order_index, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, title, countRows[0].c, session.id]
  );
  res.status(201).json({ chapter: rows[0] });
}
