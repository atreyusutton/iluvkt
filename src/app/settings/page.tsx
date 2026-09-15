import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { Card, CardTitle, PageHeader, Pill } from "@/components/ui";
import { getServiceStatus } from "@/lib/services";
import { getTimezone } from "@/lib/timezone";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const db = await getDb();
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  const services = getServiceStatus();
  const timeZone = await getTimezone();

  const checks = [
    {
      name: "Practice data",
      ok: true,
      live: services.database === "neon" ? "Neon Postgres" : "Saved on this computer",
      detail: services.database === "neon" ? null : <>Sessions, journals, drills and progress live in <code>.data/</code> inside the project folder.</>,
    },
    {
      name: "Recordings",
      ok: true,
      live: services.recordings === "blob" ? "Vercel Blob (private)" : "Saved on this computer",
      detail: services.recordings === "blob" ? null : <>Every take is a file in the project&apos;s <code>recordings/</code> folder.</>,
    },
    {
      name: "AI journal",
      ok: services.ai === "gateway",
      live: "Vercel AI Gateway",
      detail:
        services.ai === "gateway" ? (
          <>If entries fail, add a card to AI Gateway in your Vercel dashboard and put a long-lived <code>AI_GATEWAY_API_KEY</code> in <code>.env.local</code>.</>
        ) : (
          <>Create an AI Gateway API key in your Vercel dashboard and add <code>AI_GATEWAY_API_KEY=…</code> to <code>.env.local</code>, then restart. Until then sessions still save and journals can be retried.</>
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
          <CardTitle>Where your data lives</CardTitle>
          <ul className="divide-y divide-border">
            {checks.map((check) => (
              <li key={check.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{check.name}</span>
                  <Pill tone={check.ok ? "good" : "warn"}>{check.ok ? check.live : "Not set up"}</Pill>
                </div>
                {check.detail && (
                  <p className="mt-1.5 text-sm text-ink-2 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
                    {check.detail}
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

      <Card>
        <CardTitle>Backups</CardTitle>
        <p className="text-sm text-ink-2 [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
          Everything is on this computer only (both folders are left out of git). To back up, copy <code>.data/</code> and{" "}
          <code>recordings/</code> together while the app is stopped — or let Time Machine cover the project folder.
        </p>
      </Card>
    </div>
  );
}
