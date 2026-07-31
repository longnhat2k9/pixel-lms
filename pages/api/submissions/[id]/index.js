import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";
import { gradeQuestion } from "../../../../lib/grading";

// Auto-grades objective question types (choice2, choice4, fill_blank).
// essay/matching are left for manual grading via manual_overrides.
async function autoGrade(paperId, answers) {
  const { rows: questions } = await DB.questionbank(
    `SELECT id, type, points, correct_answer FROM questions WHERE paper_id = $1`,
    [paperId]
  );
  let total = 0;
  for (const q of questions) {
    total += gradeQuestion(q, answers?.[q.id]);
  }
  return total;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher", "student"]);
  if (!session) return;

  const { rows } = await DB.submissions(`SELECT * FROM attempts WHERE id = $1`, [id]);
  const attempt = rows[0];
  if (!attempt) return res.status(404).json({ error: "Không tìm thấy bài làm." });
  if (session.role === "student" && attempt.student_id !== session.id) {
    return res.status(403).json({ error: "Bạn chỉ được xem bài làm của chính mình." });
  }

  if (req.method === "GET") {
    return res.status(200).json({ attempt });
  }

  if (req.method === "PUT") {
    // Student autosave / submit. Only the owning student, only while in progress.
    if (session.role !== "student" || attempt.student_id !== session.id) {
      return res.status(403).json({ error: "Không có quyền." });
    }
    if (attempt.status !== "in_progress") {
      return res.status(400).json({ error: "Bài làm đã kết thúc." });
    }
    const { answers, submit } = req.body || {};
    if (submit) {
      const finalAnswers = answers || attempt.answers;
      const autoScore = await autoGrade(attempt.paper_id, finalAnswers);
      const { rows: updated } = await DB.submissions(
        `UPDATE attempts SET answers = $1, status = 'submitted', submitted_at = now(),
         auto_score = $2, final_score = $2
         WHERE id = $3 RETURNING *`,
        [JSON.stringify(finalAnswers), autoScore, id]
      );
      return res.status(200).json({ attempt: updated[0] });
    }
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET answers = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(answers || {}), id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  res.status(405).end();
}
