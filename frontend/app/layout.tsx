import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";
import "./globals.css";

// Atkinson Hyperlegible was drawn by the Braille Institute to keep letterforms
// distinguishable for low-vision readers. For a community that includes people
// with Down syndrome and autism, that is a functional choice before a stylistic
// one -- and it happens to look like nothing else.
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Open apertures and a lot of energy. Headings only.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stories — Love 21 Foundation",
  description:
    "Members of the Love 21 Foundation community in Hong Kong, in their own words.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
