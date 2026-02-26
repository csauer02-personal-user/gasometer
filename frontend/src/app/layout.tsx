import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/ui/Nav";

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
        <Nav />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
