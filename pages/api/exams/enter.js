import { DB } from "../../../lib/db";
import { requireRole } from "../../../lib/auth";

// Student enters a session code -> resumes an existing in-progress attempt,
// or creates a new one if the session allows it / none exists yet.
export default async function handler(req, res) {
  const session = requireRole(req, res, ["student"]);
  if (!session) return;
  if (req.method !== "POST") return res.status(405).end();

  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: "Vui lòng nhập mã ca thi." });

  const { rows: sessRows } = await DB.exams(
    `SELECT * FROM sessions WHERE session_code = $1`,
    [code.trim().toUpperCase()]
  );
  const examSession = sessRows[0];
  if (!examSession) return res.status(404).json({ error: "Mã ca thi không tồn tại." });

  const now = new Date();
  if (examSession.status === "ended") {
    return res.status(400).json({ error: "Ca thi đã đóng." });
  }
  if (examSession.end_time && now > new Date(examSession.end_time)) {
    return res.status(400).json({ error: "Ca thi đã kết thúc." });
  }
  // Session hasn't been opened by the teacher yet (or its start time hasn't
  // arrived) — tell the student to wait instead of erroring. No attempt is
  // created yet, so the timer only starts once the session actually opens.
  const notOpenYet = examSession.status === "scheduled" ||
    (examSession.start_time && now < new Date(examSession.start_time));
  if (notOpenYet) {
    return res.status(200).json({
      waiting: true,
      sessionCode: examSession.session_code,
      title: examSession.title,
    });
  }

  const { rows: existing } = await DB.submissions(
    `SELECT * FROM attempts WHERE session_id = $1 AND student_id = $2 ORDER BY started_at DESC LIMIT 1`,
    [examSession.id, session.id]
  );

  if (existing[0]) {
    if (existing[0].status === "in_progress") {
      return res.status(200).json({ attemptId: existing[0].id });
    }
    if (existing[0].status === "cancelled") {
      return res.status(400).json({ error: "Bài làm trước của bạn đã bị giáo viên hủy. Vui lòng liên hệ giáo viên nếu cần làm lại." });
    }
    if (existing[0].status === "force_ended") {
      return res.status(400).json({ error: "Bài làm trước của bạn đã bị giáo viên buộc kết thúc. Vui lòng liên hệ giáo viên nếu cần làm lại." });
    }
    if (!examSession.allow_multiple_attempts) {
      return res.status(400).json({ error: "Bạn đã hoàn thành ca thi này." });
    }
  }

  const { rows: paperRows } = await DB.questionbank(`SELECT title FROM papers WHERE id = $1`, [examSession.paper_id]);
  const paperTitle = paperRows[0]?.title || examSession.title;

  const { rows: created } = await DB.submissions(
    `INSERT INTO attempts
      (session_id, session_code, paper_id, exam_title_snapshot, student_id, student_name_snapshot, time_limit_minutes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [examSession.id, examSession.session_code, examSession.paper_id, paperTitle, session.id, session.fullName, examSession.time_limit_minutes]
  );

  res.status(201).json({ attemptId: created[0].id });
}
