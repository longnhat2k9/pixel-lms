import { DB } from "../../../lib/db";

// Called daily by Vercel Cron (see vercel.json). Hard-deletes admin accounts
// whose deletion was requested more than 5 days ago and who have not logged
// in since (logging in clears delete_requested_at, see /api/auth/login).
export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { rows } = await DB.accounts(
    `DELETE FROM accounts
     WHERE role = 'admin'
       AND delete_requested_at IS NOT NULL
       AND delete_requested_at <= now() - interval '5 days'
     RETURNING id, username`
  );

  res.status(200).json({ ok: true, deleted: rows });
}
