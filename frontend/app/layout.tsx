import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import { ChatLauncher } from "@/features/chatbot/components/ChatLauncher";
import { TranslateProvider } from "@/features/i18n";
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

// `template` so each page contributes its own name; pages without a title fall
// back to `default` rather than inheriting whichever page was written first.
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
      className={`${atkinson.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Wraps everything, so the chosen language survives navigation and the
            chatbot's answers get translated along with the page. `lang` above
            stays "en" in the markup — TranslateProvider rewrites it on the
            client once it knows what was chosen. */}
        <TranslateProvider>
          {children}
          {/* Mounted in the root layout, so the assistant is reachable from every
              route rather than only the landing page.

              No bottom padding on <body>: the landing page now ends in a designed
              footer, and reserving a strip under it left a white band that looked
              broken. The launcher floats over the footer's corner instead, which
              is what every other floating assistant does. */}
          <ChatLauncher />
        </TranslateProvider>
      </body>
    </html>
  );
}
