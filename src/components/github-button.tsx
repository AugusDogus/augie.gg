"use client";

import { GithubLogoIcon } from "@phosphor-icons/react";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { GITHUB_URL } from "~/lib/site";

// A client component: the trigger's slot can't clone a server-rendered child.
export function GithubButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="secondary"
          className="text-fg-2 hover:text-fg size-9 bg-[#16232acc] px-0 hover:bg-[#213038d9] pointer-coarse:size-10 [&_svg]:size-[18px]"
          asChild
        >
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
          >
            <GithubLogoIcon aria-hidden="true" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">GitHub</TooltipContent>
    </Tooltip>
  );
}
