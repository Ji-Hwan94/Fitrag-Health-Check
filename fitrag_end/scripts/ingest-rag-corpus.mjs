import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.resolve(__dirname, '..');
const corpusFile = path.join(backendRoot, 'data', 'rag', 'fitrag-rag-corpus.jsonl');

await loadDotEnv(path.join(backendRoot, '.env'));

const databaseUrl = process.env.DATABASE_URL;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiEmbeddingModel =
  process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001';
const geminiEmbeddingDimensions = Number(
  process.env.GEMINI_EMBEDDING_DIMENSIONS ?? 768,
);

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY is required to create embeddings');
}

const records = (await readJsonl(corpusFile)).map((record) => ({
  ...record,
  metadata: {
    ...record.metadata,
    corpus_id: record.id,
    ingested_from: path.relative(repoRoot, corpusFile).replace(/\\/g, '/'),
  },
}));

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

try {
  const sourceFiles = [...new Set(records.map((record) => record.metadata.source_file))];
  await pool.query(
    `delete from public.rag_documents
     where metadata->>'source_file' = any($1::text[])`,
    [sourceFiles],
  );

  let inserted = 0;
  for (const record of records) {
    const vector = await createEmbedding(record);
    await pool.query(
      `insert into public.rag_documents (
        source, title, source_url, chunk_text, embedding, metadata
      ) values ($1, $2, $3, $4, $5::vector, $6::jsonb)`,
      [
        record.source,
        record.title,
        record.source_url,
        record.chunk_text,
        toVectorLiteral(vector),
        JSON.stringify(record.metadata),
      ],
    );
    inserted += 1;
  }

  console.log(`Ingested ${inserted} RAG chunks from ${corpusFile}`);
} finally {
  await pool.end();
}

async function readJsonl(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function loadDotEnv(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value.replace(/^"|"$/g, '');
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function toVectorLiteral(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Gemini returned an empty embedding vector');
  }
  return `[${values.join(',')}]`;
}

async function createEmbedding(record) {
  try {
    const vector = await embedText(record.chunk_text, 'RETRIEVAL_DOCUMENT');
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Gemini returned an empty embedding vector');
    }
    return vector;
  } catch (error) {
    const corpusId = record.metadata?.corpus_id ?? record.id ?? 'unknown';
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create Gemini embedding for corpus_id=${corpusId}: ${message}`,
    );
  }
}

async function embedText(text, taskType) {
  const model = geminiEmbeddingModel.replace(/^models\//, '');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{ text }],
        },
        taskType,
        outputDimensionality: geminiEmbeddingDimensions,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const payload = await response.json();
  return payload.embedding?.values ?? [];
}
