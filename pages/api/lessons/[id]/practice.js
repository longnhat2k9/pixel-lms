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
      `SELECT paper_id, time_limit_minutes FROM lesson_practice_links WHERE lesson_id = $1`,
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
    const limitByPaper = Object.fromEntries(links.map((l) => [l.paper_id, l.time_limit_minutes]));
    const merged = papers.map((p) => ({ ...p, time_limit_minutes: limitByPaper[p.id] ?? null }));
    return res.status(200).json({ papers: merged });
  }

  if (req.method === "POST") {
    if (!access.edit) return res.status(403).json({ error: "Bạn không có quyền chỉnh sửa bài học này." });
    // body: { links: [{ paperId, timeLimitMinutes }] } — timeLimitMinutes null/omitted = không giới hạn.
    // Full replace, same pattern as course access.
    const { links } = req.body || {};
    if (!Array.isArray(links)) return res.status(400).json({ error: "Thiếu danh sách đề thi." });
    await DB.courses(`DELETE FROM lesson_practice_links WHERE lesson_id = $1`, [id]);
    for (const link of links) {
      await DB.courses(
        `INSERT INTO lesson_practice_links (lesson_id, paper_id, time_limit_minutes) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [id, link.paperId, link.timeLimitMinutes || null]
      );
    }
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
