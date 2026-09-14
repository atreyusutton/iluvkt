import { createSong } from "@/app/actions/songs";
import { Button, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Add song" };

export default function NewSongPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Add a song" subtitle="You can paste the chord sheet and set up sections after." />
      <Card>
        <form action={createSong} className="space-y-4">
          <label className="block">
            <span className="label">Title</span>
            <input name="title" required className="field" />
          </label>
          <label className="block">
            <span className="label">Artist</span>
            <input name="artist" className="field" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Capo fret</span>
              <input name="capo" type="number" min={0} max={12} defaultValue={0} className="field" />
            </label>
            <label className="block">
              <span className="label">Target tempo (BPM)</span>
              <input name="targetBpm" type="number" min={30} max={260} defaultValue={100} className="field" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="fingerpicked" /> Fingerpicked (adds the basic Travis pattern)
          </label>
          <Button type="submit">Create song</Button>
        </form>
      </Card>
    </div>
  );
}
