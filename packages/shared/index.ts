export interface ServerAIQueryResponse {
  original_query: string;
  response: MarkdownContent;
  sources: filepath[];
}

export type filepath = string;

export type MarkdownContent = string;


export interface ServerAIQueryRequest {
  query: string;
}
