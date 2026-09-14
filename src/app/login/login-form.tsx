"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/misc";
import { Button } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, { error: null });
  return (
    <form action={action} className="space-y-3 text-left">
      <input type="hidden" name="next" value={next} />
      <input name="password" type="password" autoFocus required placeholder="Password" className="field h-12 text-base" />
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Come on in"}
      </Button>
    </form>
  );
}
