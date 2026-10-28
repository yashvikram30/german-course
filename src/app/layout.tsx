import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Caveat, Gentium_Plus, Geist_Mono, Literata } from "next/font/google";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import { Header } from "@/components/Header";

// Everything reads the local database, so never prerender.
export const dynamic = "force-dynamic";

const body = Literata({ variable: "--font-body", subsets: ["latin", "latin-ext"] });
const ui = Barlow_Semi_Condensed({ variable: "--font-ui", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const hand = Caveat({ variable: "--font-hand", subsets: ["latin", "latin-ext"] });
const ipa = Gentium_Plus({ variable: "--font-ipa", subsets: ["latin", "latin-ext"], weight: ["400", "700"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Deutsch von Anfang an",
  description: "A German grammar and reading book for beginners",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${ui.variable} ${hand.variable} ${mono.variable} ${ipa.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Header />
        <main className="px-4 pb-24 pt-8 sm:px-6">{children}</main>
        <ChatWidget />
      </body>
    </html>
  );
}
