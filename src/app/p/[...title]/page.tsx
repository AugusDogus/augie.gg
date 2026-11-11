import type { Metadata } from "next";
import { Home } from "~/components/home";
import { Share } from "~/components/work/share";
import { projects } from "~/content/projects";
import { CARD_SIZE, cardVideo } from "~/lib/share-card";
import { DEFAULT_APP_TITLE } from "~/lib/site";

type Props = { params: Promise<{ title: string[] }> };

/** Every project, so each is built once and served as a file. */
export function generateStaticParams() {
  return projects.map((project) => ({ title: Share.segments(project.title) }));
}

/** The project's name, blurb and card, for a link preview, and its video where the card shows a clip. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = Share.find((await params).title);
  // A link that names no project is plain home, as the page treats it.
  if (project === undefined) return {};
  const title = `${project.title} | ${DEFAULT_APP_TITLE}`;
  const description = Share.description(project);
  const images = [
    {
      url: Share.card(project.title),
      ...CARD_SIZE,
      alt: `${project.title}: ${description}`,
    },
  ];
  const video = Share.video(project);
  const videos = video === null ? undefined : [cardVideo(video)];
  return {
    title: project.title,
    description,
    openGraph: { title, description, images, videos },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

/**
 * Home, as `/?p=<title>` is served (next.config.js rewrites it here): the
 * same page, which opens the project itself, under that project's metadata.
 */
export default function ProjectPage() {
  return <Home />;
}
