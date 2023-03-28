export interface ServerAIQueryResponse {
  original_query: string;
  response: ResponseContent[];
}

export interface ResponseContent {
  type: ResponseContentTypes;
  data: string;
}

export enum ResponseContentTypes {
  TEXT = "text",
  JAVASCRIPT = "javascript",
}

export interface ServerAIQueryRequest {
  query: string;
}
