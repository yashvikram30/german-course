import { AuthForm } from "./AuthForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="ui !mb-2 text-[2.6rem] font-bold leading-tight tracking-tight">Deutsch <span className="font-normal text-muted">von Anfang an</span></h1>
      <p className="!mt-0 text-lg text-muted">Sign in to keep your progress, highlights and notes.</p>
      <AuthForm initialMode={sp.mode === "signup" ? "signup" : "login"} />
    </div>
  );
}
