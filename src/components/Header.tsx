import { getContents, getDueCount } from "@/lib/data";
import { HeaderBar } from "./HeaderBar";

export async function Header() {
  const [contents, due] = await Promise.all([getContents(), getDueCount()]);
  return <HeaderBar contents={contents} due={due} />;
}
