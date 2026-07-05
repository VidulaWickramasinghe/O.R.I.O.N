export type TaskColumn = "Ideas" | "Planning" | "In Progress" | "Testing" | "Completed";
export type ProjectTask = { id: string; title: string; column: TaskColumn; owner: string };
export type OrionProject = { id: string; name: string; tagline: string; description: string; status: string; priority: string; progress: number; health: number; currentGoal: string; repository: string; branch: string; updated: string; techStack: string[]; agents: string[]; memories: number; tasks: ProjectTask[]; files: string[]; missions: string[]; deployments: string[]; logs: string[]; nextActions: string[] };
