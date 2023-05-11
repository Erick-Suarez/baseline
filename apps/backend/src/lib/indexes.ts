import fs from "fs";
import path from "path";
import glob from "glob";
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
  docs: Array<FileVector>,
  include?: Array<string>,
  exclude?: Array<string>
) {
  const files = glob.sync(include || "*", {
    cwd: directory,
    nodir: true,
    ignore: exclude,
  });
  files.forEach((filepath) => {
    const filecontents = fs.readFileSync(filepath, "utf-8");
    const importsList = parseImports(filecontents);
    docs.push({
      filecontents,
      metadata: {
        filename: path.basename(filepath),
        directory,
        filepath: path.relative(baseDirectory, filepath),
        importsList,
      },
    });
  });
}

async function uploadVectors(
  docs: Array<FileVector>,
  index_name: string,
  logger: any
) {
  const maxSize = 4000;
  for (const { filecontents, metadata } of docs) {
    for (let i = 0; i < filecontents.length; i += maxSize) {
      const maxRetries = 3;
      for (let retry = 0; retry < maxRetries; retry++) {
        logger.info(
          `Uploading: ${metadata.filepath}, chunk: [${i},${i + maxSize}]`
        );
        try {
          await uploadEmedding(
            {
              filecontents: filecontents.substring(i, i + maxSize),
              metadata,
            },
            index_name,
            logger
          );
          break;
        } catch (err) {
          console.error(chalk.red(err));
          logger.info(
            chalk.red(
              `Error at ${metadata.filepath}, length of content: ${filecontents.length}`
            )
          );
          logger.info(chalk.blue(`retrying upload ${retry}/${maxRetries}`));
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

async function uploadEmedding(
  vector: FileVector,
  indexName: string,
  logger: any
) {
  const { filecontents, metadata } = vector;
  const summary = await codeSummaryChain.call({
    code: filecontents,
  });

  logger.info(`file: ${metadata.filename} - ${summary.text}`);
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
  logger.info(record);
}

async function createIndex(indexName: string, logger: any) {
  logger.info(`creating index ${indexName} in schema indexes`);
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
    logger.info(`index ${indexName} created in schema indexes successfully`);
    return;
  }
  logger.info(`index ${indexName} already exists`);
}

export async function deleteIndex(indexName: string, logger: any) {
  logger.info(`deleting index ${indexName} in schema indexes`);
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
    logger.info(`index ${indexName} deleted from schema indexes`);
    return;
  }
  logger.info(`error deleting ${indexName}`);
}

export async function startIngestion(
  directory: string,
  index_name: string,
  logger: any,
  include?: Array<string>,
  exclude?: Array<string>
) {
  const docs: Array<FileVector> = [];
  loadFiles(directory, directory, docs, include, exclude);

  logger.info("Starting Ingestion...");

  await createIndex(index_name, logger);
  await uploadVectors(docs, index_name, logger);

  logger.info("Ingestion done!");
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
  embeddingsToReturn: number,
  logger: any
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
    logger.info(
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
