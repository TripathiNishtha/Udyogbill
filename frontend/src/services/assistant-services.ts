import { apiClient } from "@/lib/api-client";

export interface AssistantQueryRequest {
  queryText: string;
  contextUrl?: string;
  languagePreference?: string;
}

export interface AssistantQueryResponse {
  answerText: string;
  intentType: string;
  directNavigationUrl?: string;
  navigationButtonText?: string;
  liveMetrics?: any;
  suggestedFollowUps: string[];
}

export interface QuickPromptGroup {
  category: string;
  prompts: string[];
}

export const assistantService = {
  async sendQuery(data: AssistantQueryRequest): Promise<AssistantQueryResponse> {
    const response = await apiClient.post<AssistantQueryResponse>("/tenant/assistant/query", data);
    return response.data;
  },

  async getQuickPrompts(): Promise<QuickPromptGroup[]> {
    const response = await apiClient.get<QuickPromptGroup[]>("/tenant/assistant/quick-prompts");
    return response.data;
  }
};
