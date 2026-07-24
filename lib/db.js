import { Pool } from "pg";

// Pixel LMS uses 6 fully independent Postgres databases (e.g. 6 separate
// Neon projects). There are NO foreign keys across these databases -- any
// cross-database reference (a user_id stored in the courses DB, a course_id
// stored in the submissions DB, etc.) is a plain UUID that must be resolved
// with a second query at the application layer. See README.md.

const ENV_KEYS = {
  accounts: "DATABASE_URL_ACCOUNTS",
  courses: "DATABASE_URL_COURSES",
  submissions: "DATABASE_URL_SUBMISSIONS",
  questionbank: "DATABASE_URL_QUESTIONBANK",
  exams: "DATABASE_URL_EXAMS",
  posts: "DATABASE_URL_POSTS",
};

const pools = {};

function getPool(name) {
  if (!ENV_KEYS[name]) throw new Error(`Unknown database: ${name}`);
  if (!pools[name]) {
    const conn = process.env[ENV_KEYS[name]];
    if (!conn) {
      throw new Error(
        `Missing env var ${ENV_KEYS[name]} for the "${name}" database. Set it in Vercel Project Settings > Environment Variables.`
      );
    }
    pools[name] = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pools[name];
}

export async function query(dbName, text, params) {
  const pool = getPool(dbName);
  return pool.query(text, params);
}

export const DB = {
  accounts: (text, params) => query("accounts", text, params),
  courses: (text, params) => query("courses", text, params),
  submissions: (text, params) => query("submissions", text, params),
  questionbank: (text, params) => query("questionbank", text, params),
  exams: (text, params) => query("exams", text, params),
  posts: (text, params) => query("posts", text, params),
};

export const DB_NAMES = Object.keys(ENV_KEYS);
