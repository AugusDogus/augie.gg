import { CalendarReadout } from "~/components/calendar-readout";
import {
  GRID_HEIGHT,
  gridWidth,
  monthYear,
  placeDays,
  printPaths,
  splitWeeks,
  summary,
} from "~/lib/contribution-print";
import { type ContributionDay, fetchContributionCalendar } from "~/lib/github";
import { cn } from "~/lib/utils";

const SUMMARY_ID = "contribution-summary";

export async function ContributionCalendar() {
  const result = await fetchContributionCalendar();
  if (!result.ok) {
    // Proof, not structure: an outage hides the figure and its margins close up.
    console.error(`[contribution-calendar] hidden: ${result.reason}`);
    return null;
  }
  const { total, weeks, firstDay, lastDay } = result.calendar;
  const [start, end] = splitWeeks(weeks);
  return (
    <figure
      className="cal mt-[26px] mb-[30px] w-fit max-w-full"
      data-weeks={weeks.length}
    >
      <CalendarReadout
        weeks={weeks.map((week) =>
          week.map((day) => day && { date: day.date, count: day.count }),
        )}
        total={total}
        summaryId={SUMMARY_ID}
        halves={[
          <Half
            key="start"
            weeks={start}
            label={monthYear(firstDay)}
            align="start"
          />,
          <Half key="end" weeks={end} label={monthYear(lastDay)} align="end" />,
        ]}
      />
      <p id={SUMMARY_ID} className="sr-only">
        {summary(placeDays(weeks), total)}
      </p>
    </figure>
  );
}

function Half({
  weeks,
  label,
  align,
}: {
  weeks: readonly (ContributionDay | null)[][];
  label: string;
  align: "start" | "end";
}) {
  const width = gridWidth(weeks.length);
  return (
    <>
      <svg
        width={width}
        height={GRID_HEIGHT}
        viewBox={`0 0 ${width} ${GRID_HEIGHT}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
        className="block"
      >
        {printPaths(weeks).map((d, ink) =>
          d === "" ? null : <path key={ink} className={`i${ink}`} d={d} />,
        )}
      </svg>
      <span
        className={cn(
          "end mt-1.5 block text-[13px]/[1.3] text-(--muted) tabular-nums",
          align === "end" && "text-right",
        )}
      >
        {label}
      </span>
    </>
  );
}
