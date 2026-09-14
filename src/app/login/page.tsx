import { redirect } from "next/navigation";
import { isPasswordProtected } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!isPasswordProtected()) redirect("/");
  const { next } = await searchParams;
  return (
    <div className="grid min-h-[70dvh] place-items-center">
      <div className="w-full max-w-sm text-center">
        <div className="font-display text-5xl font-semibold">
          iluv<span className="text-rose">kt</span>
        </div>
        <p className="mb-8 mt-2 text-ink-2">Your guitar practice room</p>
        <LoginForm next={typeof next === "string" ? next : "/"} />
      </div>
    </div>
  );
}
