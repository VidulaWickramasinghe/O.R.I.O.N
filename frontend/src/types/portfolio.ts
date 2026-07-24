export type PortfolioScreenshot = { id: string; title: string; description: string; category: "overview" | "security" | "release" | "developer" | "desktop" | "productivity"; imagePath: string; recommendedFileName: string; available: boolean; };
export type PortfolioFeature = { title: string; description: string; category: string; };
export type PortfolioMilestone = { version: string; title: string; description: string; };
