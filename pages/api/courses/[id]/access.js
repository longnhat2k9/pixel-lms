import { DB } from "../../../../lib/db";
import { requireRole } from "../../../../lib/auth";

export default async function handler(req, res) {
  const { id } = req.query;
  const session = requireRole(req, res, ["admin"]);
  if (!session) return;

  if (req.method === "GET") {
    const { rows: allAccounts } = await DB.accounts(
      `SELECT id, username, full_name, role FROM accounts WHERE role IN ('teacher','student') ORDER BY role, full_name`
    );
    const { rows: access } = await DB.courses(
      `SELECT user_id FROM course_access WHERE course_id = $1`,
      [id]
    );
    const grantedIds = new Set(access.map((r) => r.user_id));
    return res.status(200).json({
      accounts: allAccounts.map((a) => ({ ...a, granted: grantedIds.has(a.id) })),
    });
  }

  if (req.method === "POST") {
    // body: { userIds: [...] } -> becomes the full allow-list for this course
    const { userIds } = req.body || {};
    if (!Array.isArray(userIds)) return res.status(400).json({ error: "Thiếu danh sách tài khoản." });

    const { rows: accounts } = await DB.accounts(
      `SELECT id, role FROM accounts WHERE id = ANY($1::uuid[])`,
      [userIds]
    );

    await DB.courses(`DELETE FROM course_access WHERE course_id = $1`, [id]);
    for (const acc of accounts) {
      await DB.courses(
        `INSERT INTO course_access (course_id, user_id, user_role) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [id, acc.id, acc.role]
      );
    }
    return res.status(200).json({ ok: true, granted: accounts.length });
  }

  res.status(405).end();
}
