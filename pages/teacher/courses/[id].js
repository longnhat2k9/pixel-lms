import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import CourseEditor from "../../../components/CourseEditor";
import { useUser } from "../../../lib/useUser";

export default function TeacherCourseDetail() {
  const user = useUser(["teacher"]);
  const router = useRouter();
  const { id } = router.query;
  if (!user || !id) return null;
  return (
    <Layout user={user}>
      <CourseEditor courseId={id} />
    </Layout>
  );
}
