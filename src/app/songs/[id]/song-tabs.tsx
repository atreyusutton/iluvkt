"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

export function SongTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div className="sticky top-14 z-20 -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-border bg-bg/95 px-4 backdrop-blur md:top-0 md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition",
              active === tab.id ? "border-accent text-accent" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
