import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";
import { supabaseIndexes } from "./supabase.js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { LLMChain } from "langchain/chains";
import { PromptTemplate } from "langchain/prompts";
import { RelatedEmbeddings } from "@baselinedocs/shared";
import chalk from "chalk";
import * as math from "mathjs";

dotenv.config();

const VALID_EXT = [".js", ".jsx", ".ts", ".tsx", ".py", ".html", ".css"];
const IGNORE_DIRECTORIES = [".git", ".vscode", "node_modules", "dist"];

const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPEN_AI_KEY,
  temperature: 0.7,
});

const embeddings = new OpenAIEmbeddings();

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

interface Metadata {
  filename: string;
  directory: string;
  filepath: string;
  importsList: Array<{ variable: string; import: string }>;
}
interface FileVector {
  filecontents: string;
  metadata: Metadata;
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

function loadFiles(
  baseDirectory: string,
  directory: string,
  docs: Array<FileVector>
) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  files.forEach((file) => {
    const filepath = path.join(directory, file.name);
    if (file.isDirectory()) {
      if (IGNORE_DIRECTORIES.includes(file.name)) {
        return;
      }
      loadFiles(baseDirectory, filepath, docs);
    }
    if (VALID_EXT.includes(path.extname(file.name))) {
      const filecontents = fs.readFileSync(filepath, "utf-8");
      const importsList = parseImports(filecontents);
      docs.push({
        filecontents,
        metadata: {
          filename: file.name,
          directory,
          filepath: path.relative(baseDirectory, filepath),
          importsList,
        },
      });
    }
  });
}

async function uploadVectors(docs: Array<FileVector>, index_name: string) {
  const maxSize = 4000;
  for (const { filecontents, metadata } of docs) {
    for (let i = 0; i < filecontents.length; i += maxSize) {
      const maxRetries = 3;
      for (let retry = 0; retry < maxRetries; retry++) {
        console.log(
          `Uploading: ${metadata.filepath}, chunk: [${i},${i + maxSize}]`
        );
        try {
          await uploadEmedding(
            {
              filecontents: filecontents.substring(i, i + maxSize),
              metadata,
            },
            index_name
          );
          break;
        } catch (err) {
          console.error(chalk.red(err));
          console.log(
            chalk.red(
              `Error at ${metadata.filepath}, length of content: ${filecontents.length}`
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

async function uploadEmedding(vector: FileVector, indexName: string) {
  const { filecontents, metadata } = vector;
  const summary = await codeSummaryChain.call({
    code: filecontents,
  });

  console.log(`file: ${metadata.filename} - ${summary.text}`);
  const content =
    `Filename: ${metadata.filename}\nFilepath: ${metadata.filepath}\nSummary:${summary.text}\n\n` +
    filecontents;
  const embedding = await embeddings.embedQuery(content);
  const record = await supabaseIndexes.rpc("insert_embedding", {
    index_name: indexName,
    content,
    embedding,
    metadata: {
      summary: summary.text,
      ...metadata,
    },
  });
  console.log(record);
}

async function createIndex(indexName: string) {
  console.log(`creating index ${indexName} in schema indexes`);
  const { data, error: indexError } = await supabaseIndexes.rpc(
    "create_index",
    {
      index_name: indexName,
    }
  );
  if (indexError) {
    console.error(indexError);
    return;
  }
  if (data) {
    console.log(`index ${indexName} created in schema indexes successfully`);
    return;
  }
  console.log(`index ${indexName} already exists`);
}

export async function deleteIndex(indexName: string) {
  console.log(`deleting index ${indexName} in schema indexes`);
  const { data, error: deleteError } = await supabaseIndexes.rpc(
    "delete_index",
    {
      index_name: indexName,
    }
  );
  if (deleteError) {
    console.error(deleteError);
    return;
  }
  if (data) {
    console.log(`index ${indexName} deleted from schema indexes`);
    return;
  }
  console.log(`error deleting ${indexName}`);
}

export async function startIngestion(directory: string, index_name: string) {
  const docs: Array<FileVector> = [];
  loadFiles(directory, directory, docs);

  console.log("Starting Ingestion...");

  await createIndex(index_name);
  await uploadVectors(docs, index_name);

  console.log("Ingestion done!");
}

function _cosineSimilarity(
  queryEmbedding: number[],
  contentEmbedding: number[]
) {
  const dotProduct = math.dot(queryEmbedding, contentEmbedding);
  const norm1 = math.norm(queryEmbedding);
  const norm2 = math.norm(contentEmbedding);
  return dotProduct / (Number(norm1) * Number(norm2));
}

export async function similaritySearchWithScore(
  indexName: string,
  query: string,
  embeddingsToReturn: number
): Promise<RelatedEmbeddings> {
  const queryEmbedding = await embeddings.embedQuery(query);
  const { data, error } = await supabaseIndexes.rpc("similarity_search", {
    index_name: indexName,
    query_embedding: queryEmbedding,
    number_of_embedding_to_return: embeddingsToReturn,
  });
  if (error) {
    console.error(error);
    return [];
  }
  const result: RelatedEmbeddings = [];
  for (const vector of data) {
    const similarityScore = _cosineSimilarity(
      queryEmbedding,
      JSON.parse(vector.embedding)
    );
    console.log(
      `file: ${vector.metadata.filename}, summary: ${vector.metadata.summary}, score: ${similarityScore}`
    );
    result.push([
      {
        pageContent: String(vector.content),
        metadata: vector.metadata,
      },
      similarityScore,
    ]);
  }
  return result;
}
