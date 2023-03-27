import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';
import { PineconeClient } from '@pinecone-database/pinecone';
import { Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
const VALID_EXT = ['.js', '.jsx', '.ts', '.tsx', '.py'];
function parseImports(content) {
    const es6Pattern = /import\s*(?:\*\s+as)?\{?\s*(\w+(?:,\s*\w+)*)\s*\}?\s*from\s+["']([\.\w\-@\/]+)["'];?/g;
    const commonJSPattern = /const\s+{?(\w+)}?\s*=\s*require\(['"](.+)['"]\);?/g;
    return [
        ...content.matchAll(commonJSPattern),
        ...content.matchAll(es6Pattern),
    ].map(match => {
        return { variable: match[1], import: match[2] };
    });
}
function loadFiles(directory, docs) {
    const files = fs.readdirSync(directory, { withFileTypes: true });
    files.forEach(file => {
        const filepath = path.join(directory, file.name);
        if (file.isDirectory()) {
            loadFiles(filepath, docs);
        }
        if (VALID_EXT.includes(path.extname(file.name))) {
            const content = fs.readFileSync(filepath, 'utf-8');
            const importsList = parseImports(content);
            console.log(importsList);
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
async function uploadDoc({ filename, directory, filepath, content, importsList }, pineconeIndex) {
    await PineconeStore.fromDocuments([
        new Document({
            pageContent: `Filename: ${filename}\nFilepath: ${filepath}\n\n` + content,
            metadata: {
                filename,
                directory,
                filepath,
                imports: JSON.stringify(importsList),
            },
        }),
    ], new OpenAIEmbeddings(), {
        pineconeIndex,
    });
}
async function uploadDocsToPincone(docs, pineconeIndex) {
    const maxSize = 5000;
    for (const { filename, directory, filepath, content, importsList } of docs) {
        try {
            for (let i = 0; i < content.length; i += maxSize) {
                await uploadDoc({
                    filename,
                    directory,
                    filepath,
                    content: content.substring(i, i + maxSize),
                    importsList,
                }, pineconeIndex);
            }
        }
        catch (err) {
            console.error(err);
            console.log(`Error at ${filepath}, length of content: ${content.length}`);
        }
    }
}
dotenv.config();
const codebaseDirectory = process.argv.slice(2)[0] || 'demo-codebases/smartcar-node-sdk';
const docs = [];
loadFiles(codebaseDirectory, docs);
const client = new PineconeClient();
await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
});
console.log('Starting Ingestion...');
const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
await uploadDocsToPincone(docs, pineconeIndex);
console.log('Ingestion done!');
