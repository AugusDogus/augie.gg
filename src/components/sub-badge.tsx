"use client";

import Image from "next/image";
import badge from "~/assets/theo-sub-badge.png";
import { SubMonths } from "~/components/sub-months";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

/**
 * The Twitch subscription as chat shows it: the channel's subscriber badge,
 * with the months on hover or focus. A touch screen cannot hover, so the
 * months sit beside the badge there, and print spells the whole thing out
 * (resume.css). The words are always in the page, for screen readers.
 */
export function SubBadge({ initial }: { initial: number }) {
  const months = <SubMonths initial={initial} />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="sub-badge">
          <Image src={badge} alt="" width={18} height={18} />
          <span className="sub-badge-months">
            <span className="sub-badge-what">Twitch sub for </span>
            {months} months
          </span>
        </button>
      </TooltipTrigger>
      {/* Below, where the sheet is empty: above would cover the row before. */}
      <TooltipContent
        side="bottom"
        className="flex-col gap-1.5 px-3 pt-2.5 pb-2 text-center"
      >
        <Image src={badge} alt="" width={36} height={36} />
        <span aria-hidden="true">
          Subscriber
          <br />({months} Months)
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
