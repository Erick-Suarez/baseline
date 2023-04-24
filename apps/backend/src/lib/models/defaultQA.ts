import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain } from "langchain/chains";
import { CallbackManager } from "langchain/callbacks";
import { PromptTemplate } from "langchain/prompts";
import { MarkdownContent } from "@baselinedocs/shared";
import * as dotenv from "dotenv";

dotenv.config();

const DefaultQAPrompt = `
Given a chat_history and a query, please provide a detailed response that simulates the behavior of a ChatGPT model. Ensure your response is relevant, informative, and based on the context provided in the chat_history.

chat_history:
{chat_history}


query:
{query}

response:

`;

type DefaultChatQAModelConfig = {
  newTokenHandler: (token: string) => void;
};

export class DefaultChatQAModel {
  private QAchain: LLMChain;
  private chatHistory: Array<string>;

  constructor({ newTokenHandler }: DefaultChatQAModelConfig) {
    this.QAchain = this._initializeDefaultChatQAChain(newTokenHandler);
    this.chatHistory = [];
  }

  async query(query: string) {
    const res = await this.QAchain.call({
      chat_history: this.chatHistory,
      query: `${query}`,
    });

    /* Add response to chat hisory */
    this._addToChatHistory(query, res.text);

    return {
      response: res.text as MarkdownContent,
      sources: [],
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

  private _initializeDefaultChatQAChain(
    newTokenHandler: (token: string) => void
  ) {
    const promptTemplate = new PromptTemplate({
      template: DefaultQAPrompt,
      inputVariables: ["chat_history", "query"],
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
      prompt: promptTemplate,
    });
  }
}
