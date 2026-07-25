import { PortfolioCaseStudyPanel } from "@/components/aurora/panels/PortfolioCaseStudyPanel";
import { PortfolioDemoPanel } from "@/components/aurora/panels/PortfolioDemoPanel";
import { ScreenshotGalleryPanel } from "@/components/aurora/panels/ScreenshotGalleryPanel";
import { AppShell } from "@/components/aurora/app-shell";

export default function PortfolioPage() {
  return <AppShell><main className="mx-auto grid w-full max-w-5xl gap-6"><PortfolioCaseStudyPanel /><PortfolioDemoPanel /><ScreenshotGalleryPanel /></main></AppShell>;
}
