import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import CourseEditor from "../../../components/CourseEditor";
import { useUser } from "../../../lib/useUser";

export default function AdminCourseDetail() {
  const user = useUser(["admin"]);
  const router = useRouter();
  const { id } = router.query;
  if (!user || !id) return null;
  return (
    <Layout user={user}>
      <CourseEditor courseId={id} isAdmin />
    </Layout>
  );
}
