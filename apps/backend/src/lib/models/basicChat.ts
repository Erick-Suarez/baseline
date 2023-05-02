import { MarkdownContent } from "@baselinedocs/shared";
import { CallbackManager } from "langchain/callbacks";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  HumanChatMessage,
  SystemChatMessage,
  AIChatMessage,
  BaseChatMessage,
} from "langchain/schema";

type BasicChatCompletionModelConfig = {
  newTokenHandler?: (token: string) => void;
};

export class BasicChatCompletionModel {
  private chatModel: ChatOpenAI;
  private chatHistory: BaseChatMessage[];
  constructor(config: BasicChatCompletionModelConfig) {
    if (config.newTokenHandler) {
      this.chatModel = this._initializeStreamingChatCompletion(
        config.newTokenHandler
      );
    } else {
      this.chatModel = this._initializeChatCompletion();
    }

    this.chatHistory = [new SystemChatMessage("You are a helpful assistant.")];
  }

  async query(query: string) {
    const newCall = [...this.chatHistory, new HumanChatMessage(query)];
    const response = await this.chatModel.call(newCall);

    // Update chat history with response
    this.chatHistory = [...newCall, new AIChatMessage(response.text)];
    return {
      response: response.text as MarkdownContent,
      sources: [],
    };
  }

  resetChatHistory() {
    this.chatHistory = [new SystemChatMessage("You are a helpful assistant.")];
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

  private _initializeChatCompletion() {
    return new ChatOpenAI({
      openAIApiKey: process.env.OPEN_AI_KEY,
      temperature: 0.1,
    });
  }
}
