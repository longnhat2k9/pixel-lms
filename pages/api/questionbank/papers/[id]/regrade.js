import { DB } from "../../../../../lib/db";
import { requireRole } from "../../../../../lib/auth";
import { computeAttemptScores } from "../../../../../lib/grading";

// Recomputes scores for every submitted attempt (exam or practice) that
// used this paper, against the CURRENT correct answers — for when a
// teacher edits the answer key after students already submitted. Attempts
// still in progress are skipped (nothing to grade yet). Manual overrides
// already set on an attempt are preserved.
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, points, correct_answer, data FROM questions WHERE paper_id = $1`,
    [id]
  );

  const { rows: attempts } = await DB.submissions(
    `SELECT id, answers, manual_overrides FROM attempts WHERE paper_id = $1 AND status != 'in_progress'`,
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
