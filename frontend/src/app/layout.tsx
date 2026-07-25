import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ORION_BUILD } from "@/lib/orion-build";
import "./globals.css";
export const metadata: Metadata = { title: { default: `${ORION_BUILD.product} · ${ORION_BUILD.interface}`, template: `%s · ${ORION_BUILD.interface}` }, description: `${ORION_BUILD.productName} — a secure AI operations command centre.` };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#05070b" };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en" className="h-full bg-slate-950 antialiased"><body className="min-h-full">{children}</body></html>; }
