import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "O.R.I.O.N. Mission Control",
  description: "Operational Response and Intelligent Orchestration Network dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
