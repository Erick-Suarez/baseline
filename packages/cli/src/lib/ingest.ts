import fs from "fs";
import path from "path";
import { PineconeClient } from "@pinecone-database/pinecone";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeStore } from "langchain/vectorstores";
import ora, { oraPromise } from "ora";
import chalk from "chalk";

import * as dotenv from "dotenv";
dotenv.config();

function parseImports(content) {
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

function loadFiles(directory, docs, validExtensions, ignoreDirectories) {
  const files = fs.readdirSync(directory, { withFileTypes: true });
  files.forEach((file) => {
    const filepath = path.join(directory, file.name);
    if (file.isDirectory()) {
      if (ignoreDirectories.includes(file.name)) {
        return;
      }
      loadFiles(filepath, docs, validExtensions, ignoreDirectories);
    }
    if (validExtensions.includes(path.extname(file.name))) {
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

async function uploadDoc(
  { filename, directory, filepath, content, importsList },
  pineconeIndex
) {
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

async function uploadDocsToPincone(docs, pineconeIndex) {
  const maxSize = 4000;
  for await (const {
    filename,
    directory,
    filepath,
    content,
    importsList,
  } of docs) {
    try {
      const wait = new Promise((res, rej) => {
        setTimeout(() => {
          res("");
        }, 500);
      });

      const s = ora(`uploading: ${chalk.blue(filepath)}`).start();
      await wait;
      s.succeed(`uploaded: ${chalk.blue(filepath)}`);
      for (let i = 0; i < content.length; i += maxSize) {
        // await uploadDoc(
        //   {
        //     filename,
        //     directory,
        //     filepath,
        //     content: content.substring(i, i + maxSize),
        //     importsList,
        //   },
        //   pineconeIndex
        // );
      }
    } catch (err) {
      //   console.error(err);
      //   console.log(`Error at ${filepath}, length of content: ${content.length}`);
      console.log(chalk.red(`Error uploading ${filepath}`));
    }
  }
}

export async function ingestDirectory({
  dirPath,
  validExtensions,
  excludePaths,
}) {
  const docs = [];
  // Load files
  {
    const stepSpinner = ora("Starting ingestion, loading files...").start();
    const codebaseDirectory = dirPath;
    loadFiles(codebaseDirectory, docs, validExtensions, excludePaths);
    stepSpinner.succeed("Files loaded");
  }

  // Initialize Pinecone
  const client = new PineconeClient();
  {
    const stepSpinner = ora("Initializing Baseline DB").start();
    await client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });
    stepSpinner.succeed("Database Initialized, starting document upload");
  }
  // Upload files to Pinecone
  {
    const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
    await uploadDocsToPincone(docs, pineconeIndex);
  }
  ora("").succeed("Ingestion Done!");
}

export function parseBaselineSettings() {
  const pathToBaselineSettings = `${process.cwd()}/baseline-settings.json`;
  if (!fs.existsSync(pathToBaselineSettings)) {
    throw `${chalk.red(
      "baseline-settings.json not found!"
    )} Did you make sure to run ${chalk.green("baseline init")} first?
     `;
  }

  const settings = JSON.parse(
    fs.readFileSync(pathToBaselineSettings).toString()
  );

  return settings;
}
