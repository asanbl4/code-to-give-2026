import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Love 21 Calendar Sign-Up",
  description: "Browse Love 21 sessions and submit a calm, accessible calendar sign-up.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
