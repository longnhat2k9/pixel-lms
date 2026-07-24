import Layout from "../../components/Layout";
import { useUser } from "../../lib/useUser";

export default function StudentHome() {
  const user = useUser(["student"]);
  if (!user) return null;
  return (
    <Layout user={user}>
      <h1 className="text-2xl font-bold mb-1">Chào, {user.fullName}</h1>
      <p className="text-mute text-sm">Dùng menu bên trái để xem khóa học, vào thi và xem bài làm của bạn.</p>
    </Layout>
  );
}
