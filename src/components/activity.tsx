import type { ReactNode } from "react";
import { ActivityGraph } from "~/components/activity-graph";
import {
  busiestDay,
  placeDays,
  relevel,
  shortDate,
  streaks,
  summary,
} from "~/lib/activity";
import { fetchContributionCalendar } from "~/lib/github";
import { cn } from "~/lib/utils";

const SUMMARY_ID = "activity-summary";

export async function Activity() {
  const result = await fetchContributionCalendar();
  if (!result.ok) {
    // Proof, not structure: without the calendar the column closes up.
    console.error(`[activity] hidden: ${result.reason}`);
    return null;
  }
  const { total, weeks, firstDay, lastDay } = result.calendar;
  const shaded = relevel(weeks);
  const days = placeDays(shaded);
  const { longest, current } = streaks(days);
  const unbroken = current === longest && current > 0;
  const busiest = busiestDay(days);
  return (
    <section aria-labelledby="activity-title" className="material p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[13px]">
        <h2 id="activity-title" className="text-fg-2 font-medium">
          Activity
        </h2>
        <p className="text-fg-2 text-balance">
          <span className="text-fg font-medium tabular-nums">
            {total.toLocaleString("en-US")}
          </span>{" "}
          contributions in the last year
        </p>
      </header>
      <ActivityGraph weeks={shaded} describedBy={SUMMARY_ID} />
      <noscript>
        <style>{"[data-week]{opacity:1!important}"}</style>
      </noscript>
      <p id={SUMMARY_ID} className="sr-only">
        {summary(total, firstDay, lastDay, longest)}
      </p>
      <dl
        className={cn(
          "border-line mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t pt-4 sm:grid sm:gap-x-4",
          // On phones each stat keeps its line and wraps whole when the row is too narrow.
          unbroken ? "sm:grid-cols-2" : "sm:grid-cols-3",
        )}
      >
        {unbroken ? (
          <Stat label="Streak">
            <Days count={current} />{" "}
            <span className="text-fg-2">and counting</span>
          </Stat>
        ) : (
          <>
            <Stat label="Longest streak">
              <Days count={longest} />
            </Stat>
            <Stat label="Current streak">
              <Days count={current} />
            </Stat>
          </>
        )}
        <Stat label="Busiest day">
          {busiest ? (
            <>
              {busiest.count.toLocaleString("en-US")}{" "}
              <span className="text-fg-2">
                on {shortDate(busiest.date, lastDay)}
              </span>
            </>
          ) : (
            <span className="text-fg-2">None yet</span>
          )}
        </Stat>
      </dl>
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-fg-3 text-[12px]/4">{label}</dt>
      <dd className="text-fg mt-1 text-[14px]/5 whitespace-nowrap tabular-nums">
        {children}
      </dd>
    </div>
  );
}

function Days({ count }: { count: number }) {
  return (
    <>
      {count.toLocaleString("en-US")}{" "}
      <span className="text-fg-2">{count === 1 ? "day" : "days"}</span>
    </>
  );
}
