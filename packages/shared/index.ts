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

export interface createEmbeddingFromRepositoryRequest {
  repo_id: string;
  repo_name: string;
  include?: Array<string>;
  exclude?: Array<string>;
}

export interface getDataSyncsForOrganizationRequest {
  organization_id: string;
}

export interface getDataSyncsForOrganizationResponse {
  github: boolean;
}

export interface geRepositoriesWithEmbeddingsForOrganizationIdRequest {
  organization_id: string;
}

export interface updateUserDisplayNameRequest {
  user_id: string;
  new_displayName: string;
}

export interface updateUserPasswordRequest {
  user_id: string;
  current_password: string;
  new_password: string;
}

export type geRepositoriesWithEmbeddingsForOrganizationIdResponse =
  Array<RepositoryWithEmbedding>;

export interface RepositoryWithEmbedding {
  repo_id: string;
  repo_name: string;
  full_name: string;
  data_syncs: { source: string };
  embedding_indexes: Array<EmbeddingIndex>;
}

export interface EmbeddingIndex {
  index_name: string;
  updated_at: Date;
  commit_sha: string;
  ready: boolean;
}

export enum DATA_SYNC_SOURCES {
  GITHUB = "github",
}

export interface Project {
  id: string;
  name: string;
  display_name: string;
  source: string;
  index_list: Array<EmbeddingIndex>;
}

export interface deleteEmbeddingFromRepositoryRequest {
  repo_id: string;
}

export interface UserJWTPayload {
  user_id: string;
  organization_id: string;
}

export interface Record {
  pageContent: string;
  metadata: any;
}

export interface ServerSocketError {
  type: number;
  message: string;
}

export interface RelatedEmbeddings extends Array<[Record, number]> {}
