import { ChatOpenAI } from "langchain/chat_models";
import { LLMChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores";
import { CallbackManager } from "langchain/callbacks";
import chalk from "chalk";
import { PromptTemplate } from "langchain/prompts";
import * as dotenv from "dotenv";
import {
  filepath,
  MarkdownContent,
} from "@baselinedocs/shared";
import { BaseLanguageModel } from "langchain/base_language";
import { ChainValues } from "langchain/schema";
import { Document } from "langchain/document";

dotenv.config();

const DefaultSummationPrompt = `
---
Chat History:

{chat_history}

---
Input query: {query}
---
Use the chat history to create a new query that has the same meaning as the input query.

 `;

const DefaultQAPrompt = `
---
Chat History:

{chat_history}
---
Context:

{context}
---
Try to use the context above, chat history, and knowledge you know to create a response to this statement: {query}
Try to give a code example if possible
in the form 
\`\`\`
<filepath of file to be edited>
<Example code>
\`\`\`
`;

interface BaselineChatQAModelConfig {
  newTokenHandler: (token: string) => void;
}

export class BaselineChatQAModel {
  private QAchain: LLMChain;
  private summationChain: LLMChain;
  private chatHistory: Array<string>;

  constructor({ newTokenHandler }: BaselineChatQAModelConfig) {
    this.QAchain = this._initializeDefaultChatQAStreamingChain(newTokenHandler);
    this.summationChain = this._initializeDefaultSummationChain();
    this.chatHistory = [];
  }

  async query(query: string) {
    /* Summarize chat history and query into new question */
    const summarizedQuery = await this._summarizeChatHistoryAndQuery(query);

    /* Get n related embeddings for the question */
    const relatedEmbeddings = await this._getRelatedEmbeddingsForQuery(
      summarizedQuery.text,
      4
    );

    /* Create context string from embeddings */
    const context = relatedEmbeddings
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
      sources: relatedEmbeddings.map(
        (embedding) => embedding.metadata.filepath
      ),
    };
  }

  resetChatHistory() {
    this.chatHistory = [];
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
  ): Promise<Document[]> {
    const client = new PineconeClient();

    await client.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });

    const pineconeIndex = client.Index(process.env.PINECONE_INDEX!);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex }
    );

    return await vectorStore.similaritySearch(query, embeddingsToReturn);
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

  private _initializeDefaultChatQAChain() {
    const DefaultQAPromptTemplate = new PromptTemplate({
      template: DefaultQAPrompt,
      inputVariables: ["chat_history", "context", "query"],
    });

    return new LLMChain({
      llm: new ChatOpenAI({
        openAIApiKey: process.env.OPEN_AI_KEY,
        temperature: 0.1,
        streaming: true,
        callbackManager: CallbackManager.fromHandlers({
          async handleLLMNewToken(token) {
            console.log(token);
          },
        }),
      }),
      prompt: DefaultQAPromptTemplate,
    });
  }

  private _initializeDefaultChatQAStreamingChain(
    newTokenHandler: (token: string) => void
  ) {
    const DefaultQAPromptTemplate = new PromptTemplate({
      template: DefaultQAPrompt,
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
