import type {
  PortfolioFeature,
  PortfolioMilestone,
  PortfolioScreenshot,
} from "@/types/portfolio";

const screenshot = (
  id: string,
  title: string,
  category: PortfolioScreenshot["category"],
  description: string,
): PortfolioScreenshot => ({
  id,
  title,
  description,
  category,
  imagePath: `/screenshots/${id}.png`,
  recommendedFileName: `${id}.png`,
  available: true,
});

export const ORION_SCREENSHOTS: PortfolioScreenshot[] = [
  screenshot(
    "aurora-os-dashboard",
    "Aurora OS Dashboard",
    "overview",
    "Main Aurora OS command dashboard and operational overview.",
  ),
  screenshot(
    "dashboard-intelligence",
    "Dashboard Intelligence",
    "overview",
    "System readiness, recommendations, and intelligence snapshot.",
  ),
  screenshot(
    "dashboard-views",
    "Dashboard Views",
    "overview",
    "Custom workspace presets for mission, release, security, and developer workflows.",
  ),
  screenshot(
    "security-policy",
    "Security Policy",
    "security",
    "Active protection profile, policy controls, and security posture.",
  ),
  screenshot(
    "plugin-system",
    "Plugin System",
    "security",
    "Plugin registry, enabled modules, risk boundaries, and operational extensions.",
  ),
  screenshot(
    "tool-permission-enforcement",
    "Tool Permission Enforcement",
    "security",
    "Permission matrix showing allowed, blocked, and policy-gated tools.",
  ),
  screenshot(
    "tool-audit-center",
    "Tool Audit Center",
    "security",
    "Tool execution audit history and evidence trail.",
  ),
  screenshot(
    "quality-gate",
    "Quality Gate",
    "release",
    "Backend and frontend validation checks for release readiness.",
  ),
  screenshot(
    "public-release",
    "Public Release",
    "release",
    "Portfolio/demo release packaging and public showcase readiness.",
  ),
  screenshot(
    "github-polish",
    "GitHub Polish",
    "release",
    "Repository launch polish, release notes, badges, and safe publication checklist.",
  ),
];

export const ORION_PORTFOLIO_FEATURES: PortfolioFeature[] = [];
export const ORION_PORTFOLIO_MILESTONES: PortfolioMilestone[] = [];
