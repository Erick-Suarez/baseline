import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  AIChatMessage,
  BaseChatMessage,
  HumanChatMessage,
  SystemChatMessage,
} from "langchain/schema";

import { CallbackManager } from "langchain/callbacks";
import { MarkdownContent } from "@baselinedocs/shared";
import { encode } from "gpt-3-encoder";
import * as dotenv from "dotenv";
import { similaritySearchWithScore } from "../indexes.js";
import { RelatedEmbeddings } from "@baselinedocs/shared";
import { BasicChatCompletionModel } from "./basicChat.js";

dotenv.config();

type BaselineChatQAModelConfig = {
  newTokenHandler: (token: string) => void;
  indexName: string;
};

export class BaselineChatQAModel {
  private chatModel: ChatOpenAI;
  private summationModel: BasicChatCompletionModel;
  private indexName: string;
  private chatHistory: BaseChatMessage[];

  constructor({ newTokenHandler, indexName }: BaselineChatQAModelConfig) {
    this.chatModel = this._initializeStreamingChatCompletion(newTokenHandler);
    this.summationModel = this._initializeDefaultSummationModel();
    this.indexName = indexName;
    this.chatHistory = [
      new SystemChatMessage(
        "You are a helpful assistant used for answering code-related questions."
      ),
    ];
  }

  async query(query: string, logger: any) {
    /* Summarize chat history and query into new question */
    const summarizedQuery = await this._summarizeChatHistoryAndQuery(query);

    logger.info(`Summarized query: ${summarizedQuery}`);

    /* Get n related embeddings for the question */
    const relatedEmbeddings = await this._getRelatedEmbeddingsForQuery(
      `${summarizedQuery}\n\n${query}`,
      10,
      logger
    );

    const chatHistoryTokens = encode(this._getChatHistoryAsString()).length;

    const intialTokenTotal = encode(query).length + chatHistoryTokens;

    const truncatedEmbeddingsList = this._truncateEmbeddings(
      intialTokenTotal,
      relatedEmbeddings,
      logger
    );

    /* Create context string from embeddings */
    const context = truncatedEmbeddingsList
      .map((embedding) => `\n"""\n${embedding.pageContent}\n"""\n`)
      .join("");

    /* Use context to answer original query */
    const newCall = [
      ...this.chatHistory,
      new HumanChatMessage(`
    Use the code files below to help me answer my code related questions. If the code files are not helpful or relevant, you should try answering using your pre-existing knowledge. You should not make up any information. If you are not confident in your answer say "I could not find an answer." Give any code blocks as markdown.

    Code files:
    ${context}

    Question: ${query}
    `),
    ];

    const response = await this.chatModel.call(newCall);

    // Update chat history with response
    this.chatHistory = [...newCall, new AIChatMessage(response.text)];

    return {
      response: response.text as MarkdownContent,
      sources: truncatedEmbeddingsList.map(
        (embedding) => embedding.metadata.filepath
      ),
    };
  }

  private _truncateEmbeddings(
    intialTokenTotal: number,
    relatedEmbeddings: RelatedEmbeddings,
    logger: any
  ) {
    const truncatedEmbeddingsList = [];
    let total = intialTokenTotal;
    logger.info(`intial token total: ${total}`);
    const max_tokens = 3000;
    for (const embedding of relatedEmbeddings) {
      const tokens = encode(embedding[0].pageContent);
      logger.info(
        `tokens: ${tokens.length} filepath: ${embedding[0].metadata.filepath}`
      );
      if (total + tokens.length < max_tokens && embedding[1] > 0.72) {
        truncatedEmbeddingsList.push(embedding[0]);
        total += tokens.length;
        logger.info(
          `added filepath: ${embedding[0].metadata.filepath}, token total: ${total}  simScore: ${embedding[1]}`
        );
      }
    }
    return truncatedEmbeddingsList;
  }

  private async _summarizeChatHistoryAndQuery(query: string): Promise<string> {
    const res = await this.summationModel
      .query(`Given a chat_history between an AI and a human, along with an original_query, please extract and analyze the relevant information from the chat_history. Create a new, standalone query that captures the essence of the original_query without relying on the chat_history. Include any relevant code blocks that are needed to understand the new question. Disregard any non-relevant parts of the chat_history. If the original_query is a question, do not answer it, but instead, form a new, standalone question that maintains the same meaning as the original_query.

    chat_history:
    ${this._getChatHistoryAsString()}

    original_query:
    ${query}

    new query:
     `);

    // Reset history of summation model so past requests do not influence new requests
    this.summationModel.resetChatHistory();

    return res.response;
  }

  private async _getRelatedEmbeddingsForQuery(
    query: string,
    embeddingsToReturn: number,
    logger: any
  ): Promise<RelatedEmbeddings> {
    return await similaritySearchWithScore(
      this.indexName,
      query,
      embeddingsToReturn,
      logger
    );
  }

  private _initializeDefaultSummationModel() {
    return new BasicChatCompletionModel({});
  }

  private _initializeStreamingChatCompletion(
    newTokenHandler: (token: string) => void
  ) {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPEN_AI_KEY,
      temperature: 0.1,
      streaming: true,
      callbackManager: CallbackManager.fromHandlers({
        async handleLLMNewToken(token) {
          newTokenHandler(token);
        },
      }),
    });
  }

  private _getChatHistoryAsString() {
    const chatHistoryString = this.chatHistory
      .map((message) => {
        return `${message._getType().toString().trim().toUpperCase()}: ${
          message.text
        }`;
      })
      .join("\n");

    return chatHistoryString;
  }
}
