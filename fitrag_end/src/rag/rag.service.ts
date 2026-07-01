import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "../database/database.service";
import { CreateRagDocumentDto, RagSearchDto } from "./dto";

export type RagSearchResult = {
  id: string;
  source: string;
  title: string;
  source_url: string | null;
  chunk_text: string;
  metadata?: Record<string, unknown>;
  relevance_score: number;
};

type GeminiEmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

@Injectable()
export class RagService {
  // RAG 모듈의 책임:
  // - 근거 문서를 청크로 저장하고, 가능하면 임베딩을 생성한다.
  // - 추천 생성에 필요한 문서를 벡터 검색 또는 키워드 검색으로 찾아 반환한다.
  // - 운동/식단을 직접 만들지 않고, recommendations 모듈이 사용할 "근거"만 제공한다.
  private readonly geminiApiKey: string | null;
  private readonly geminiEmbeddingModel: string;
  private readonly geminiEmbeddingDimensions: number;

  constructor(
    private readonly db: DatabaseService,
    config: ConfigService,
  ) {
    this.geminiApiKey = config.get<string>("GEMINI_API_KEY") ?? null;
    this.geminiEmbeddingModel =
      config.get<string>("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-001";
    this.geminiEmbeddingDimensions = Number(
      config.get<string>("GEMINI_EMBEDDING_DIMENSIONS") ?? 768,
    );
    console.log(
      "RAG Service initialized with Gemini API Key:",
      this.geminiApiKey ? "Present" : "Not Present",
    );
  }

  async createDocument(dto: CreateRagDocumentDto) {
    const chunks = this.chunkText(dto.text);
    const vectors = await this.embedDocuments(chunks);
    const created = [];
    for (const [index, chunk] of chunks.entries()) {
      const result = await this.db.query(
        `insert into public.rag_documents (
          source, title, source_url, chunk_text, embedding, metadata
        ) values ($1,$2,$3,$4,$5::extensions.vector,$6)
        returning id, source, title, source_url, chunk_text, metadata`,
        [
          dto.source,
          dto.title,
          dto.source_url ?? null,
          chunk,
          this.toVectorLiteralOrNull(vectors[index]),
          JSON.stringify({ chunk_index: index }),
        ],
      );
      created.push(result.rows[0]);
    }
    return { count: created.length, documents: created };
  }

  async search(dto: RagSearchDto): Promise<RagSearchResult[]> {
    const topK = dto.top_k ?? 5;
    if (this.geminiApiKey) {
      try {
        const vectorResults = await this.vectorSearch(dto, topK);
        if (vectorResults.length > 0) return vectorResults;
      } catch {
        // Fall back to keyword search when the embedding provider is unavailable.
      }
    }

    const keywordResults = await this.keywordSearch(dto, topK);
    if (keywordResults.length > 0) return keywordResults;

    return this.seedFallbackEvidence(dto.query).slice(0, topK);
  }

  private async vectorSearch(dto: RagSearchDto, topK: number) {
    const embedding = await this.embedText(dto.query, "RETRIEVAL_QUERY");
    if (!embedding?.length) return [];

    const filters = this.buildMetadataFilters(dto, 3);
    const result = await this.db.query<RagSearchResult>(
      `select id, source, title, source_url, chunk_text, metadata,
        greatest(0, 1 - (embedding <=> $1::extensions.vector))::float as relevance_score
       from public.rag_documents
       where embedding is not null
       ${filters.sql}
       order by embedding <=> $1::extensions.vector
       limit $2`,
      [this.toVectorLiteral(embedding), topK, ...filters.params],
    );

    return result.rows;
  }

  private async keywordSearch(dto: RagSearchDto, topK: number) {
    const filters = this.buildMetadataFilters(dto, 3);
    const result = await this.db.query<RagSearchResult>(
      `select id, source, title, source_url, chunk_text, metadata,
        ts_rank_cd(
          to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(chunk_text, '')),
          plainto_tsquery('simple', $1)
        )::float as relevance_score
       from public.rag_documents
       where (
         to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(chunk_text, ''))
         @@ plainto_tsquery('simple', $1)
         or chunk_text ilike '%' || $1 || '%'
         or title ilike '%' || $1 || '%'
       )
       ${filters.sql}
       order by relevance_score desc, created_at desc
       limit $2`,
      [dto.query, topK, ...filters.params],
    );

    return result.rows;
  }

  private chunkText(text: string) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const chunks: string[] = [];
    for (let start = 0; start < normalized.length; start += 900) {
      chunks.push(normalized.slice(start, start + 1000));
    }
    return chunks.length ? chunks : [text];
  }

  private async embedDocuments(chunks: string[]) {
    if (!this.geminiApiKey) return chunks.map(() => null);
    const vectors: Array<number[] | null> = [];
    for (const chunk of chunks) {
      try {
        const vector = await this.embedText(chunk, "RETRIEVAL_DOCUMENT");
        vectors.push(vector.length ? vector : null);
      } catch {
        vectors.push(null);
      }
    }
    return vectors;
  }

  private async embedText(text: string, taskType: GeminiEmbeddingTaskType) {
    if (!this.geminiApiKey) return [];
    const model = this.geminiEmbeddingModel.replace(/^models\//, "");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${model}`,
          content: {
            parts: [{ text }],
          },
          taskType,
          outputDimensionality: this.geminiEmbeddingDimensions,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const payload = (await response.json()) as {
      embedding?: { values?: number[] };
    };
    return payload.embedding?.values ?? [];
  }

  private buildMetadataFilters(dto: RagSearchDto, firstParamIndex: number) {
    const clauses: string[] = [];
    const params: string[] = [];
    let paramIndex = firstParamIndex;

    if (dto.domain) {
      clauses.push(`metadata->>'domain' = $${paramIndex}`);
      params.push(dto.domain);
      paramIndex += 1;
    }

    if (dto.use_case) {
      clauses.push(`metadata->'use_cases' ? $${paramIndex}`);
      params.push(dto.use_case);
    }

    return {
      sql: clauses.length ? `and ${clauses.join(" and ")}` : "",
      params,
    };
  }

  private toVectorLiteral(values: number[]) {
    return `[${values.join(",")}]`;
  }

  private toVectorLiteralOrNull(values: number[] | null | undefined) {
    return values?.length ? this.toVectorLiteral(values) : null;
  }

  private seedFallbackEvidence(query: string): RagSearchResult[] {
    return [
      {
        id: "00000000-0000-0000-0000-000000000000",
        source: "FitRAG Policy",
        title: "MVP 기본 운동/영양 안전 정책",
        source_url: null,
        chunk_text:
          "초기 RAG 문서가 부족할 때는 보수적인 운동 강도, 충분한 회복, 극단적 칼로리 제한 회피를 기본 정책으로 적용한다.",
        relevance_score: query ? 0.1 : 0,
      },
    ];
  }
}
