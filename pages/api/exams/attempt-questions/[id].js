import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";
import { buildOrderingData } from "../../../../lib/shuffle";

// Returns the attempt plus its questions. Teachers/admins always get the
// correct_answer field (for grading). Students only get it once the attempt
// is finished AND the paper's "show answers" setting is on — never while
// still taking the exam.
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;
  if (req.method !== "GET") return res.status(405).end();

  const { rows } = await DB.submissions(`SELECT * FROM attempts WHERE id = $1`, [id]);
  const attempt = rows[0];
  if (!attempt) return res.status(404).json({ error: "Không tìm thấy bài làm." });
  if (session.role === "student" && attempt.student_id !== session.id) {
    return res.status(403).json({ error: "Không có quyền." });
  }

  const isGrader = session.role === "admin" || session.role === "teacher";
  let includeAnswers = isGrader;
  if (!isGrader && attempt.status !== "in_progress") {
    const { rows: paperRows } = await DB.questionbank(`SELECT show_answers FROM papers WHERE id = $1`, [attempt.paper_id]);
    includeAnswers = paperRows[0]?.show_answers !== false;
  }

  const { rows: rawQuestions } = await DB.questionbank(
    `SELECT id, type, content, points, order_index, data${includeAnswers ? ", correct_answer" : ""}
     FROM questions WHERE paper_id = $1 ORDER BY order_index`,
    [attempt.paper_id]
  );

  // Ordering questions: never reveal the true (correct) sequence to a
  // student who hasn't earned the right to see it — scramble deterministically
  // per attempt+question so reloading the exam doesn't reshuffle mid-attempt.
  const questions = rawQuestions.map((q) => {
    if (q.type !== "ordering") return q;
    const items = q.data?.items || [];
    return { ...q, data: buildOrderingData(items, `${attempt.id}-${q.id}`, includeAnswers) };
  });

  let sessionNotes = null;
  if (attempt.session_id) {
    const { rows: sessRows } = await DB.exams(`SELECT notes FROM sessions WHERE id = $1`, [attempt.session_id]);
    sessionNotes = sessRows[0]?.notes || null;
  }

  res.status(200).json({ attempt, questions, showAnswers: includeAnswers, sessionNotes });
}
