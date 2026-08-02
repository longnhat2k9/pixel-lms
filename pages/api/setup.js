import { DB } from "../../lib/db";

// Visit /api/setup in the browser after wiring up the 6 DATABASE_URL_*
// env vars in Vercel. Safe to re-run any time (everything is IF NOT EXISTS).
export default async function handler(req, res) {
  const results = {};

  try {
    await DB.accounts(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.accounts(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID,
        last_login_at TIMESTAMPTZ,
        delete_requested_at TIMESTAMPTZ,
        delete_requested_by UUID
      );
    `);
    await DB.accounts(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM accounts WHERE username = 'admin') THEN
          INSERT INTO accounts (username, password, full_name, role)
          VALUES ('admin', 'admin123', 'Quản trị viên', 'admin');
        END IF;
      END $$;
    `);
    await DB.accounts(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT;`);
    await DB.accounts(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;`);
    results.accounts = "ok (seeded admin/admin123 if empty)";
  } catch (e) {
    results.accounts = `ERROR: ${e.message}`;
  }

  try {
    await DB.courses(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS courses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS course_access (
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        user_role TEXT NOT NULL,
        granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (course_id, user_id)
      );
    `);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        order_index INT NOT NULL DEFAULT 0,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS lessons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        order_index INT NOT NULL DEFAULT 0,
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS lesson_exam_links (
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        session_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (lesson_id, session_id)
      );
    `);
    await DB.courses(`
      CREATE TABLE IF NOT EXISTS lesson_practice_links (
        lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        paper_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (lesson_id, paper_id)
      );
    `);
    await DB.courses(`ALTER TABLE lesson_practice_links ADD COLUMN IF NOT EXISTS time_limit_minutes INT;`);
    results.courses = "ok";
  } catch (e) {
    results.courses = `ERROR: ${e.message}`;
  }

  try {
    await DB.submissions(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.submissions(`
      CREATE TABLE IF NOT EXISTS attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        session_code TEXT NOT NULL,
        paper_id UUID NOT NULL,
        exam_title_snapshot TEXT NOT NULL,
        student_id UUID NOT NULL,
        student_name_snapshot TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        time_limit_minutes INT NOT NULL,
        time_adjust_minutes INT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'in_progress'
          CHECK (status IN ('in_progress','submitted','cancelled','force_ended')),
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        auto_score NUMERIC,
        manual_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
        final_score NUMERIC,
        submitted_at TIMESTAMPTZ,
        ended_by UUID,
        ended_reason TEXT
      );
    `);
    await DB.submissions(`ALTER TABLE attempts ALTER COLUMN session_id DROP NOT NULL;`);
    await DB.submissions(`ALTER TABLE attempts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'exam';`);
    results.submissions = "ok";
  } catch (e) {
    results.submissions = `ERROR: ${e.message}`;
  }

  try {
    await DB.questionbank(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.questionbank(`
      CREATE TABLE IF NOT EXISTS papers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await DB.questionbank(`ALTER TABLE papers ADD COLUMN IF NOT EXISTS show_answers BOOLEAN NOT NULL DEFAULT true;`);
    await DB.questionbank(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN
          ('choice2','choice4','fill_blank','essay','matching')),
        content TEXT NOT NULL,
        points NUMERIC NOT NULL DEFAULT 1,
        order_index INT NOT NULL DEFAULT 0,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        correct_answer JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // Re-apply the allowed-type list every run so adding new question types
    // later (e.g. "ordering") doesn't require a manual DB migration.
    await DB.questionbank(`ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;`);
    await DB.questionbank(`
      ALTER TABLE questions ADD CONSTRAINT questions_type_check
        CHECK (type IN ('choice2','choice4','fill_blank','ordering','essay','matching'));
    `);
    results.questionbank = "ok";
  } catch (e) {
    results.questionbank = `ERROR: ${e.message}`;
  }

  try {
    await DB.exams(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.exams(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        paper_id UUID NOT NULL,
        time_limit_minutes INT NOT NULL DEFAULT 60,
        start_time TIMESTAMPTZ,
        end_time TIMESTAMPTZ,
        allow_multiple_attempts BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK (status IN ('scheduled','active','ended')),
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await DB.exams(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notes TEXT;`);
    results.exams = "ok";
  } catch (e) {
    results.exams = `ERROR: ${e.message}`;
  }

  try {
    await DB.posts(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await DB.posts(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        excerpt TEXT DEFAULT '',
        content TEXT NOT NULL,
        author_id UUID NOT NULL,
        author_name_snapshot TEXT NOT NULL,
        published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    results.posts = "ok";
  } catch (e) {
    results.posts = `ERROR: ${e.message}`;
  }

  const hasError = Object.values(results).some((v) => String(v).startsWith("ERROR"));
  res.status(hasError ? 500 : 200).json({ ok: !hasError, results });
}
