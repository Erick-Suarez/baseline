import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import chalk from "chalk";
dotenv.config();

const VALID_EXT = [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css"];
const IGNORE_DIRECTORIES = [".git", ".vscode", "node_modules", "dist"];

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPEN_AI_KEY,
  temperature: 0.7,
});

const codeSummaryTemplate = `
I am going to give you code below. create a summary that is less than 300 characters.

---


{code}
`;

const codeSummaryPrompt = new PromptTemplate({
  template: codeSummaryTemplate,
  inputVariables: ["code"],
});

const codeSummaryChain = new LLMChain({
  llm: chatModel,
  prompt: codeSummaryPrompt,
});

// Create a client
const client = new PineconeClient();

// Initialize the client
await client.init({
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!,
});

interface IngestionDoc {
  filename: string;
  directory: string;
  filepath: string;
  content: string;
  importsList: Array<{ variable: string; import: string }>;
}

function parseImports(content: string) {
  const es6Pattern =
    /import\s*(?:\*\s+as)?\{?\s*(\w+(?:,\s*\w+)*)\s*\}?\s*from\s+["']([\.\w\-@\/]+)["'];?/g;
  const commonJSPattern = /const\s+{?(\w+)}?\s*=\s*require\(['"](.+)['"]\);?/g;
  return [
    ...content.matchAll(commonJSPattern),
    ...content.matchAll(es6Pattern),
  ].map((match) => {
    return { variable: match[1], import: match[2] };
  });
}

function loadFiles(directory: string, docs: Array<IngestionDoc>) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  files.forEach((file) => {
    const filepath = path.join(directory, file.name);
    if (file.isDirectory()) {
      if (IGNORE_DIRECTORIES.includes(file.name)) {
        return;
      }
      loadFiles(filepath, docs);
    }
    if (VALID_EXT.includes(path.extname(file.name))) {
      const content = fs.readFileSync(filepath, "utf-8");
      const importsList = parseImports(content);
      // console.log(importsList);
      docs.push({
        filename: file.name,
        directory,
        filepath,
        content,
        importsList,
      });
    }
  });
}

async function uploadDoc(doc: IngestionDoc, pineconeIndex: any) {
  const { filename, directory, filepath, content, importsList } = doc;
  const summary = await codeSummaryChain.call({
    code: content,
  });

  console.log(summary.text);
  await PineconeStore.fromDocuments(
    [
      new Document({
        pageContent:
          `Filename: ${filename}\nFilepath: ${filepath}\nSummary:${summary.text}\n\n` +
          content,
        metadata: {
          filename,
          directory,
          filepath,
          summary: summary.text,
          imports: JSON.stringify(importsList),
        },
      }),
    ],
    new OpenAIEmbeddings(),
    {
      pineconeIndex,
    }
  );
}

async function uploadDocsToPincone(
  docs: Array<IngestionDoc>,
  pineconeIndex: any
) {
  const maxSize = 4000;
  for (const { filename, directory, filepath, content, importsList } of docs) {
    for (let i = 0; i < content.length; i += maxSize) {
      const maxRetries = 3;
      for (let retry = 0; retry < maxRetries; retry++) {
        console.log(`Uploading: ${filepath}, chunk: [${i},${i + maxSize}]`);
        try {
          await uploadDoc(
            {
              filename,
              directory,
              filepath,
              content: content.substring(i, i + maxSize),
              importsList,
            },
            pineconeIndex
          );
          break;
        } catch (err) {
          console.error(chalk.red(err));
          console.log(
            chalk.red(
              `Error at ${filepath}, length of content: ${content.length}`
            )
          );
          console.log(chalk.blue(`retrying upload ${retry}/${maxRetries}`));
          await new Promise((resolve, err) => {
            setTimeout(() => {
              resolve("");
            }, 10000);
          });
        }
      }
    }
  }
}

async function createNewIndexAndWaitUntilReady(index_name: string) {
  console.log(`Creating new index with name: ${index_name}`);
  const res = await client.createIndex({
    createRequest: {
      name: index_name,
      dimension: 1536,
      metadataConfig: {
        indexed: [
          /* Don't index any metadata since they are all high cardinality */
        ],
      },
    },
  });
  console.log(res);
  console.log("Waiting until new index is ready");
  while (true) {
    const data = await client.describeIndex({ indexName: index_name });
    if (data.status && data.status.ready) {
      console.log("Index is ready");
      break;
    }
    console.log("Index is not ready, sleeping...");
    await new Promise((resolve, err) => {
      setTimeout(() => {
        resolve("");
      }, 10000);
    });
  }

  // Once ready wait another 10 seconds to make sure
  await new Promise((resolve, err) => {
    setTimeout(() => {
      resolve("");
    }, 10000);
  });
}

export async function deleteIndex(index_name: string) {
  try {
    await client.deleteIndex({ indexName: index_name });
  } catch (error) {
    console.error(error);
    // TODO: Handle error
  }
}

export async function startIngestion(directory: string, index_name: string) {
  const docs: Array<IngestionDoc> = [];
  loadFiles(directory, docs);

  console.log("Starting Ingestion...");

  await createNewIndexAndWaitUntilReady(index_name);

  const pineconeIndex = client.Index(index_name);
  await uploadDocsToPincone(docs, pineconeIndex);

  console.log("Ingestion done!");
}
