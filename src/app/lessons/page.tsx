import Link from "next/link";
import { getDb } from "@/db";
import { lessonProgress } from "@/db/schema";
import { ALL_LESSONS, MODULES } from "@/content/lessons";
import { ButtonLink, Card, PageHeader, Pill, ProgressBar, cn } from "@/components/ui";

export const metadata = { title: "Lessons" };

export default async function LessonsPage() {
  const db = await getDb();
  const completed = new Set((await db.select().from(lessonProgress)).map((row) => row.lessonSlug));
  const upNext = ALL_LESSONS.find((lesson) => !completed.has(lesson.slug));
  const doneCount = ALL_LESSONS.filter((lesson) => completed.has(lesson.slug)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lessons"
        subtitle="A beginner path built around Don't Think Twice, It's All Right."
        action={upNext && <ButtonLink href={`/lessons/${upNext.slug}`}>Continue: {upNext.title}</ButtonLink>}
      />

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Course progress</span>
          <span className="tabular-nums text-ink-3">
            {doneCount} / {ALL_LESSONS.length} lessons
          </span>
        </div>
        <ProgressBar value={doneCount} max={ALL_LESSONS.length} tone={doneCount === ALL_LESSONS.length ? "good" : "accent"} />
      </Card>

      {MODULES.map((module) => {
        const moduleDone = module.lessons.filter((lesson) => completed.has(lesson.slug)).length;
        return (
          <section key={module.slug} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-semibold">{module.title}</h2>
                <p className="text-sm text-ink-2">{module.description}</p>
              </div>
              <div className="flex w-40 items-center gap-2">
                <ProgressBar value={moduleDone} max={module.lessons.length} tone={moduleDone === module.lessons.length ? "good" : "accent"} />
                <span className="text-xs tabular-nums text-ink-3">
                  {moduleDone}/{module.lessons.length}
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {module.lessons.map((lesson) => {
                const done = completed.has(lesson.slug);
                const isNext = upNext?.slug === lesson.slug;
                return (
                  <Link
                    key={lesson.slug}
                    href={`/lessons/${lesson.slug}`}
                    className={cn(
                      "group flex flex-col rounded-2xl border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                      isNext ? "border-accent ring-2 ring-accent/20" : "border-border",
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {isNext ? <Pill tone="accent">Up next</Pill> : <span className="text-xs text-ink-3">{lesson.minutes} min</span>}
                      <span
                        aria-label={done ? "Completed" : "Not completed"}
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-full border text-xs",
                          done ? "border-good bg-good text-white" : "border-border text-transparent",
                        )}
                      >
                        ✓
                      </span>
                    </div>
                    <h3 className="font-medium group-hover:text-accent">{lesson.title}</h3>
                    <p className="mt-1 text-sm text-ink-2">{lesson.summary}</p>
                    {isNext && <span className="mt-2 text-xs text-ink-3">{lesson.minutes} min</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
