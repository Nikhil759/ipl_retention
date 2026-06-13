import type { Metadata } from "next";
import { fetchDashboardStats } from "@/lib/admin-stats";

export const metadata: Metadata = {
  title: "Stats · Release or Retain",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const colors = {
  heading: "#ffffff",
  body: "#e5e7eb",
  muted: "#9ca3af",
  faint: "#6b7280",
  accent: "#fbbf24",
  cardBg: "rgba(255, 255, 255, 0.06)",
  cardBorder: "rgba(255, 255, 255, 0.12)",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 md:p-5"
      style={{
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.cardBorder}`,
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: colors.muted }}
      >
        {label}
      </p>
      <p
        className="mt-2 text-2xl md:text-3xl font-semibold tabular-nums"
        style={{ color: colors.heading }}
      >
        {value.toLocaleString()}
      </p>
      {hint && (
        <p className="mt-1.5 text-xs" style={{ color: colors.faint }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function formatDayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default async function AdminDashboardPage() {
  let stats;
  let error: string | null = null;

  try {
    stats = await fetchDashboardStats();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load stats";
  }

  const maxDaily = stats
    ? Math.max(1, ...stats.daily.map((d) => Math.max(d.views, d.completions)))
    : 1;

  return (
    <main className="min-h-dvh">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <header
          className="mb-8 md:mb-10 pb-6"
          style={{ borderBottom: `1px solid ${colors.cardBorder}` }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: colors.accent }}
          >
            Private · Release or Retain
          </p>
          <h1
            className="mt-2 text-2xl md:text-3xl font-semibold"
            style={{ color: colors.heading }}
          >
            Usage dashboard
          </h1>
          <p className="mt-2 text-sm" style={{ color: colors.muted }}>
            Squad completions, shares, and visits. Bookmark this URL — it is
            not linked from the app.
          </p>
        </header>

        {error ? (
          <div
            className="rounded-xl p-4 text-sm"
            style={{
              border: "1px solid rgba(248, 113, 113, 0.35)",
              backgroundColor: "rgba(248, 113, 113, 0.12)",
              color: "#fecaca",
            }}
          >
            {error}
            <p className="mt-2 text-xs" style={{ color: "#fca5a5" }}>
              Check SUPABASE_SERVICE_ROLE_KEY and that migration
              004_analytics.sql has been applied.
            </p>
          </div>
        ) : stats ? (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <StatCard
                label="Completed squad votes"
                value={stats.completedSquadVotes}
                hint="Finished all players for one team"
              />
              <StatCard
                label="Distinct voters"
                value={stats.distinctVoters}
                hint="Users who completed ≥1 squad"
              />
              <StatCard
                label="Super fans"
                value={stats.superFans}
                hint={`Completed all 10 squads · ${stats.superFanCouponClaims.toLocaleString()} claimed Encore coupon`}
              />
              <StatCard
                label="Total shares"
                value={stats.totalShares}
                hint={`${stats.sharesNative} native · ${stats.sharesCopy} copy link`}
              />
              <StatCard
                label="Page views"
                value={stats.totalPageViews}
                hint="Every tracked page load"
              />
              <StatCard
                label="Distinct visitors"
                value={stats.distinctVisitors}
                hint="Unique browser sessions"
              />
            </section>

            <section className="mt-8 md:mt-10">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: colors.muted }}
              >
                Last 7 days
              </h2>
              <div
                className="rounded-xl p-4 md:p-5"
                style={{
                  backgroundColor: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                }}
              >
                <div className="space-y-3">
                  {stats.daily.map((day) => (
                    <div
                      key={day.date}
                      className="grid grid-cols-[7rem_1fr] md:grid-cols-[9rem_1fr] gap-3 items-center"
                    >
                      <p className="text-xs" style={{ color: colors.muted }}>
                        {formatDayLabel(day.date)}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(day.views / maxDaily) * 100}%`,
                                backgroundColor: "#38bdf8",
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] w-16 text-right tabular-nums"
                            style={{ color: colors.body }}
                          >
                            {day.views} views
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 h-2.5 rounded-full overflow-hidden"
                            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                          >
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(day.completions / maxDaily) * 100}%`,
                                backgroundColor: "#34d399",
                              }}
                            />
                          </div>
                          <span
                            className="text-[11px] w-16 text-right tabular-nums"
                            style={{ color: colors.body }}
                          >
                            {day.completions} votes
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-8 md:mt-10">
              <h2
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: colors.muted }}
              >
                Completions by team
              </h2>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: `1px solid ${colors.cardBorder}` }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${colors.cardBorder}`,
                        backgroundColor: colors.cardBg,
                        color: colors.muted,
                      }}
                    >
                      <th className="px-4 py-3 font-medium text-left text-xs uppercase tracking-wider">
                        Team
                      </th>
                      <th className="px-4 py-3 font-medium text-right text-xs uppercase tracking-wider">
                        Completions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.completionsByTeam.length === 0 ? (
                      <tr>
                        <td
                          colSpan={2}
                          className="px-4 py-6 text-center"
                          style={{ color: colors.faint }}
                        >
                          No completed votes yet
                        </td>
                      </tr>
                    ) : (
                      stats.completionsByTeam.map((row) => (
                        <tr
                          key={row.teamCode}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        >
                          <td className="px-4 py-3" style={{ color: colors.body }}>
                            <span
                              className="font-medium"
                              style={{ color: colors.heading }}
                            >
                              {row.teamCode}
                            </span>
                            <span style={{ color: colors.faint }}>
                              {" "}
                              · {row.teamName}
                            </span>
                          </td>
                          <td
                            className="px-4 py-3 text-right tabular-nums"
                            style={{ color: colors.body }}
                          >
                            {row.count.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <p
              className="mt-8 text-xs text-center"
              style={{ color: colors.faint }}
            >
              Updated {new Date(stats.updatedAt).toLocaleString("en-IN")} ·
              refresh to reload
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
