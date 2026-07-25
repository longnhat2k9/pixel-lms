import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

// Teacher/Admin only: cancel, force_end, adjust_time
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
    const answers = attempt.answers || {};

    let finalScore = 0;
    for (const q of questions) {
      if (Object.prototype.hasOwnProperty.call(overrides, q.id)) {
        finalScore += Number(overrides[q.id] || 0);
        continue;
      }
      const given = answers[q.id];
      if (q.type === "choice2" || q.type === "choice4") {
        if (given !== undefined && String(given) === String(q.correct_answer?.value)) finalScore += Number(q.points);
      } else if (q.type === "fill_blank") {
        const norm = (s) => String(s || "").trim().toLowerCase();
        if (given !== undefined && norm(given) === norm(q.correct_answer?.value)) finalScore += Number(q.points);
      }
      // essay/matching with no override contribute 0 until graded
    }

    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET manual_overrides = $1, final_score = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(overrides), finalScore, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  res.status(400).json({ error: "Hành động không hợp lệ." });
}
