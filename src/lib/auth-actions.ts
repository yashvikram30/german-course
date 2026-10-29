"use server";

import { redirect } from "next/navigation";
import { mongo } from "@/db/mongo";
import { checkPassword, endSession, hashPassword, startSession } from "./auth";

export interface AuthState { error?: string; email?: string }

const clean = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = clean(form.get("email")).toLowerCase();
  const name = clean(form.get("name")).slice(0, 60);
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: "Enter a valid email address.", email };
  if (password.length < 8 || password.length > 200) return { error: "The password needs at least 8 characters.", email };

  const { users } = await mongo();
  let id: string;
  try {
    id = String((await users.insertOne({ email, name, passwordHash: await hashPassword(password), createdAt: Date.now() })).insertedId);
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { error: "There is already an account with this email. Log in instead.", email };
    throw e;
  }
  await startSession(id);
  redirect("/");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = clean(form.get("email")).toLowerCase();
  const password = typeof form.get("password") === "string" ? (form.get("password") as string) : "";
  const user = await (await mongo()).users.findOne({ email });
  // Same message for an unknown email and a wrong password.
  if (!user || !(await checkPassword(password, user.passwordHash))) return { error: "Wrong email or password.", email };
  await startSession(String(user._id));
  redirect("/");
}

export async function logOut() {
  await endSession();
  redirect("/login");
}
