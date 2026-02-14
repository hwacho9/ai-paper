import { apiPost } from "./client";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AgentContext = {
  project_id?: string | null;
  paper_id?: string | null;
};

export type AgentStepResult = {
  action: string;
  status: "completed" | "failed" | "skipped";
  detail: string;
  output?: Record<string, unknown> | null;
  error?: string | null;
};

export type AgentAction = {
  action: string;
  params: Record<string, unknown>;
};

export type AgentChatRequest = {
  message: string;
  history?: AgentMessage[];
  execute?: boolean;
  context?: AgentContext;
  actions_override?: AgentAction[];
};

export type AgentChatResponse = {
  reply: string;
  used_function_doc: boolean;
  plan: string[];
  actions: AgentAction[];
  steps: AgentStepResult[];
  artifacts: Record<string, unknown>;
  target_path?: string | null;
  verification?: {
    verdict: "met" | "partial" | "not_met" | "not_executed";
    summary: string;
    achieved: string[];
    missing: string[];
  } | null;
  pending_actions: AgentAction[];
  pending_plan: string[];
};

export function runAgentChat(
  payload: AgentChatRequest,
): Promise<AgentChatResponse> {
  return apiPost<AgentChatResponse>("/api/v1/agent/chat", payload);
}
