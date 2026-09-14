import { PageHeader } from "@/components/ui";
import { ChordLibrary } from "./chord-library";

export const metadata = { title: "Chord library" };

export default function ChordsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tools"
        title="Chord library"
        subtitle="Numbers are fingers: 1 index, 2 middle, 3 ring, 4 pinky. × = don't play, ○ = open string."
      />
      <ChordLibrary />
    </div>
  );
}
