import Layout from "../../components/Layout";
import Overview from "../../components/Overview";
import { useUser } from "../../lib/useUser";

export default function StudentOverview() {
  const user = useUser(["student"]);
  if (!user) return null;
  return (
    <Layout user={user}>
      <Overview user={user} />
    </Layout>
  );
}
