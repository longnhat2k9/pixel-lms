import { DB } from "./db";

// Admins/teachers can always practice (they manage the question bank).
// Students may only practice a paper that's been attached to at least one
// lesson in a course they have access to — prevents guessing arbitrary
// paper IDs to see answers.
export async function canPractice(session, paperId) {
  if (session.role === "admin" || session.role === "teacher") return true;
  const { rows: links } = await DB.courses(
    `SELECT lesson_id FROM lesson_practice_links WHERE paper_id = $1`,
    [paperId]
  );
  if (links.length === 0) return false;
  const lessonIds = links.map((l) => l.lesson_id);
  const { rows: lessons } = await DB.courses(
    `SELECT DISTINCT course_id FROM lessons WHERE id = ANY($1::uuid[])`,
    [lessonIds]
  );
  for (const l of lessons) {
    const { rows } = await DB.courses(
      `SELECT 1 FROM course_access WHERE course_id = $1 AND user_id = $2`,
      [l.course_id, session.id]
    );
    if (rows[0]) return true;
  }
  return false;
}
