import { ProjectMedia } from "~/components/work/project-media";
import type { Media, Project } from "~/content/projects";
import { cn } from "~/lib/utils";

export const leadOf = (project: Project): Media | undefined =>
  project.media?.[0];

/** A phone capture after the lead, for setting in front of a desktop one. */
export const phoneOf = (project: Project): Media | undefined =>
  project.media?.[0]?.frame === "desktop"
    ? project.media.slice(1).find((media) => media.frame === "phone")
    : undefined;

/**
 * A project's lead capture, with its phone capture set in front of the lower
 * right corner when it has one. The phone hangs 7% of the width below the
 * lead; `overhang` reserves that room in the layout.
 */
export function Showcase({
  project,
  lead,
  sizes,
  decorative = false,
  overhang = false,
  className,
}: {
  project: Project;
  lead: Media;
  sizes: string;
  decorative?: boolean;
  overhang?: boolean;
  className?: string;
}) {
  const phone = phoneOf(project);
  return (
    // Container units, so the overhang and the room for it both follow the width.
    <div
      className={cn(
        "@container relative",
        phone && overhang && "mb-[7%]",
        className,
      )}
    >
      <ProjectMedia media={lead} sizes={sizes} decorative={decorative} />
      {phone && (
        <ProjectMedia
          media={phone}
          sizes="180px"
          decorative={decorative}
          className="absolute right-[5cqw] -bottom-[7cqw] w-[20cqw] drop-shadow-[0_18px_30px_#000000a6]"
        />
      )}
    </div>
  );
}
