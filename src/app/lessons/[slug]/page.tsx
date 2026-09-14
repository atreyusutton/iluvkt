import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonProgress } from "@/db/schema";
import { ALL_LESSONS, findLesson } from "@/content/lessons";
import { ChordDiagram } from "@/components/chord-diagram";
import { TutorialVideos } from "@/components/tutorial-videos";
import { ButtonLink, Card, CardTitle, PageHeader } from "@/components/ui";
import { getVideosWithBookmarks } from "@/lib/videos";
import { youtubeSearchUrl } from "@/lib/youtube";
import { LessonCompleteToggle } from "./complete-toggle";

export async function generateMetadata({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  return { title: findLesson(slug)?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/lessons/[slug]">) {
  const { slug } = await params;
  const found = findLesson(slug);
  if (!found) notFound();
  const { module, lesson } = found;

  const db = await getDb();
  const [[progress], videos] = await Promise.all([
    db.select().from(lessonProgress).where(eq(lessonProgress.lessonSlug, slug)),
    getVideosWithBookmarks({ lessonSlug: slug }),
  ]);

  const index = ALL_LESSONS.findIndex((item) => item.slug === slug);
  const previous = ALL_LESSONS[index - 1];
  const next = ALL_LESSONS[index + 1];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/lessons" className="hover:text-accent">
            ← Lessons · {module.title}
          </Link>
        }
        title={lesson.title}
        subtitle={lesson.summary}
        action={<LessonCompleteToggle slug={slug} completed={Boolean(progress)} />}
      />

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Card>
            <CardTitle action={<span className="text-sm text-ink-3">~{lesson.minutes} min</span>}>Steps</CardTitle>
            <ol className="space-y-3">
              {lesson.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {stepIndex + 1}
                  </span>
                  <span className="pt-0.5 text-ink-2">{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="rounded-2xl border border-rose/30 bg-rose-soft p-5">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose">Practice</div>
            <p className="text-ink">{lesson.practice}</p>
            {lesson.tool && (
              <ButtonLink href={lesson.tool.href} variant="rose" size="sm" className="mt-3">
                {lesson.tool.label} →
              </ButtonLink>
            )}
          </div>

          {lesson.chords && lesson.chords.length > 0 && (
            <Card>
              <CardTitle>Chords in this lesson</CardTitle>
              <div className="flex flex-wrap gap-4">
                {lesson.chords.map((chord) => (
                  <ChordDiagram key={chord} chord={chord} size={110} />
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardTitle>Tutorial videos</CardTitle>
          <TutorialVideos
            videos={videos}
            target={{ lessonSlug: slug }}
            searchHint={{ label: "Search YouTube for one", url: youtubeSearchUrl(lesson.youtubeSearch) }}
          />
        </Card>
      </div>

      <nav className="flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-sm">
        {previous ? (
          <Link href={`/lessons/${previous.slug}`} className="text-ink-2 hover:text-accent">
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/lessons/${next.slug}`} className="text-ink-2 hover:text-accent">
            {next.title} →
          </Link>
        )}
      </nav>
    </div>
  );
}
