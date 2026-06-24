import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateRagDocumentDto, RagSearchDto } from './dto';

export type RagSearchResult = {
  id: string;
  source: string;
  title: string;
  source_url: string | null;
  chunk_text: string;
  relevance_score: number;
};

@Injectable()
export class RagService {
  constructor(private readonly db: DatabaseService) {}

  async createDocument(dto: CreateRagDocumentDto) {
    const chunks = this.chunkText(dto.text);
    const created = [];
    for (const [index, chunk] of chunks.entries()) {
      const result = await this.db.query(
        `insert into public.rag_documents (
          source, title, source_url, chunk_text, metadata
        ) values ($1,$2,$3,$4,$5)
        returning id, source, title, source_url, chunk_text, metadata`,
        [
          dto.source,
          dto.title,
          dto.source_url ?? null,
          chunk,
          JSON.stringify({ chunk_index: index }),
        ],
      );
      created.push(result.rows[0]);
    }
    return { count: created.length, documents: created };
  }

  async search(dto: RagSearchDto): Promise<RagSearchResult[]> {
    const topK = dto.top_k ?? 5;
    const result = await this.db.query<RagSearchResult>(
      `select id, source, title, source_url, chunk_text,
        ts_rank_cd(
          to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(chunk_text, '')),
          plainto_tsquery('simple', $1)
        )::float as relevance_score
       from public.rag_documents
       where
         to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(chunk_text, ''))
         @@ plainto_tsquery('simple', $1)
         or chunk_text ilike '%' || $1 || '%'
         or title ilike '%' || $1 || '%'
       order by relevance_score desc, created_at desc
       limit $2`,
      [dto.query, topK],
    );

    if (result.rows.length > 0) return result.rows;
    return this.seedFallbackEvidence(dto.query).slice(0, topK);
  }

  private chunkText(text: string) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const chunks: string[] = [];
    for (let start = 0; start < normalized.length; start += 900) {
      chunks.push(normalized.slice(start, start + 1000));
    }
    return chunks.length ? chunks : [text];
  }

  private seedFallbackEvidence(query: string): RagSearchResult[] {
    return [
      {
        id: '00000000-0000-0000-0000-000000000000',
        source: 'FitRAG Policy',
        title: 'MVP 기본 운동/영양 안전 정책',
        source_url: null,
        chunk_text:
          '초기 RAG 문서가 부족할 때는 보수적인 운동 강도, 충분한 회복, 극단적 칼로리 제한 회피를 기본 정책으로 적용한다.',
        relevance_score: query ? 0.1 : 0,
      },
    ];
  }
}
