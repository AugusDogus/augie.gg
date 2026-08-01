import { z } from "zod";
import { env } from "~/env.js";

const GITHUB_LOGIN = "AugusDogus";
const ENDPOINT = "https://api.github.com/graphql";

/** One day. The calendar only changes at day granularity. */
const REVALIDATE_SECONDS = 86_400;

/**
 * No date arguments: `contributionsCollection` defaults to the trailing twelve
 * months, so the window moves with the calendar instead of being pinned.
 */
const QUERY = `
  query ContributionCalendar($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
            }
          }
        }
      }
    }
  }
`;

const responseSchema = z.object({
  data: z.object({
    user: z
      .object({
        contributionsCollection: z.object({
          contributionCalendar: z.object({
            totalContributions: z.number(),
            weeks: z.array(
              z.object({
                contributionDays: z.array(
                  z.object({
                    date: z.string(),
                    weekday: z.number().min(0).max(6),
                    contributionCount: z.number(),
                  }),
                ),
              }),
            ),
          }),
        }),
      })
      .nullable(),
  }),
});

export interface ContributionDay {
  /** Calendar date, `YYYY-MM-DD`. */
  date: string;
  count: number;
}

export interface ContributionCalendar {
  total: number;
  /**
   * Weeks as columns, each a fixed 7 slots indexed by weekday (Sun..Sat).
   * `null` marks a day outside the window, which happens on the partial first
   * and last weeks. Callers render those as blanks to keep the grid aligned.
   */
  weeks: (ContributionDay | null)[][];
  firstDay: string;
  lastDay: string;
}

export type CalendarResult =
  | { ok: true; calendar: ContributionCalendar }
  | { ok: false; reason: string };

export async function fetchContributionCalendar(): Promise<CalendarResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: { login: GITHUB_LOGIN },
      }),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (cause) {
    return {
      ok: false,
      reason: `Could not reach ${ENDPOINT}: ${String(cause)}`,
    };
  }

  if (!response.ok) {
    // 401/403 here almost always means the token is missing, expired, or
    // revoked; GitHub returns 403 for unauthenticated GraphQL requests.
    return {
      ok: false,
      reason: `GitHub GraphQL returned ${response.status} ${response.statusText}. Check that GITHUB_TOKEN is valid.`,
    };
  }

  const parsed = responseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return {
      ok: false,
      reason: `Unexpected GitHub GraphQL response shape: ${parsed.error.message}`,
    };
  }

  const user = parsed.data.data.user;
  if (user === null) {
    return { ok: false, reason: `GitHub user "${GITHUB_LOGIN}" not found.` };
  }

  const calendar = user.contributionsCollection.contributionCalendar;
  const days = calendar.weeks.flatMap((week) => week.contributionDays);
  const firstDay = days.at(0);
  const lastDay = days.at(-1);
  if (firstDay === undefined || lastDay === undefined) {
    return {
      ok: false,
      reason: "GitHub returned an empty contribution calendar.",
    };
  }

  const weeks = calendar.weeks.map((week) => {
    const column: (ContributionDay | null)[] = [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ];
    for (const day of week.contributionDays) {
      column[day.weekday] = { date: day.date, count: day.contributionCount };
    }
    return column;
  });

  return {
    ok: true,
    calendar: {
      total: calendar.totalContributions,
      weeks,
      firstDay: firstDay.date,
      lastDay: lastDay.date,
    },
  };
}
