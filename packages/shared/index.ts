export interface ServerAIQueryResponse {
  original_query: string;
  response: MarkdownContent;
  sources: filepath[];
}

export type filepath = string;

export type MarkdownContent = string;

export interface Repositories {
  [key: string]: {
    name: string;
    owner: string;
  };
}

export interface ServerAIQueryRequest {
  query: string;
}

export interface deleteDataSyncRequest {
  source: string;
  organization_id: string;
}
