import { Home } from "~/components/home";
import { WorkList } from "~/components/work-list";

export default function HomePage() {
  return <Home work={<WorkList />} />;
}
