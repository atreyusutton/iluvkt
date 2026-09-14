import Link from "next/link";
import { eq, max } from "drizzle-orm";
import { getDb } from "@/db";
import { drillResults } from "@/db/schema";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Tools" };

export default async function ToolsPage() {
  const db = await getDb();
  const [[chordBest], [fretBest]] = await Promise.all([
    db.select({ value: max(drillResults.score) }).from(drillResults).where(eq(drillResults.type, "chord-change")),
    db.select({ value: max(drillResults.score) }).from(drillResults).where(eq(drillResults.type, "fretboard")),
  ]);

  const tools = [
    { href: "/tools/tuner", emoji: "🎯", title: "Tuner", description: "Tune by ear-free: play a string and watch the needle." },
    { href: "/tools/metronome", emoji: "⏱️", title: "Metronome", description: "Steady click with tap tempo and accents." },
    { href: "/tools/chords", emoji: "🖐️", title: "Chord library", description: "Finger diagrams and tips for every chord you'll need." },
    {
      href: "/tools/chord-changes",
      emoji: "🔁",
      title: "One-minute changes",
      description: "Count clean chord switches in 60 seconds.",
      stat: chordBest.value != null ? `Best: ${chordBest.value}` : undefined,
    },
    {
      href: "/tools/fretboard",
      emoji: "🧭",
      title: "Fretboard trainer",
      description: "Learn the notes on the neck in 60-second rounds.",
      stat: fretBest.value != null ? `Best: ${fretBest.value}` : undefined,
    },
  ];

  return (
    <div>
      <PageHeader title="Tools" subtitle="Everything you need around the practice itself." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group">
            <Card className="h-full transition group-hover:border-accent">
              <div className="text-3xl">{tool.emoji}</div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold">{tool.title}</h2>
                {tool.stat && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">{tool.stat}</span>}
              </div>
              <p className="mt-1 text-sm text-ink-2">{tool.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
