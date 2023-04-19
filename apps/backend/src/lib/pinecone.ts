import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

dotenv.config();

const VALID_EXT = [".js", ".jsx", ".ts", ".tsx", ".py"];
const IGNORE_DIRECTORIES = [".git", ".vscode", "node_modules", "dist"];

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
  await PineconeStore.fromDocuments(
    [
      new Document({
        pageContent:
          `Filename: ${filename}\nFilepath: ${filepath}\n\n` + content,
        metadata: {
          filename,
          directory,
          filepath,
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
    try {
      for (let i = 0; i < content.length; i += maxSize) {
        console.log(`Uploading: ${filepath}, chunk: [${i},${(i += maxSize)}]`);
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
      }
    } catch (err) {
      console.error(err);
      console.log(`Error at ${filepath}, length of content: ${content.length}`);
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
