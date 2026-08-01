import { ContributionDay } from "~/components/contribution-day";
import { TooltipProvider } from "~/components/ui/tooltip";
import { fetchContributionCalendar } from "~/lib/github";

/**
 * Square and gap sizing, shared by the grid, blank cells, and day squares so
 * they can't drift apart. Shrunk below md so all ~53 week columns fit narrow
 * viewports (53×4 + 52×1 = 264px) instead of clipping the newest weeks.
 */
const gridGap = "gap-[1px] md:gap-[3px]";
const square = "size-[4px] rounded-[2px] md:size-[9px]";

/** GitHub's own five-step scale, derived from the max in the current window. */
function level(count: number, max: number): string {
  if (count === 0) return "bg-foreground/[0.06]";
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return "bg-foreground/20";
  if (ratio < 0.5) return "bg-foreground/40";
  if (ratio < 0.75) return "bg-foreground/60";
  return "bg-foreground/85";
}

function monthRange(firstDay: string, lastDay: string): string {
  const format = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  return `${format(firstDay)} – ${format(lastDay)}`;
}

/**
 * Dates are calendar days, not instants, so noon UTC keeps the day stable when
 * rendered in Chicago time (midnight UTC is still the previous evening there).
 * Pinned to America/Chicago so every visitor sees the same day regardless of
 * their own timezone.
 */
function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
}

export async function ContributionGraph() {
  const result = await fetchContributionCalendar();

  if (!result.ok) {
    // Decorative, so a GitHub outage shouldn't take the page down or render a
    // graph that lies. Logged so it's visible in deploy logs rather than silent.
    console.error(`[contribution-graph] hidden: ${result.reason}`);
    return null;
  }

  const { total, weeks, firstDay, lastDay } = result.calendar;
  const max = Math.max(...weeks.flat().map((day) => day?.count ?? 0), 1);

  return (
    <TooltipProvider>
      <section className="space-y-2" aria-label="GitHub contributions">
        <div className={`flex overflow-hidden ${gridGap}`}>
          {weeks.map((week, w) => (
            <div key={w} className={`flex flex-col ${gridGap}`}>
              {week.map((day, d) =>
                day === null ? (
                  <div key={d} className={square} aria-hidden="true" />
                ) : (
                  <ContributionDay
                    key={d}
                    className={`${square} ${level(day.count, max)}`}
                    label={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${dayLabel(day.date)}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>
        <p className="text-muted-foreground/60 text-xs">
          {total.toLocaleString()} contributions ·{" "}
          {monthRange(firstDay, lastDay)}
        </p>
      </section>
    </TooltipProvider>
  );
}
