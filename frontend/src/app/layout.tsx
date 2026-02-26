import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gasometer — Cost Intelligence",
  description: "Gas Town cost tracking and visualization dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-6">
          <span className="text-lg font-bold text-amber-400">⛽ Gasometer</span>
          <a href="/" className="text-gray-300 hover:text-white text-sm">
            Dashboard
          </a>
          <a href="/sessions" className="text-gray-300 hover:text-white text-sm">
            Sessions
          </a>
          <a href="/live" className="text-gray-300 hover:text-white text-sm">
            Live
          </a>
        </nav>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
