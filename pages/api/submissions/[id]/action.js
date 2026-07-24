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
    // body: { overrides: { [questionId]: points } } manual grading for
    // essay/matching questions, merged on top of the auto-graded score.
    const { overrides } = req.body || {};
    if (!overrides || typeof overrides !== "object") {
      return res.status(400).json({ error: "Thiếu điểm chấm tay." });
    }
    const manualTotal = Object.values(overrides).reduce((sum, v) => sum + Number(v || 0), 0);
    const finalScore = Number(attempt.auto_score || 0) + manualTotal;
    const { rows: updated } = await DB.submissions(
      `UPDATE attempts SET manual_overrides = $1, final_score = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(overrides), finalScore, id]
    );
    return res.status(200).json({ attempt: updated[0] });
  }

  res.status(400).json({ error: "Hành động không hợp lệ." });
}
