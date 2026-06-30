# FitRAG RAG source documents

이 디렉터리는 FR-007 RAG 근거 제공을 위한 MVP 원천 문서 모음이다.

## 목적

- `운동 계획 추천`과 `식단 계획 추천`에서 검색할 수 있는 근거 문서를 제공한다.
- FR-004, FR-005, FR-007 요구사항에 맞춰 운동 강도, 회복, 단백질, 칼로리, 제한 조건, 안전 정책을 검색 가능하게 만든다.
- 의료 진단이나 치료 목적이 아닌 일반적인 운동/영양 안내만 포함한다.

## 파일 구조

- `manifest.json`: 원천 문서 목록과 태그, 추천 사용 영역.
- `*.md`: RAG 원천 Markdown 문서. YAML front matter와 본문으로 구성한다.
- `../../fitrag_end/scripts/build-rag-corpus.mjs`: 원천 문서를 JSONL 청크로 변환하는 스크립트.
- `../../fitrag_end/data/rag/fitrag-rag-corpus.jsonl`: 스크립트로 생성되는 적재용 JSONL 파일.

## 생성 방법

```powershell
cd fitrag_end
npm run rag:build-corpus
```

## 벡터 DB 적재 방법

`fitrag_end/.env`에 `OPENAI_API_KEY`를 설정하고 로컬 Supabase/PostgreSQL을 실행한 뒤 적재한다.

```powershell
cd fitrag_end
npm run rag:ingest-corpus
```

적재 스크립트는 `fitrag_end/data/rag/fitrag-rag-corpus.jsonl`을 읽고 LangChain `OpenAIEmbeddings`로 임베딩을 만든 뒤 `public.rag_documents`에 저장한다. 같은 원천 파일의 기존 청크는 먼저 삭제해 중복 적재를 방지한다.

## JSONL 필드

- `id`: 안정적인 청크 ID.
- `source`: 출처 기관 또는 FitRAG 내부 정책명.
- `title`: 문서 제목.
- `source_url`: 원문 또는 참고 URL.
- `chunk_text`: 검색 및 답변 생성에 사용할 청크 본문.
- `metadata`: 문서 유형, 태그, 권장 사용 영역, 청크 인덱스.

## 운영 정책

- 외부 자료는 긴 원문 복제가 아니라 FitRAG 서비스 목적에 맞춘 요약 문서로 관리한다.
- 근거가 부족하거나 사용자에게 위험 조건이 있으면 확정적 표현을 피하고 전문가 상담 안내를 우선한다.
- 알레르기, 식단 제한, 부상 이력은 추천 생성 시 반드시 보수적으로 반영한다.
