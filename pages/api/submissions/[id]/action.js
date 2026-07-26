import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";
import { computeAttemptScores } from "../../../../lib/grading";

// Teacher/Admin only: cancel, force_end, adjust_time, grade, regrade
export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin", "teacher"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { rows } = await DB.submissions(`SELECT * FROM attempts WHERE id = $1`, [id]);
  const attempt = rows[0];
  if (!attempt) return res.status(404).json({ error: "Không tìm thấy bài làm." });

  const { action, minutes } = req.body || {};

  if (action === "cancel") {
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET status = 'cancelled', ended_by = $1, ended_reason = 'Hủy bởi giáo viên/admin'
       WHERE id = $2 RETURNING *`,
      [session.id, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  if (action === "force_end") {
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET status = 'force_ended', submitted_at = now(), ended_by = $1,
       ended_reason = 'Buộc kết thúc bởi giáo viên/admin' WHERE id = $2 RETURNING *`,
      [session.id, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  if (action === "adjust_time") {
    if (typeof minutes !== "number") return res.status(400).json({ error: "Thiếu số phút điều chỉnh." });
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET time_adjust_minutes = time_adjust_minutes + $1 WHERE id = $2 RETURNING *`,
      [minutes, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  if (action === "grade") {
    // body: { overrides: { [questionId]: points } } — teacher-set final point
    // value for ANY question (not just essay/matching). Any question not
    // present in overrides falls back to its auto-graded value.
    const { overrides } = req.body || {};
    if (!overrides || typeof overrides !== "object") {
      return res.status(400).json({ error: "Thiếu điểm chấm tay." });
    }

    const { rows: questions } = await DB.questionbank(
      `SELECT id, type, points, correct_answer FROM questions WHERE paper_id = $1`,
      [attempt.paper_id]
    );
    const { autoScore, finalScore } = computeAttemptScores(questions, attempt.answers || {}, overrides);

    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET manual_overrides = $1, auto_score = $2, final_score = $3 WHERE id = $4 RETURNING *`,
      [JSON.stringify(overrides), autoScore, finalScore, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  if (action === "regrade") {
    // Recomputes the score against the CURRENT correct answers in the
    // question bank — for when a teacher edited an answer key after
    // students had already submitted. Existing manual overrides (e.g. an
    // essay score, or a deliberate point adjustment) are kept as-is.
    if (attempt.status === "in_progress") {
      return res.status(400).json({ error: "Bài làm chưa nộp, không thể chấm lại." });
    }
    const { rows: questions } = await DB.questionbank(
      `SELECT id, type, points, correct_answer FROM questions WHERE paper_id = $1`,
      [attempt.paper_id]
    );
    const { autoScore, finalScore } = computeAttemptScores(questions, attempt.answers || {}, attempt.manual_overrides || {});
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET auto_score = $1, final_score = $2 WHERE id = $3 RETURNING *`,
      [autoScore, finalScore, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  res.status(400).json({ error: "Hành động không hợp lệ." });
}
