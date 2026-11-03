"use client";

import { StatusIcon } from "~/components/status-icon";
import { openProject } from "~/lib/peek";

/** The one thing in progress right now; opens it in the peek sheet. */
export function NowPill({ title, label }: { title: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => openProject(title)}
      className="group text-fg-2 pointer-fine:hover:text-fg inline-flex h-7 items-center gap-2 rounded-full border border-white/10 bg-white/[.06] pr-3 pl-2 text-[12.5px] backdrop-blur-xl transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] pointer-coarse:h-10 pointer-fine:hover:bg-white/10"
    >
      <StatusIcon status="progress" />
      <span className="text-fg-3">Now</span>
      <span>{label}</span>
    </button>
  );
}
