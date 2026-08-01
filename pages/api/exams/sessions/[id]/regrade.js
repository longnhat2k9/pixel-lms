import { DB } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/auth";
import { computeAttemptScores } from "../../../../../lib/grading";

// Recomputes scores for every submitted attempt that belongs to THIS exam
// session specifically (not every attempt that ever used the paper) —
// against the CURRENT correct answers. Manual overrides are preserved.
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { rows: sessionRows } = await DB.exams(`SELECT * FROM sessions WHERE id = $1`, [id]);
  const examSession = sessionRows[0];
  if (!examSession) return res.status(404).json({ error: "Không tìm thấy ca thi." });

  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, points, correct_answer, data FROM questions WHERE paper_id = $1`,
    [examSession.paper_id]
  );

  const { rows: attempts } = await DB.submissions(
    `SELECT id, answers, manual_overrides FROM attempts WHERE session_id = $1 AND status != 'in_progress'`,
    [id]
  );

  for (const a of attempts) {
    const { autoScore, finalScore } = computeAttemptScores(questions, a.answers || {}, a.manual_overrides || {});
    await DB.submissions(
      `UPDATE attempts SET auto_score = $1, final_score = $2 WHERE id = $3`,
      [autoScore, finalScore, a.id]
    );
  }

  res.status(200).json({ ok: true, regraded: attempts.length });
}
