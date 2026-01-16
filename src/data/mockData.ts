import { GastownInstance, Repository } from "@/types/gastown";

export const mockRepositories: Repository[] = [
  {
    id: "1",
    fullName: "pRizz/degen-server",
    owner: "pRizz",
    name: "degen-server",
    defaultBranch: "main",
    branches: ["main", "develop", "feature/api-v2"],
  },
  {
    id: "2",
    fullName: "pRizz/text-2-audiobook",
    owner: "pRizz",
    name: "text-2-audiobook",
    defaultBranch: "main",
    branches: ["main", "develop"],
  },
  {
    id: "3",
    fullName: "pRizz/gastown",
    owner: "pRizz",
    name: "gastown",
    defaultBranch: "main",
    branches: ["main", "feature/agents"],
  },
  {
    id: "4",
    fullName: "pRizz/install-basic-git-hooks",
    owner: "pRizz",
    name: "install-basic-git-hooks",
    defaultBranch: "main",
    branches: ["main"],
  },
];

export const mockGastownInstances: GastownInstance[] = [
  {
    id: "1",
    title: "Public API readiness",
    repo: "degen-server",
    branch: "main",
    status: "completed",
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000), // 20h ago
    model: "GPT-5.2 Codex High",
  },
  {
    id: "2",
    title: "Readme beads installation",
    repo: "gastown",
    branch: "main",
    status: "running",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1d ago
    linesAdded: 3,
    model: "GPT-5.2 Codex High",
  },
  {
    id: "3",
    title: "Tts engine capability feedback",
    repo: "text-2-audiobook",
    branch: "main",
    status: "completed",
    createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 1d ago
    linesAdded: 97,
    linesRemoved: 33,
    model: "GPT-5.2 Codex High",
  },
  {
    id: "4",
    title: "Speech generation progress di...",
    repo: "text-2-audiobook",
    branch: "main",
    status: "completed",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 1d ago
    linesAdded: 295,
    linesRemoved: 12,
    model: "GPT-5.2 Codex High",
  },
  {
    id: "5",
    title: "M4b export file size",
    repo: "text-2-audiobook",
    branch: "main",
    status: "pending",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2d ago
    linesAdded: 101,
    linesRemoved: 67,
    model: "GPT-5.2 Codex High",
  },
  {
    id: "6",
    title: "Recursive uninstall hooks com...",
    repo: "install-basic-git-hooks",
    branch: "main",
    status: "error",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3d ago
    linesAdded: 596,
    linesRemoved: 116,
    model: "GPT-5.2 Codex High",
  },
];

export const availableModels = [
  "GPT-5.2 Codex High",
  "GPT-5.2 Codex",
  "Claude 4 Opus",
  "Claude 4 Sonnet",
  "Gemini 2.5 Pro",
];

export const quickActions = [
  "Run security audit",
  "Improve AGENTS.md",
  "Solve a TODO",
];
