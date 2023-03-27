import { ChatOpenAI } from 'langchain/chat_models';
import { LLMChain } from 'langchain/chains';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeClient } from '@pinecone-database/pinecone';
import { PineconeStore } from 'langchain/vectorstores';
import { PromptTemplate } from 'langchain/prompts';
import * as dotenv from 'dotenv';
dotenv.config();
/* Initialize the vector DB */
const client = new PineconeClient();
await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
});
const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex });
/* Initialize Models */
const chatHistory = [];
const chatModel = new ChatOpenAI({
    openAIApiKey: process.env.OPEN_AI_KEY,
    temperature: 0.1,
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
    inputVariables: ['chat_history', 'query'],
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
`;
const qaPrompt = new PromptTemplate({
    template: qaPromptTemplate,
    inputVariables: ['chat_history', 'context', 'query'],
});
const QAchain = new LLMChain({
    llm: chatModel,
    prompt: qaPrompt,
});
async function custom_call(query) {
    const historySummaryChainRes = await historySummaryChain.call({
        query: query,
        chat_history: chatHistory,
    });
    console.log('\n---\n' + historySummaryChainRes.text + '\n---\n');
    const related_docs = await vectorStore.similaritySearch(historySummaryChainRes.text, 3);
    const context = related_docs
        .map(document => {
        return document.pageContent;
    })
        .join('\n');
    const qaRes = await QAchain.call({
        chat_history: chatHistory,
        context: context,
        query: query,
    });
    chatHistory.push(`human: ${query}\nAI: ${qaRes.text}`);
    return qaRes;
}
export async function askQuestions(question) {
    const response = await custom_call(question);
    return response.text;
}
