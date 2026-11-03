import type { Label } from "~/content/projects";

export type Status = "progress" | "live" | "archived" | "review";

/** The project's state in one word, from its labels; open source entries have none. */
export function statusOf(labels: readonly Label[] | undefined): Status | null {
  for (const label of labels ?? []) {
    switch (label) {
      case "wip":
        return "progress";
      case "active":
        return "live";
      case "archived":
        return "archived";
      case "pending":
        return "review";
      case "oss":
        continue;
      default: {
        const unreachable: never = label;
        return unreachable;
      }
    }
  }
  return null;
}

export const STATUS_LABEL: Readonly<Record<Status, string>> = {
  progress: "In progress",
  live: "Live",
  archived: "Archived",
  review: "In review",
};

/** Linear-style status glyphs, 14px: a half-filled ring for work in progress, a filled check for live. */
export function StatusIcon({ status }: { status: Status }) {
  switch (status) {
    case "progress":
      return (
        <svg
          viewBox="0 0 14 14"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="#f2c94c"
            strokeWidth="1.5"
          />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="#f2c94c" />
        </svg>
      );
    case "live":
      return (
        <svg
          viewBox="0 0 14 14"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="6.25" fill="#4cd7a0" />
          <path
            d="m4.4 7.2 1.8 1.8 3.4-3.6"
            fill="none"
            stroke="#0a1317"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "review":
      return (
        <svg
          viewBox="0 0 14 14"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="#8fe3f0"
            strokeWidth="1.5"
          />
          <path d="M7 3.5a3.5 3.5 0 1 1-3.03 1.75L7 7z" fill="#8fe3f0" />
        </svg>
      );
    case "archived":
      return (
        <svg
          viewBox="0 0 14 14"
          className="size-3.5 shrink-0"
          aria-hidden="true"
        >
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="#eef4f675"
            strokeWidth="1.5"
            strokeDasharray="2.2 2"
          />
        </svg>
      );
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}
