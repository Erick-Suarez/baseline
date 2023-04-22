import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { CallbackManager } from "langchain/callbacks";
import chalk from "chalk";
import { PromptTemplate } from "langchain/prompts";
import { MarkdownContent } from "@baselinedocs/shared";
import { ChainValues } from "langchain/schema";
import { Document } from "langchain/document";
import { encode } from "gpt-3-encoder";

const DefaultSummationPrompt = `
Given a chat_history between an AI and a human, along with an original_query, please extract and analyze the relevant information from the chat_history. Create a new, standalone query that captures the essence of the original_query without relying on the chat_history. This new query will be used to find similar embeddings of code files to retrieve relevant code examples. Disregard any non-relevant parts of the chat_history. If the original_query is a question, do not answer it, but instead, form a new, standalone question that maintains the same meaning as the original_query.

chat_history:
{chat_history}

original_query:
{query}

new query:
 `;

const DefaultBaselineQAPrompt = `
---
You are an AI chatbot designed to help humans write and understand their codebase. You can engage in a chat, and you will be provided with chat_history (previous messages between the AI and the human) and related_context (code files) to assist in answering any questions. If the context files are not helpful or relevant, you should answer normally using your pre-existing knowledge. You should not make up any information, and respond with "I don't know" if you cannot answer a question confidently. Your behavior should be similar to ChatGPT, but you should use chat_history and related_context to provide more accurate answers.

When providing code blocks as responses, use markdown formatting. If you need to modify an existing file, please specify the file name and add comments to the edited code sections to guide the human user.
Focus on the user's intent, and use only the necessary files from related_context, disregarding any irrelevant files.

chat_history:
{chat_history}

related_context:
{context}

query:
{query}

reponse:
`;

type BaselineChatQAModelConfig = {
  newTokenHandler: (token: string) => void;
  indexName: string;
};

export class BaselineChatQAModel {
  private QAchain: LLMChain;
  private summationChain: LLMChain;
  private chatHistory: Array<string>;
  private indexName: string;

  constructor({ newTokenHandler, indexName }: BaselineChatQAModelConfig) {
    this.QAchain = this._initializeDefaultChatQAStreamingChain(newTokenHandler);
    this.summationChain = this._initializeDefaultSummationChain();
    this.chatHistory = [];
    this.indexName = indexName;
  }

  async query(query: string) {
    /* Summarize chat history and query into new question */
    const summarizedQuery = await this._summarizeChatHistoryAndQuery(query);

    console.log(chalk.green(`Summarized query: ${summarizedQuery.text}`));

    /* Get n related embeddings for the question */
    const relatedEmbeddings = await this._getRelatedEmbeddingsForQuery(
      summarizedQuery.text,
      3
    );

    const chatHistoryTokens = this.chatHistory.reduce(
      (total, chat) => total + encode(chat).length,
      0
    );
    const intialTokenTotal = encode(query).length + chatHistoryTokens;

    const truncatedEmbeddingsList = this._truncateEmbeddings(
      intialTokenTotal,
      relatedEmbeddings
    );
    /* Create context string from embeddings */
    const context = truncatedEmbeddingsList
      .map((embedding) => embedding.pageContent)
      .join("\n===\n");

    /* Use context to answer original query */
    const res = await this.QAchain.call({
      chat_history: this.chatHistory,
      context: context,
      query: `${query}`,
    });

    /* Add response to chat hisory */
    this._addToChatHistory(query, res.text);

    return {
      response: res.text as MarkdownContent,
      sources: truncatedEmbeddingsList.map(
        (embedding) => embedding.metadata.filepath
      ),
    };
  }

  resetChatHistory() {
    this.chatHistory = [];
  }

  private _truncateEmbeddings(
    intialTokenTotal: number,
    relatedEmbeddings: [Document<Record<string, any>>, number][]
  ) {
    const truncatedEmbeddingsList = [];
    let total = intialTokenTotal;
    console.log(`intial token total: ${total}`);
    const max_tokens = 3800;
    for (const embedding of relatedEmbeddings) {
      const tokens = encode(embedding[0].pageContent);
      console.log(
        chalk.yellow(
          `tokens: ${tokens.length} filepath: ${embedding[0].metadata.filepath}`
        )
      );
      if (total + tokens.length < max_tokens && embedding[1] > 0.72) {
        truncatedEmbeddingsList.push(embedding[0]);
        total += tokens.length;
        console.log(
          chalk.green(
            `added filepath: ${embedding[0].metadata.filepath}, token total: ${total}  simScore: ${embedding[1]}`
          )
        );
      }
    }
    return truncatedEmbeddingsList;
  }

  private _addToChatHistory(query: string, response: string) {
    this.chatHistory.push(`
    Human: ${query}

    AI:${response}
    `);
  }

  private async _summarizeChatHistoryAndQuery(
    query: string
  ): Promise<ChainValues> {
    return await this.summationChain.call({
      query: query,
      chat_history: this.chatHistory,
    });
  }

  private async _getRelatedEmbeddingsForQuery(
    query: string,
    embeddingsToReturn: number
  ): Promise<[Document, number][]> {
    const client = new PineconeClient();

    await client.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });

    const pineconeIndex = client.Index(this.indexName);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    return await vectorStore.similaritySearchWithScore(
      query,
      embeddingsToReturn
    );
  }

  private _initializeDefaultSummationChain() {
    const summationPrompt = new PromptTemplate({
      template: DefaultSummationPrompt,
      inputVariables: ["chat_history", "query"],
    });

    return new LLMChain({
      llm: new ChatOpenAI({
        openAIApiKey: process.env.OPEN_AI_KEY,
        temperature: 0.1,
      }),
      prompt: summationPrompt,
    });
  }

  private _initializeDefaultChatQAStreamingChain(
    newTokenHandler: (token: string) => void
  ) {
    const DefaultQAPromptTemplate = new PromptTemplate({
      template: DefaultBaselineQAPrompt,
      inputVariables: ["chat_history", "context", "query"],
    });

    return new LLMChain({
      llm: new ChatOpenAI({
        openAIApiKey: process.env.OPEN_AI_KEY,
        temperature: 0.1,
        streaming: true,
        callbackManager: CallbackManager.fromHandlers({
          async handleLLMNewToken(token) {
            newTokenHandler(token);
          },
        }),
      }),
      prompt: DefaultQAPromptTemplate,
    });
  }
}
