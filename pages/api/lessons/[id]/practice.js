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
  if (!access.view) return res.status(403).json({ error: "Bạn không có quyền xem bài học này." });

  if (req.method === "GET") {
    const { rows: links } = await DB.courses(
      `SELECT paper_id FROM lesson_practice_links WHERE lesson_id = $1`,
      [id]
    );
    const paperIds = links.map((l) => l.paper_id);
    if (paperIds.length === 0) return res.status(200).json({ papers: [] });
    const { rows: papers } = await DB.questionbank(
      `SELECT p.id, p.title,
              (SELECT COUNT(*) FROM questions q WHERE q.paper_id = p.id)::int AS question_count
       FROM papers p WHERE p.id = ANY($1::uuid[])`,
      [paperIds]
    );
    return res.status(200).json({ papers });
  }

  if (req.method === "POST") {
    if (!access.edit) return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài học này." });
    const { paperIds } = req.body || {};
    if (!Array.isArray(paperIds)) return res.status(400).json({ error: "Thiếu danh sách đề thi." });
    await DB.courses(`DELETE FROM lesson_practice_links WHERE lesson_id = $1`, [id]);
    for (const pid of paperIds) {
      await DB.courses(
        `INSERT INTO lesson_practice_links (lesson_id, paper_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, pid]
      );
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
