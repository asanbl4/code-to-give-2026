import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Love 21",
  description: "Love 21 Foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-xl text-slate-900 tracking-tight">
              Love <span className="text-love21-red">21</span>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link 
                href="/instagram" 
                className="text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
              >
                Instagram
              </Link>
              <Link 
                href="/get-involved" 
                className="bg-love21-red hover:bg-love21-red-hover text-white font-semibold text-sm py-2 px-4 rounded-xl transition-colors shadow-sm"
              >
                Get Involved
              </Link>
            </nav>
          </div>
        </header>
        
        {children}
      </body>
    </html>
  );
}