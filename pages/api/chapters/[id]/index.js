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

  const { rows: chRows } = await DB.courses(`SELECT * FROM chapters WHERE id = $1`, [id]);
  const chapter = chRows[0];
  if (!chapter) return res.status(404).json({ error: "Không tìm thấy chương." });
  if (!(await canEdit(session, chapter.course_id))) {
    return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa khóa học này." });
  }

  if (req.method === "PUT") {
    const { title, order_index } = req.body || {};
    const { rows } = await DB.courses(
      `UPDATE chapters SET title = COALESCE($1,title), order_index = COALESCE($2,order_index) WHERE id = $3 RETURNING *`,
      [title, order_index, id]
    );
    return res.status(200).json({ chapter: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.courses(`DELETE FROM chapters WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "POST") {
    // create a lesson inside this chapter
    const { title, content } = req.body || {};
    if (!title) return res.status(400).json({ error: "Thiếu tên bài học." });
    const { rows: countRows } = await DB.courses(
      `SELECT COUNT(*)::int AS c FROM lessons WHERE chapter_id = $1`,
      [id]
    );
    const { rows } = await DB.courses(
      `INSERT INTO lessons (chapter_id, course_id, title, content, order_index, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, chapter.course_id, title, content || "", countRows[0].c, session.id]
    );
    return res.status(201).json({ lesson: rows[0] });
  }

  res.status(405).end();
}
