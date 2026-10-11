import type { Metadata } from "next";
import { allProjects } from "~/lib/projects";
import { HomeIntro } from "../_components/home-intro";
import { ProjectIndex } from "./project-index";

export const metadata: Metadata = { title: "Prototype 3 · Index" };

export default function IndexPrototype() {
  return (
    <div className="space-y-6">
      <HomeIntro />
      <ProjectIndex projects={allProjects} />
    </div>
  );
}
