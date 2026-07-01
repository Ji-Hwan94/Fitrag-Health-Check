import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const sourceDir = path.join(repoRoot, 'doc', 'rag_sources');
const outputDir = path.join(repoRoot, 'fitrag_end', 'data', 'rag');
const outputFile = path.join(outputDir, 'fitrag-rag-corpus.jsonl');
const chunkSize = 900;

function parseFrontMatter(markdown, fileName) {
  if (!markdown.startsWith('---\n')) {
    return { metadata: {}, body: markdown.trim() };
  }

  const end = markdown.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error(`Invalid front matter in ${fileName}`);
  }

  const rawFrontMatter = markdown.slice(4, end).trim();
  const body = markdown.slice(end + 4).trim();
  const metadata = {};
  let currentListKey = null;

  for (const line of rawFrontMatter.split(/\r?\n/)) {
    const listItem = line.match(/^\s*-\s+"?(.+?)"?\s*$/);
    if (listItem && currentListKey) {
      metadata[currentListKey].push(cleanValue(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    if (!rawValue) {
      metadata[key] = [];
      currentListKey = key;
      continue;
    }

    metadata[key] = cleanValue(rawValue);
    currentListKey = null;
  }

  return { metadata, body };
}

function cleanValue(value) {
  const trimmed = value.trim();
  if (trimmed === 'null') return null;
  return trimmed.replace(/^"|"$/g, '');
}

function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoChunks(text) {
  const normalized = normalizeText(text);
  if (normalized.length <= chunkSize) return [normalized];

  const chunks = [];
  let current = '';

  for (const block of normalized.split(/\n\n+/)) {
    if (block.length > chunkSize) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      chunks.push(...splitLongBlock(block));
      continue;
    }

    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length > chunkSize) {
      chunks.push(current.trim());
      current = block;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.filter(Boolean);
}

function splitLongBlock(block) {
  const chunks = [];
  let current = '';

  for (const sentence of block.split(/(?<=[.!?。！？])\s+|(?<=다\.)\s*/u)) {
    if (!sentence) continue;
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > chunkSize) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current.trim());
  return chunks;
}

function createChunkId(fileName, chunkIndex, chunkText) {
  const hash = createHash('sha1')
    .update(`${fileName}:${chunkIndex}:${chunkText}`)
    .digest('hex')
    .slice(0, 12);
  const baseName = path.basename(fileName, '.md');
  return `${baseName}-${chunkIndex + 1}-${hash}`;
}

async function main() {
  const files = (await readdir(sourceDir))
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .sort();

  const records = [];

  for (const file of files) {
    const markdown = await readFile(path.join(sourceDir, file), 'utf8');
    const { metadata, body } = parseFrontMatter(markdown, file);
    const chunks = splitIntoChunks(body);

    for (const [index, chunkText] of chunks.entries()) {
      records.push({
        id: createChunkId(file, index, chunkText),
        source: metadata.source ?? 'FitRAG Coach',
        title: metadata.title ?? path.basename(file, '.md'),
        source_url: metadata.source_url ?? null,
        chunk_text: chunkText,
        metadata: {
          ...metadata,
          source_file: file,
          chunk_index: index,
          chunk_count: chunks.length,
        },
      });
    }
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(
    outputFile,
    `${records.map((record) => JSON.stringify(record)).join('\n')}\n`,
    'utf8',
  );

  console.log(`Built ${records.length} RAG chunks`);
  console.log(outputFile);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
