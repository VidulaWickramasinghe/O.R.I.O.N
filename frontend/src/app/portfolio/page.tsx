import { PortfolioCaseStudyPanel } from "@/components/aurora/panels/PortfolioCaseStudyPanel";
import { PortfolioDemoPanel } from "@/components/aurora/panels/PortfolioDemoPanel";
import { ScreenshotGalleryPanel } from "@/components/aurora/panels/ScreenshotGalleryPanel";

export default function PortfolioPage() {
  return <main className="mx-auto grid max-w-5xl gap-6 p-6"><PortfolioCaseStudyPanel /><PortfolioDemoPanel /><ScreenshotGalleryPanel /></main>;
}
