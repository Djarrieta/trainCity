import type { Metadata } from "next";
import { Archivo_Black, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { ThemeToggle } from "./components/ThemeToggle";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "trainCity",
  description: "Train network planning application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full flex flex-col font-sans overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <nav className="border-b-2 border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-head text-xl font-bold">
                trainCity
              </Link>
              <div className="flex items-center gap-4 text-sm font-medium">
                <Link href="/" className="hover:text-primary-hover">
                  Map
                </Link>
                <Link href="/pathfinder" className="hover:text-primary-hover">
                  Pathfinder
                </Link>
                <Link href="/schedules" className="hover:text-primary-hover">
                  Schedules
                </Link>
              </div>
            </div>
            <ThemeToggle />
          </nav>
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
