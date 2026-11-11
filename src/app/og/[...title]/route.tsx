import { Share } from "~/components/work/share";
import { projects } from "~/content/projects";
import { ProjectCard } from "~/lib/project-card";

type Props = { params: Promise<{ title: string[] }> };

/** Every project's card is drawn at build; no other path has one. */
export const dynamicParams = false;
export function generateStaticParams() {
  return projects.map((project) => ({ title: Share.segments(project.title) }));
}

export async function GET(_request: Request, { params }: Props) {
  const project = Share.find((await params).title);
  if (project === undefined)
    return new Response("No such project.", { status: 404 });
  return ProjectCard.draw(project);
}
