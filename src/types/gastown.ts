export type AgentStatus = "running" | "completed" | "error" | "pending";

export interface GastownInstance {
  id: string;
  title: string;
  repo: string;
  branch: string;
  status: AgentStatus;
  createdAt: Date;
  linesAdded?: number;
  linesRemoved?: number;
  model: string;
}

export interface Repository {
  id: string;
  fullName: string;
  owner: string;
  name: string;
  defaultBranch: string;
  branches: string[];
}
