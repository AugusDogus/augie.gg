import { LockSimpleIcon } from "@phosphor-icons/react";
import type { Project } from "~/content/projects";
import { cn } from "~/lib/utils";

/** Whether a project without captures still has something to say in their place. */
export function hasCover(project: Project): boolean {
  return project.highlight !== undefined || project.private === true;
}

/**
 * In place of captures: the project's evidence line, set as type, and why
 * there's nothing to look at. Never an empty frame. `compact` fits a small
 * fixed box, such as a rail card.
 */
export function NoMedia({
  project,
  size = "regular",
  className,
}: {
  project: Project;
  size?: "regular" | "compact";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-end rounded-[10px] bg-[radial-gradient(110%_120%_at_0%_100%,#8fe3f01a,transparent_55%),linear-gradient(180deg,#ffffff0a,#ffffff03)] shadow-[inset_0_0_0_1px_#ffffff12]",
        size === "regular" ? "gap-2.5 p-5" : "gap-2 p-4",
        className,
      )}
    >
      {project.highlight && (
        <p
          className={cn(
            "text-fg font-medium text-balance",
            size === "regular"
              ? "text-[17px]/[1.35] tracking-[-0.018em]"
              : "text-[14px]/[1.35] tracking-[-0.01em]",
          )}
        >
          {project.highlight}
        </p>
      )}
      {project.private && (
        <p className="text-fg-3 flex items-center gap-1.5 text-[12.5px]">
          <LockSimpleIcon aria-hidden="true" className="size-3.5 shrink-0" />
          Private repository, so no screenshots
        </p>
      )}
    </div>
  );
}
