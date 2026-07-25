import Layout from "../../components/Layout";
import Overview from "../../components/Overview";
import { useUser } from "../../lib/useUser";

export default function TeacherOverview() {
  const user = useUser(["teacher"]);
  if (!user) return null;
  return (
    <Layout user={user}>
      <Overview user={user} />
    </Layout>
  );
}
