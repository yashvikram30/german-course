import { getUserId } from "@/lib/auth";
import { getContents, getDueCount } from "@/lib/data";
import { HeaderBar } from "./HeaderBar";

export async function Header() {
  const [contents, due, userId] = await Promise.all([getContents(), getDueCount(), getUserId()]);
  return <HeaderBar contents={contents} due={due} signedIn={userId !== null} />;
}
