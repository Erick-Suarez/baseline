import fs from "fs";
import path from "path";
import { glob } from "glob";
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
const MAX_CONTENT_SIZE = 4000;

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
interface FileIndex {
  index_name: string;
  content: string;
  embedding: number[];
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

export async function createFileIndexes(
  baseDirectory: string,
  directory: string,
  indexName: string,
  logger: any,
  include?: Array<string>,
  exclude?: Array<string>
) {
  const files = glob.sync(include || "*", {
    cwd: directory,
    nodir: true,
    ignore: exclude,
  });

  await Promise.all(
    files.map(async (filename) => {
      const filepath = path.join(directory, filename);
      const filecontents = await fs.promises.readFile(filepath, "utf-8");
      const importsList = parseImports(filecontents);
      const metadata = {
        filename: filename,
        directory,
        filepath: path.relative(baseDirectory, filename),
        importsList,
      }

      for (let i = 0; i < filecontents.length; i += MAX_CONTENT_SIZE) {
        logger.info(
          `Creating embedding for: ${metadata.filepath}, chunk: [${i},${i + MAX_CONTENT_SIZE}]`
        );
        const embeddingFileContents = filecontents.substring(i, i + MAX_CONTENT_SIZE);
        const summary = await codeSummaryChain.call({
          code: embeddingFileContents,
        });

        logger.info(`file: ${metadata.filename} - ${summary.text}`);
        const rawText =
          `Filename: ${metadata.filename}\nFilepath: ${metadata.filepath}\nSummary:${summary.text}\n\n` +
          embeddingFileContents;
        const embedding = await embeddings.embedQuery(rawText);
        const fileIndex = {
          index_name: indexName,
          content: rawText,
          embedding,
          metadata: {
            summary: summary.text,
            ...metadata,
          },
        }
        await uploadFileIndex(fileIndex, logger);
      }
    })
  );
}

export async function uploadFileIndex(
  file_embedding: FileIndex,
  logger: any
) {
  const maxRetries = 3;
  for (let retry = 0; retry < maxRetries; retry++) {
    logger.info(
      `Uploading a chunk of: ${file_embedding.metadata.filepath}, attempt: ${retry + 1}`
    );
    try {
      await supabaseIndexes.rpc("insert_embedding", file_embedding);
      break;
    } catch (err) {
      console.error(chalk.red(err));
      logger.info(
        chalk.red(
          `Error at ${file_embedding.metadata.filepath}, length of content: ${file_embedding.content.length}`
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

async function createIndex(indexName: string, logger: any) {
  logger.info(`creating index ${indexName} in schema indexes`);
  const { data, error: indexError } = await supabaseIndexes.rpc(
    "create_index",
    {
      index_name: indexName,
    }
  );
  if (indexError) {
    logger.error(indexError);
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
    logger.error(deleteError);
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
  indexName: string,
  logger: any,
  include?: Array<string>,
  exclude?: Array<string>
) {
  logger.info("Starting Ingestion...");
  logger.info(
    { include, exclude },
    `including: ${include},  excluding: ${exclude}`
  );
  await createIndex(indexName, logger);
  await createFileIndexes(directory, directory, indexName, logger, include, exclude);
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
    logger.error(error);
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
