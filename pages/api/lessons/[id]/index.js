import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

async function getAccess(session, courseId) {
  if (session.role === "admin") return { view: true, edit: true };
  const { rows } = await DB.courses(
    `SELECT user_role FROM course_access WHERE course_id = $1 AND user_id = $2`,
    [courseId, session.id]
  );
  if (!rows[0]) return { view: false, edit: false };
  return { view: true, edit: rows[0].user_role === "teacher" };
}

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;

  const { rows: lRows } = await DB.courses(`SELECT * FROM lessons WHERE id = $1`, [id]);
  const lesson = lRows[0];
  if (!lesson) return res.status(404).json({ error: "Không tìm thấy bài học." });
  const access = await getAccess(session, lesson.course_id);

  if (req.method === "GET") {
    if (!access.view) return res.status(403).json({ error: "Bạn không có quyền xem bài học này." });
    const { rows: ctxRows } = await DB.courses(
      `SELECT co.title AS course_title, ch.title AS chapter_title
       FROM courses co, chapters ch
       WHERE co.id = $1 AND ch.id = $2`,
      [lesson.course_id, lesson.chapter_id]
    );
    return res.status(200).json({
      lesson,
      canEdit: access.edit,
      courseTitle: ctxRows[0]?.course_title || "",
      chapterTitle: ctxRows[0]?.chapter_title || "",
    });
  }

  if (!access.edit) return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài học này." });

  if (req.method === "PUT") {
    const { title, content, order_index } = req.body || {};
    const { rows } = await DB.courses(
      `UPDATE lessons SET title = COALESCE($1,title), content = COALESCE($2,content),
       order_index = COALESCE($3,order_index), updated_at = now() WHERE id = $4 RETURNING *`,
      [title, content, order_index, id]
    );
    return res.status(200).json({ lesson: rows[0] });
  }

  if (req.method === "DELETE") {
    await DB.courses(`DELETE FROM lessons WHERE id = $1`, [id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
