import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

async function hasAccess(session, courseId) {
  if (session.role === "admin") return true;
  const { rows } = await DB.courses(
    `SELECT 1 FROM course_access WHERE course_id = $1 AND user_id = $2`,
    [courseId, session.id]
  );
  return rows.length > 0;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;

  if (!(await hasAccess(session, id))) {
    return res.status(403).json({ error: "Bạn không có quyền truy cập khóa học này." });
  }

  if (req.method === "GET") {
    const { rows: courseRows } = await DB.courses(`SELECT * FROM courses WHERE id = $1`, [id]);
    if (!courseRows[0]) return res.status(404).json({ error: "Không tìm thấy khóa học." });
    const { rows: chapters } = await DB.courses(
      `SELECT * FROM chapters WHERE course_id = $1 ORDER BY order_index, created_at`,
      [id]
    );
    const { rows: lessons } = await DB.courses(
      `SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index, created_at`,
      [id]
    );
    const chaptersWithLessons = chapters.map((c) => ({
      ...c,
      lessons: lessons.filter((l) => l.chapter_id === c.id),
    }));
    return res.status(200).json({ course: courseRows[0], chapters: chaptersWithLessons });
  }

  if (req.method === "PUT") {
    if (session.role !== "admin") return res.status(403).json({ error: "Chỉ admin được sửa thông tin khóa học." });
    const { title, description } = req.body || {};
    const { rows } = await DB.courses(
      `UPDATE courses SET title = COALESCE($1,title), description = COALESCE($2,description) WHERE id = $3 RETURNING *`,
      [title, description, id]
    );
    return res.status(200).json({ course: rows[0] });
  }

  if (req.method === "DELETE") {
    if (session.role !== "admin") return res.status(403).json({ error: "Chỉ admin được xóa khóa học." });
    await DB.courses(`DELETE FROM courses WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
