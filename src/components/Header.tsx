import { getContents, getDueCount } from "@/lib/data";
import { HeaderBar } from "./HeaderBar";

export function Header() {
  return <HeaderBar contents={getContents()} due={getDueCount()} />;
}
