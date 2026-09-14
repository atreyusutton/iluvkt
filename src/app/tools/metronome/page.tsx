import { PageHeader } from "@/components/ui";
import { MetronomeTool } from "./metronome-tool";

export const metadata = { title: "Metronome" };

export default function MetronomePage() {
  return (
    <div>
      <PageHeader eyebrow="Tools" title="Metronome" subtitle="Press space to start or stop." />
      <MetronomeTool />
    </div>
  );
}
