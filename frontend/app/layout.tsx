import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
