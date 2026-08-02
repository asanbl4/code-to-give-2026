import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible,
  Bricolage_Grotesque,
  Patrick_Hand,
} from "next/font/google";
import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-handwritten",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Love 21 Foundation",
    template: "%s — Love 21 Foundation",
  },
  description:
    "Love 21 empowers the Down syndrome, autistic, and neurodiverse community in Hong Kong through sport, nutrition, and family support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${bricolage.variable} ${patrickHand.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        {/* Mounted in the root layout, so the assistant is reachable from every
            route rather than only the landing page.

            No bottom padding on <body>: the landing page now ends in a designed
            footer, and reserving a strip under it left a white band that looked
            broken. The launcher floats over the footer's corner instead, which
            is what every other floating assistant does. */}
        <ChatLauncher />
      </body>
    </html>
  );
}
