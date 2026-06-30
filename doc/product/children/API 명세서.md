# API 명세서

FitRAG Coach MVP 백엔드 API 초안이다. 기본 형태는 REST API를 기준으로 정의한다.

## 1. 공통 규칙

### Base URL

```
/api/v1
```

### 인증

```
Authorization: Bearer {access_token}
```

### 공통 응답 형식

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

### 공통 에러 형식

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해주세요."
  }
}
```

## 2. Auth API

### POST /auth/signup

회원가입을 수행한다.

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234",
  "name": "홍길동"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "access_token": "token"
  },
  "error": null
}
```

### POST /auth/login

로그인을 수행한다.

Request:

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

## 3. User API

### GET /me

현재 사용자 정보를 조회한다.

### PUT /me/profile

신체 프로필을 생성하거나 수정한다.

Request:

```json
{
  "gender": "male",
  "age": 30,
  "height_cm": 175,
  "weight_kg": 82,
  "muscle_mass_kg": 34,
  "body_fat_percentage": 24,
  "activity_level": "moderate",
  "injuries": "무릎 통증 이력",
  "allergies": "없음",
  "dietary_restrictions": "없음"
}
```

### GET /me/profile

현재 신체 프로필을 조회한다.

## 4. Goal API

### POST /goals

목표를 생성한다.

Request:

```json
{
  "goal_type": "fat_loss",
  "target_weight_kg": 74,
  "target_muscle_mass_kg": null,
  "target_fat_mass_kg": null,
  "target_date": "2026-09-30",
  "weekly_workout_days": 3,
  "daily_workout_minutes": 60,
  "experience_level": "beginner"
}
```

### GET /goals

사용자의 목표 목록을 조회한다.

### GET /goals/{goal_id}

목표 상세 정보를 조회한다.

## 5. Analysis API

### POST /analysis/body

현재 프로필과 목표를 기반으로 신체 상태를 분석한다.

Request:

```json
{
  "goal_id": "uuid"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "bmi": 26.8,
    "weight_change_kg": -8,
    "recommended_weekly_change_kg": "0.25~0.75",
    "estimated_duration_weeks": 12,
    "risk_flags": ["무릎 통증 이력 확인 필요"],
    "summary": "완만한 감량 전략이 적합합니다."
  },
  "error": null
}
```

## 6. Recommendation API

### POST /recommendations/workout

주간 운동 계획을 생성한다.

Request:

```json
{
  "goal_id": "uuid",
  "week_start_date": "2026-06-29"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "workout_plan_id": "uuid",
    "frequency_per_week": 3,
    "intensity_level": "beginner_low_to_moderate",
    "days": [
      {
        "day": "Monday",
        "warmup": ["5분 가벼운 로잉", "동적 스트레칭"],
        "skill": ["스쿼트 기본 자세"],
        "strength": ["Goblet squat 3x10"],
        "wod": "AMRAP 10분: air squat 10, ring row 8, bike 200m",
        "cooldown": ["하체 스트레칭 5분"]
      }
    ],
    "caution_notes": ["무릎 통증 시 점프 동작 제외"]
  },
  "error": null
}
```

### POST /recommendations/meal

식단 계획을 생성한다.

Request:

```json
{
  "goal_id": "uuid"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "meal_plan_id": "uuid",
    "daily_calories": 2100,
    "protein_g": 140,
    "carbs_g": 230,
    "fat_g": 60,
    "meals": [
      {
        "type": "breakfast",
        "menu": "그릭요거트, 블루베리, 삶은 계란",
        "notes": "단백질과 탄수화물을 함께 섭취"
      }
    ],
    "nutrition_notes": ["극단적인 칼로리 제한은 피하세요."]
  },
  "error": null
}
```

### POST /recommendations/full

신체 분석, 운동 계획, 식단 계획, 장보기 리스트, RAG 근거를 한 번에 생성한다.

## 7. Shopping API

### GET /meal-plans/{meal_plan_id}/shopping-items

식단 계획의 식재료 리스트를 조회한다.

Response:

```json
{
  "success": true,
  "data": [
    {
      "name": "닭가슴살",
      "quantity": "1kg",
      "search_keyword": "닭가슴살 1kg",
      "search_url": "https://www.coupang.com/np/search?q=닭가슴살%201kg",
      "estimated_price": null
    }
  ],
  "error": null
}
```

## 8. RAG API

### POST /rag/documents

RAG 문서를 등록한다. 관리자 전용이다.

Request:

```json
{
  "source": "WHO",
  "title": "Physical Activity Guidelines",
  "source_url": "https://example.com",
  "text": "문서 본문"
}
```

### POST /rag/search

추천 근거 문서를 검색한다.

Request:

```json
{
  "query": "초보자 크로스핏 운동 강도",
  "top_k": 5
}
```

### GET /recommendations/{recommendation_id}/evidence

추천 결과에 연결된 근거 문서를 조회한다.

## 9. 주요 에러 코드

- `AUTH_REQUIRED`: 인증이 필요함
- `FORBIDDEN`: 권한 없음
- `VALIDATION_ERROR`: 입력값 검증 실패
- `PROFILE_REQUIRED`: 신체 프로필 필요
- `GOAL_NOT_FOUND`: 목표 없음
- `RAG_CONTEXT_INSUFFICIENT`: 근거 문서 부족
- `LLM_GENERATION_FAILED`: LLM 생성 실패