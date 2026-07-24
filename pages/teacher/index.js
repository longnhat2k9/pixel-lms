import Layout from "../../components/Layout";
import { useUser } from "../../lib/useUser";

export default function TeacherHome() {
  const user = useUser(["teacher"]);
  if (!user) return null;
  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Chào, {user.fullName}</h1>
      <p className="text-mute text-sm">Dùng menu bên trái để quản lý khóa học, đề thi, ca thi, bài làm và bài viết.</p>
    </Layout>
  );
}
