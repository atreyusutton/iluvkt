import { PageHeader } from "@/components/ui";
import { Tuner } from "./tuner";

export const metadata = { title: "Tuner" };

export default function TunerPage() {
  return (
    <div>
      <PageHeader eyebrow="Tools" title="Tuner" subtitle="Standard tuning: E A D G B E. Pluck one string at a time and let it ring." />
      <Tuner />
    </div>
  );
}
