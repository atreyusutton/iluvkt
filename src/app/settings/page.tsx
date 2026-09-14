import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { Card, CardTitle, PageHeader, Pill } from "@/components/ui";
import { getServiceStatus } from "@/lib/services";
import { getTimezone } from "@/lib/timezone";
import { DemoData } from "./demo-data";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  const services = getServiceStatus();
  const timeZone = await getTimezone();

  const checks = [
    {
      name: "Database",
      ok: services.database === "neon",
      live: "Neon Postgres",
      fallback: "Local (PGlite in .data/)",
      howTo: (
        <>
          Accept Neon&apos;s terms in the Vercel dashboard, then run <code>vercel integration add neon</code> and{" "}
          <code>vercel env pull</code>.
        </>
      ),
    },
    {
      name: "Recordings",
      ok: true,
      live: services.recordings === "blob" ? "Vercel Blob (private)" : "This project's recordings/ folder",
      fallback: "",
      howTo: null,
    },
    {
      name: "AI journal",
      ok: services.ai === "gateway",
      live: "Vercel AI Gateway",
      fallback: "Off — journals wait until enabled",
      howTo: (
        <>
          Run <code>vercel env pull</code> (provides <code>VERCEL_OIDC_TOKEN</code> locally), or set <code>AI_GATEWAY_API_KEY</code>.
        </>
      ),
    },
    {
      name: "Password",
      ok: services.password === "on",
      live: "On",
      fallback: "Off — anyone with the URL can open the site",
      howTo: (
        <>
          Run <code>vercel env add APP_PASSWORD</code>, then <code>vercel env pull</code> and restart.
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Practice goals</CardTitle>
          <SettingsForm
            initial={{
              dailyGoalMinutes: row?.dailyGoalMinutes ?? 30,
              playingFor: row?.playingFor ?? "",
              performanceDate: row?.performanceDate ?? "",
              performanceNote: row?.performanceNote ?? "",
            }}
          />
        </Card>

        <Card className="h-fit">
          <CardTitle>Setup status</CardTitle>
          <ul className="divide-y divide-border">
            {checks.map((check) => (
              <li key={check.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{check.name}</span>
                  <Pill tone={check.ok ? "good" : "warn"}>{check.ok ? check.live : check.fallback}</Pill>
                </div>
                {!check.ok && (
                  <p className="mt-1.5 text-sm text-ink-2 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
                    {check.howTo}
                  </p>
                )}
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-3 last:pb-0">
              <span className="font-medium">Timezone</span>
              <span className="text-sm text-ink-2">{timeZone}</span>
            </li>
          </ul>
        </Card>
      </div>

      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardTitle>Demo data</CardTitle>
          <DemoData />
        </Card>
      )}
    </div>
  );
}
