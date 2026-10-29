"use client";

import { useActionState, useState } from "react";
import { logIn, signUp, type AuthState } from "@/lib/auth-actions";

const field = "ui mt-1 w-full rounded-sm border-2 border-rule bg-paper px-3 py-2 text-lg text-ink focus:border-blue focus:outline-none";

export function AuthForm({ initialMode }: { initialMode: "login" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signup" ? signUp : logIn, {});
  const signup = mode === "signup";

  return (
    <form action={action} className="mt-6 space-y-4" key={mode}>
      {signup && (
        <label className="ui block text-base font-medium">
          Name <span className="text-muted">(optional)</span>
          <input name="name" autoComplete="name" className={field} />
        </label>
      )}
      <label className="ui block text-base font-medium">
        Email
        <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className={field} />
      </label>
      <label className="ui block text-base font-medium">
        Password {signup && <span className="text-muted">(at least 8 characters)</span>}
        <input name="password" type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} className={field} />
      </label>
      {state.error && <p role="alert" className="ui !my-0 text-base font-medium text-red">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-solid w-full justify-center">
        {pending ? "One moment…" : signup ? "Create account" : "Log in"}
      </button>
      <p className="ui !my-0 text-base text-muted">
        {signup ? "Already have an account? " : "New here? "}
        <button type="button" className="underline hover:text-ink" onClick={() => setMode(signup ? "login" : "signup")}>
          {signup ? "Log in" : "Create an account"}
        </button>
      </p>
    </form>
  );
}
