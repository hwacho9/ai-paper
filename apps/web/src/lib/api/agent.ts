import { apiPost } from "./client";

export interface AgentChatRequest {
  message: string;
  source?: "arxiv" | "pubmed" | "scholar" | "gemini";
  search_limit?: number;
  attach_top_k?: number;
  context_project_id?: string | null;
  context_papers?: AgentPaper[];
}

export interface AgentAction {
  step: string;
  status: string;
  detail: string;
}

export interface AgentProject {
  id: string;
  title: string;
}

export interface AgentPaper {
  paper_id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
}

export interface AgentChatResponse {
  reply: string;
  actions: AgentAction[];
  project: AgentProject | null;
  papers: AgentPaper[];
}

export function sendAgentChat(
  body: AgentChatRequest,
): Promise<AgentChatResponse> {
  return apiPost<AgentChatResponse>("/api/v1/agent/chat", body);
}
