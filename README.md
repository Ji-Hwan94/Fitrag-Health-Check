# FR-001

## Branch

`FR-001`

## 1. 새로 추가한 것

### RAG 근거 문서 소스 추가

- `doc/rag_sources/*`
- 운동 강도, 주간 운동 계획, 식단/영양 목표, 알레르기/대체식품, 안전 정책 문서 추가

### RAG 코퍼스 데이터 추가

- `fitrag_end/data/rag/fitrag-rag-corpus.jsonl`

### RAG 코퍼스 빌드/적재 스크립트 추가

- `fitrag_end/scripts/build-rag-corpus.mjs`
- `fitrag_end/scripts/ingest-rag-corpus.mjs`

### 프론트 API 연동 유틸 추가

- `fitrag_front/src/lib/api.ts`
- `fitrag_front/src/lib/useAuthProfileGuard.ts`
- `fitrag_front/src/lib/recommendations.ts`

### Supabase 마이그레이션 추가

- 건강 프로필 `medical_notes` 필드
- 목표 체지방률 필드
- Gemini RAG embedding 768차원 대응 마이그레이션

## 2. 개선 및 변경된 것

### 추천 생성 로직 개선

- `/recommendations/full`에서 신체 분석, 운동 계획, 식단 계획, 장보기 항목, RAG 근거를 한 번에 생성하도록 개선
- 운동/식단 추천에 RAG 검색 결과를 반영
- Gemini LLM 기반 추천 생성 및 fallback 로직 추가
- 생성 결과에 `fallback_used`, `fallback_reason` 저장

### RAG 검색 개선

- `GEMINI_API_KEY` 기반 Gemini embedding 사용
- `gemini-embedding-001` 모델과 `outputDimensionality: 768` 적용
- 벡터 검색 실패 시 키워드 검색, 최종 fallback 근거로 전환
- 빈 embedding vector 저장 방지

### 프론트 추천 화면 개선

- 로그인 세션 기반으로 프로필/목표 조회
- 실제 백엔드 API로 RAG 추천 요청
- 추천 생성 상태 표시
- 서버 추천 결과를 운동/식단/장보기/RAG 근거 패널에 반영

### 프로필/목표 입력 개선

- 부상, 알레르기, 식단 제한, 선호 음식, 질환 주의사항 등 개인화 입력 확장
- 목표 체중 외 근육량, 체지방량, 체지방률, 운동 가능 시간/빈도 반영

### 환경 및 빌드 설정 개선

- 백엔드 RAG 스크립트 npm 명령 추가
- Gemini 관련 환경 변수 예시 추가
- 프론트 빌드 명령을 webpack 빌드 방식으로 조정

### 검증 완료

- `fitrag_end` `npm run build` 성공
- Supabase migration 적용 성공
- `npm run rag:ingest-corpus`로 RAG chunk 10개 적재 성공
