import { ChatOpenAI } from "langchain/chat_models";
import { LLMChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores";
import { CallbackManager } from "langchain/callbacks";

import { PromptTemplate } from "langchain/prompts";
import * as dotenv from "dotenv";
import { QueryResponse } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/index.js";
import {
  ResponseContent,
  ResponseContentTypes,
  filepath,
} from "@baselinedocs/shared";
dotenv.config();

/* Initialize the vector DB */
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

/* Initialize Models */

const chatHistory: Array<string> = [];

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPEN_AI_KEY,
  temperature: 0.4,
  // streaming: true,
  // callbackManager: CallbackManager.fromHandlers({
  //   async handleLLMNewToken(token) {
  //     process.stdout.write(token);
  //   },
  // }),
});

const historySummaryPromptTemplate = `
---
Chat History:

{chat_history}

---
Input query: {query}
---
Use the chat history to create a new query that has the same meaning as the input query.

 `;

const historySummaryPrompt = new PromptTemplate({
  template: historySummaryPromptTemplate,
  inputVariables: ["chat_history", "query"],
});

const historySummaryChain = new LLMChain({
  llm: chatModel,
  prompt: historySummaryPrompt,
});

const qaPromptTemplate = `
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
<Example code>
\`\`\`
`;

const qaPrompt = new PromptTemplate({
  template: qaPromptTemplate,
  inputVariables: ["chat_history", "context", "query"],
});

const QAchain = new LLMChain({
  llm: chatModel,
  prompt: qaPrompt,
});

async function custom_call(query: string) {
  const historySummaryChainRes = await historySummaryChain.call({
    query: query,
    chat_history: chatHistory,
  });

  const related_docs = await vectorStore.similaritySearch(
    historySummaryChainRes.text,
    4
  );

  const context = related_docs
    .map((document) => {
      return document.pageContent;
    })
    .join("\n");

  console.log(
    `Chat History: ${JSON.stringify(
      chatHistory
    )}\nQuery with History: ${JSON.stringify(historySummaryChainRes)}`
  );

  const qaRes = await QAchain.call({
    chat_history: chatHistory,
    context: context,
    query: `${historySummaryChainRes.text}\n${query}`,
  });

  chatHistory.push(`human: ${query}\nAI: ${qaRes.text}`);

  const sources = related_docs.map((document) => {
    return document.metadata.filepath;
  });
  return { answer: qaRes.text, sources };
}

function splitIntoBlocks(content: string) {
  let count = 0;
  const types = ["text", "code"];
  const result: ResponseContent[] = [];
  console.log(content);
  for (const block of content.split("```")) {
    const content = block.trim();
    if (content !== "") {
      let type;
      if (count % 2 === 0) {
        type = ResponseContentTypes.TEXT;
      } else {
        type = ResponseContentTypes.JAVASCRIPT;
      }
      result.push({
        type: type,
        data: block.trim(),
      } as ResponseContent);
    }
    count += 1;
  }

  return result;
}

export async function askQuestions(
  question: string
): Promise<{ answer: ResponseContent[]; sources: filepath[] }> {
  const response = await custom_call(question);
  return {
    answer: splitIntoBlocks(response.answer),
    sources: response.sources,
  };
}

export function resetChatHistory() {
  chatHistory.length = 0;
  return chatHistory;
}
