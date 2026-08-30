import type { Metadata } from "next";
import { AuroraQueryProvider } from "@/components/aurora/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "O.R.I.O.N. Mission Control",
  description: "Operational Response and Intelligent Orchestration Network dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full">
        <AuroraQueryProvider>{children}</AuroraQueryProvider>
      </body>
    </html>
  );
}
