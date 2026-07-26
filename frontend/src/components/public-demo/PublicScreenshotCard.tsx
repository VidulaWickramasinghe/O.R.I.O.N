import Image from "next/image";
import type { PortfolioScreenshot } from "@/types/portfolio";

export function PublicScreenshotCard({ screenshot }: { screenshot: PortfolioScreenshot }) {
  return <article className="overflow-hidden rounded-[1.75rem] border border-white/10"><Image src={screenshot.imagePath} alt={screenshot.title} width={1280} height={720} unoptimized className="aspect-video w-full object-cover" /><div className="p-5"><h3 className="font-black text-white">{screenshot.title}</h3><p className="mt-2 text-sm text-slate-400">{screenshot.description}</p></div></article>;
}
