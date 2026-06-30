# ERD

FitRAG Coach MVP의 핵심 데이터 모델과 관계를 정의한다.

## 1. 핵심 엔티티

### User

- 사용자 계정 기본 정보
- 이메일, 이름, 생성일을 관리한다.

### HealthProfile

- 사용자의 신체 정보와 건강 관련 입력값을 관리한다.
- User와 1:1 관계를 갖는다.

### Goal

- 사용자의 목표 유형과 목표 수치를 관리한다.
- User와 1:N 관계를 갖는다.

### WorkoutPlan

- 생성된 주간 운동 계획을 저장한다.
- User, Goal과 연결된다.

### MealPlan

- 생성된 식단 계획과 식재료 리스트를 저장한다.
- User, Goal과 연결된다.

### ShoppingItem

- 식단 실행에 필요한 식재료와 검색 URL을 저장한다.
- MealPlan과 1:N 관계를 갖는다.

### RagDocument

- RAG 검색에 사용하는 원천 문서와 청크 정보를 저장한다.

### RecommendationEvidence

- 추천 결과와 근거 문서의 연결 정보를 저장한다.

## 2. 관계 요약

- User 1:1 HealthProfile
- User 1:N Goal
- User 1:N WorkoutPlan
- User 1:N MealPlan
- Goal 1:N WorkoutPlan
- Goal 1:N MealPlan
- MealPlan 1:N ShoppingItem
- WorkoutPlan N:M RagDocument via RecommendationEvidence
- MealPlan N:M RagDocument via RecommendationEvidence

## 3. Mermaid ERD

```mermaid
erDiagram
    USER ||--|| HEALTH_PROFILE : has
    USER ||--o{ GOAL : creates
    USER ||--o{ WORKOUT_PLAN : receives
    USER ||--o{ MEAL_PLAN : receives
    GOAL ||--o{ WORKOUT_PLAN : guides
    GOAL ||--o{ MEAL_PLAN : guides
    MEAL_PLAN ||--o{ SHOPPING_ITEM : contains
    WORKOUT_PLAN ||--o{ RECOMMENDATION_EVIDENCE : cites
    MEAL_PLAN ||--o{ RECOMMENDATION_EVIDENCE : cites
    RAG_DOCUMENT ||--o{ RECOMMENDATION_EVIDENCE : referenced_by

    USER {
        uuid id PK
        string email UK
        string name
        datetime created_at
        datetime updated_at
    }

    HEALTH_PROFILE {
        uuid id PK
        uuid user_id FK
        string gender
        int age
        decimal height_cm
        decimal weight_kg
        decimal muscle_mass_kg
        decimal fat_mass_kg
        decimal body_fat_percentage
        decimal bmi
        string activity_level
        text injuries
        text allergies
        text dietary_restrictions
        text food_preferences
        datetime created_at
        datetime updated_at
    }

    GOAL {
        uuid id PK
        uuid user_id FK
        string goal_type
        decimal target_weight_kg
        decimal target_muscle_mass_kg
        decimal target_fat_mass_kg
        date target_date
        int weekly_workout_days
        int daily_workout_minutes
        string experience_level
        datetime created_at
    }

    WORKOUT_PLAN {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        date week_start_date
        int frequency_per_week
        string intensity_level
        json plan_json
        text caution_notes
        datetime created_at
    }

    MEAL_PLAN {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        int daily_calories
        int protein_g
        int carbs_g
        int fat_g
        json meals_json
        text nutrition_notes
        datetime created_at
    }

    SHOPPING_ITEM {
        uuid id PK
        uuid meal_plan_id FK
        string name
        string quantity
        string search_keyword
        string search_url
        decimal estimated_price
        datetime created_at
    }

    RAG_DOCUMENT {
        uuid id PK
        string source
        string title
        string source_url
        text chunk_text
        vector embedding
        json metadata
        datetime created_at
    }

    RECOMMENDATION_EVIDENCE {
        uuid id PK
        uuid workout_plan_id FK
        uuid meal_plan_id FK
        uuid rag_document_id FK
        string evidence_type
        text summary
        decimal relevance_score
        datetime created_at
    }
```

## 4. 설계 메모

- `plan_json`과 `meals_json`은 MVP 단계에서 빠른 반복을 위해 JSON으로 저장한다.
- 추천 결과 검색과 통계를 강화할 시 `WorkoutDay`, `WorkoutExercise`, `Meal`, `MealFood` 테이블로 정규화한다.
- `RecommendationEvidence`는 운동 계획과 식단 계획 중 하나에 연결될 수 있다.
- `RagDocument.embedding`은 Chroma 또는 FAISS를 사용할 경우 애플리케이션 DB에는 메타데이터만 저장할 수 있다.