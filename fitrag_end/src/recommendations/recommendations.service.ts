import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";
import { AnalysisService } from "../analysis/analysis.service";
import { DatabaseService } from "../database/database.service";
import { GoalsService } from "../goals/goals.service";
import { RagSearchResult, RagService } from "../rag/rag.service";
import { UsersService } from "../users/users.service";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatOpenAI } from "@langchain/openai";

const mealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  menu: z.string(),
  notes: z.string(),
});

const workoutDaySchema = z.object({
  day: z.string(),
  goal_focus: z.string(),
  warmup: z.array(z.string()),
  skill: z.array(z.string()),
  strength: z.array(z.string()),
  wod: z.string(),
  cooldown: z.array(z.string()),
  target_minutes: z.number().int(),
  alternatives: z.array(z.string()),
});

const generatedMealResponseSchema = z.object({
  meals: z.array(mealSchema),
});

const generatedWorkoutResponseSchema = z.object({
  days: z.array(workoutDaySchema),
});

type Meal = z.infer<typeof mealSchema>;
type WorkoutDay = z.infer<typeof workoutDaySchema>;

type WorkoutGoalContext = {
  goalType: string;
  targetWeightKg: number | null;
  targetMuscleMassKg: number | null;
  targetFatMassKg: number | null;
  targetBodyFatPercentage: number | null;
  targetDate: string | null;
  weeklyWorkoutDays: number;
  dailyWorkoutMinutes: number;
  experienceLevel: string;
};

type GeneratedWorkoutResponse = {
  days: WorkoutDay[];
};

type GeneratedMealResponse = {
  meals: Meal[];
};

type FallbackReason =
  | "llm_not_configured"
  | "evidence_insufficient"
  | "llm_generation_failed"
  | "schema_validation_failed"
  | "safety_validation_failed";

type GenerationResult<T> = {
  value: T;
  fallback_used: boolean;
  fallback_reason: FallbackReason | null;
};

type GenerationAttempt<T> =
  | {
      value: T;
      fallback_used: false;
      fallback_reason: null;
    }
  | {
      value: null;
      fallback_used: true;
      fallback_reason: FallbackReason;
    };

type StructuredInvoker<T> = {
  invoke(
    input: Array<{ role: "system" | "user"; content: string }>,
  ): Promise<T>;
};

@Injectable()
export class RecommendationsService {
  // recommendations 모듈의 책임:
  // - 사용자 프로필, 목표 입력값, RAG 근거를 조합해 실제 운동/식단/장보기 결과를 만든다.
  // - 생성 결과를 workout_plans, meal_plans, shopping_items, recommendation_evidence에 저장한다.
  // - RAG 검색 자체는 RagService에 위임하고, 여기서는 추천 정책과 개인화 로직을 담당한다.
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly llm: ChatGoogleGenerativeAI | null;
  private lastLlmRequestAt = 0;
  private readonly llmRequestIntervalMs = 12000;

  constructor(
    private readonly db: DatabaseService,
    private readonly goals: GoalsService,
    private readonly users: UsersService,
    private readonly analysis: AnalysisService,
    private readonly rag: RagService,
    config: ConfigService,
  ) {
    // gpt-4o-mini 모델
    // const apiKey = config.get<string>('OPENAI_API_KEY');
    // this.llm = apiKey
    //   ? new ChatOpenAI({
    //       apiKey,
    //       model: config.get<string>('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
    //       temperature: 0.2,
    //     })
    //   : null;

    const apiKey = config.get<string>("GEMINI_API_KEY");
    this.llm = apiKey
      ? new ChatGoogleGenerativeAI({
          apiKey,
          model: config.get<string>("GEMINI_MODEL") ?? "gemini-2.5-flash",
          temperature: 0.2,
        })
      : null;
  }

  private async waitForLlmRateLimit() {
    const now = Date.now();
    const elapsed = now - this.lastLlmRequestAt;
    if (elapsed < this.llmRequestIntervalMs) {
      const delayMs = this.llmRequestIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    this.lastLlmRequestAt = Date.now();
  }

  async createWorkoutPlan(
    userId: string,
    goalId: string,
    weekStartDate: string,
  ) {
    const goal = await this.goals.getOwnedGoal(userId, goalId);
    const profile = await this.users.getProfile(userId);
    const frequency = goal.weekly_workout_days ?? 3;
    const goalContext = this.buildWorkoutGoalContext(goal, frequency);
    const evidenceQuery = [
      goal.experience_level,
      goal.goal_type,
      goal.target_weight_kg ? `목표 체중 ${goal.target_weight_kg}kg` : "",
      goal.target_muscle_mass_kg
        ? `목표 근육량 ${goal.target_muscle_mass_kg}kg`
        : "",
      goal.target_fat_mass_kg
        ? `목표 체지방량 ${goal.target_fat_mass_kg}kg`
        : "",
      goal.target_body_fat_percentage
        ? `목표 체지방률 ${goal.target_body_fat_percentage}%`
        : "",
      goal.target_date ? `목표 기간 ${goal.target_date}` : "",
      goal.daily_workout_minutes
        ? `하루 운동 시간 ${goal.daily_workout_minutes}분`
        : "",
      `주 ${frequency}회`,
      profile.injuries ? `부상 이력 ${profile.injuries}` : "",
      profile.medical_notes ? `질환 주의사항 ${profile.medical_notes}` : "",
      "크로스핏 운동 강도 회복일 스케일링",
    ]
      .filter(Boolean)
      .join(" ");

    this.logger.log(`Workout evidence query: ${evidenceQuery}`);
    const evidence = await this.rag.search({
      query: evidenceQuery,
      domain: "exercise",
      use_case: "workout_plan",
      top_k: 3,
    });
    const intensityLevel = `${goal.experience_level}_${this.goalIntensity(goal.goal_type)}`;
    const workoutGeneration = await this.buildWorkoutDays(
      frequency,
      goal.experience_level,
      goalContext,
      profile.injuries,
      profile.medical_notes,
      evidence,
    );
    const days = workoutGeneration.value;
    const cautionNotes = this.buildCautions(
      profile.injuries,
      profile.medical_notes,
      goalContext,
      goal.experience_level,
      evidence,
    );

    const result = await this.db.query<{ id: string }>(
      `insert into public.workout_plans (
        user_id, goal_id, week_start_date, frequency_per_week,
        intensity_level, plan_json, caution_notes
      ) values ($1,$2,$3,$4,$5,$6,$7)
      returning id`,
      [
        userId,
        goalId,
        weekStartDate,
        frequency,
        intensityLevel,
        JSON.stringify({
          days,
          fallback_used: workoutGeneration.fallback_used,
          fallback_reason: workoutGeneration.fallback_reason,
        }),
        cautionNotes.join("\n"),
      ],
    );

    const workoutPlanId = result.rows[0].id;
    await this.attachEvidenceRows(workoutPlanId, null, evidence);

    return {
      workout_plan_id: workoutPlanId,
      frequency_per_week: frequency,
      intensity_level: intensityLevel,
      days,
      caution_notes: cautionNotes,
      fallback_used: workoutGeneration.fallback_used,
      fallback_reason: workoutGeneration.fallback_reason,
    };
  }

  async createMealPlan(userId: string, goalId: string) {
    const goal = await this.goals.getOwnedGoal(userId, goalId);
    const profile = await this.users.getProfile(userId);
    const currentWeight = Number(profile.weight_kg);
    const evidenceQuery = [
      goal.goal_type,
      `${currentWeight}kg`,
      profile.allergies ? `알레르기 ${profile.allergies}` : "",
      profile.dietary_restrictions
        ? `식단 제한 ${profile.dietary_restrictions}`
        : "",
      profile.food_preferences
        ? `선호 비선호 음식 ${profile.food_preferences}`
        : "",
      profile.medical_notes ? `질환 주의사항 ${profile.medical_notes}` : "",
      "단백질 섭취량 칼로리 식단 대체 식품 장보기",
    ]
      .filter(Boolean)
      .join(" ");
    const evidence = await this.rag.search({
      query: evidenceQuery,
      domain: "nutrition",
      use_case: "meal_plan",
      top_k: 3,
    });
    const dailyCalories = this.estimateCalories(profile, goal.goal_type);
    const proteinG = Math.round(currentWeight * 1.8);
    const fatG = Math.round((dailyCalories * 0.25) / 9);
    const carbsG = Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4);
    const mealGeneration = await this.buildMeals(
      goal.goal_type,
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      profile.dietary_restrictions,
      profile.allergies,
      profile.food_preferences,
      profile.medical_notes,
      evidence,
    );
    const meals = mealGeneration.value;
    const nutritionNotes = [
      "극단적인 칼로리 제한은 피하세요.",
      "운동 전후에는 단백질과 탄수화물을 함께 섭취하는 편이 좋습니다.",
      evidence.length
        ? `RAG 근거: ${evidence.map((doc) => doc.title).join(", ")}`
        : "RAG 근거가 부족하므로 일반 원칙 수준으로 보수적으로 안내합니다.",
      `fallback_used: ${mealGeneration.fallback_used}`,
      `fallback_reason: ${mealGeneration.fallback_reason ?? "none"}`,
    ];

    const mealResult = await this.db.query<{ id: string }>(
      `insert into public.meal_plans (
        user_id, goal_id, daily_calories, protein_g, carbs_g, fat_g,
        meals_json, nutrition_notes
      ) values ($1,$2,$3,$4,$5,$6,$7,$8)
      returning id`,
      [
        userId,
        goalId,
        dailyCalories,
        proteinG,
        carbsG,
        fatG,
        JSON.stringify(meals),
        nutritionNotes.join("\n"),
      ],
    );

    const mealPlanId = mealResult.rows[0].id;
    const shoppingItems = await this.createShoppingItems(
      mealPlanId,
      meals,
      profile.dietary_restrictions,
      profile.food_preferences,
      profile.medical_notes,
    );
    await this.attachEvidenceRows(null, mealPlanId, evidence);

    return {
      meal_plan_id: mealPlanId,
      daily_calories: dailyCalories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      meals,
      nutrition_notes: nutritionNotes,
      shopping_items: shoppingItems,
      fallback_used: mealGeneration.fallback_used,
      fallback_reason: mealGeneration.fallback_reason,
    };
  }

  async createFullRecommendation(
    userId: string,
    goalId: string,
    weekStartDate = this.nextMonday(),
  ) {
    const body_analysis = await this.analysis.analyzeBody(userId, goalId);
    const workout_plan = await this.createWorkoutPlan(
      userId,
      goalId,
      weekStartDate,
    );
    const meal_plan = await this.createMealPlan(userId, goalId);
    const rag_evidence = await this.rag.search({
      query: "크로스핏 운동 강도 단백질 섭취 감량 증량 기준",
      top_k: 5,
    });
    return { body_analysis, workout_plan, meal_plan, rag_evidence };
  }

  async getEvidence(recommendationId: string) {
    const result = await this.db.query(
      `select re.*, rd.source, rd.title, rd.source_url, rd.chunk_text
       from public.recommendation_evidence re
       join public.rag_documents rd on rd.id = re.rag_document_id
       where re.workout_plan_id = $1 or re.meal_plan_id = $1
       order by re.relevance_score desc nulls last, re.created_at desc`,
      [recommendationId],
    );
    return result.rows;
  }

  private async buildWorkoutDays(
    frequency: number,
    level: string,
    goal: WorkoutGoalContext,
    injuries?: string | null,
    medicalNotes?: string | null,
    evidence: Awaited<ReturnType<RagService["search"]>> = [],
  ): Promise<GenerationResult<WorkoutDay[]>> {
    const generated = await this.generateWorkoutDaysFromEvidence(
      frequency,
      level,
      goal,
      injuries,
      medicalNotes,
      evidence,
    );
    if (!generated.fallback_used) return generated;

    this.logger.warn(
      `Using workout fallback: reason=${generated.fallback_reason ?? "unknown"}`,
    );
    return {
      value: this.buildFallbackWorkoutDays(
        frequency,
        level,
        goal,
        injuries,
        medicalNotes,
        evidence,
      ),
      fallback_used: true,
      fallback_reason: generated.fallback_reason,
    };
  }

  private buildFallbackWorkoutDays(
    frequency: number,
    level: string,
    goal: WorkoutGoalContext,
    injuries?: string | null,
    medicalNotes?: string | null,
    evidence: Awaited<ReturnType<RagService["search"]>> = [],
  ): WorkoutDay[] {
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const movementLimit = this.detectMovementLimit(injuries, medicalNotes);
    const workoutTemplates = [
      {
        warmup: ["로잉 5분", "고관절 열기", "에어스쿼트 2세트"],
        beginnerSkill: ["스쿼트 기본 자세", "브레이싱 연습"],
        skill: ["프론트 스쿼트 랙 포지션", "월볼 타깃 연습"],
        strength: ["Goblet squat 3x10", "Tempo squat 3x6"],
        beginnerWod: "AMRAP 10분: air squat 10, ring row 8, bike 200m",
        advancedWod: "AMRAP 16분: wall ball 15, pull-up 10, row 250m",
        cooldown: ["하체 스트레칭 5분", "호흡 정리 2분"],
      },
      {
        warmup: ["바이크 5분", "밴드 풀어파트 20회", "스캡 푸시업 10회"],
        beginnerSkill: ["푸시업 스케일링", "링로우 자세"],
        skill: ["풀업 스케일 조정", "푸시프레스 딥드라이브"],
        strength: ["Strict press 4x6", "Ring row 4x8"],
        beginnerWod: "EMOM 12분: incline push-up 8, ring row 8, step-up 10",
        advancedWod: "For time 4R: push press 12, toes-to-bar 10, bike 12cal",
        cooldown: ["광배근 스트레칭", "흉추 회전 6회씩"],
      },
      {
        warmup: ["가벼운 조깅 또는 걷기 6분", "발목 가동성", "런지 워크"],
        beginnerSkill: ["힌지 패턴 연습", "케틀벨 데드리프트"],
        skill: ["데드리프트 셋업", "케틀벨 스윙 힙드라이브"],
        strength: ["Romanian deadlift 3x8", "Farmer carry 3x30m"],
        beginnerWod: "3R: kettlebell deadlift 12, sit-up 10, row 200m",
        advancedWod: "AMRAP 14분: kettlebell swing 15, burpee 10, run 200m",
        cooldown: ["햄스트링 스트레칭", "둔근 스트레칭"],
      },
      {
        warmup: ["스키에르그 또는 로잉 5분", "어깨 CARs", "빈 바 복합동작"],
        beginnerSkill: ["메디신볼 클린", "가벼운 프론트 랙 연습"],
        skill: ["파워클린 동작 분해", "더블언더 또는 싱글언더 리듬"],
        strength: ["Power clean technique 6x3", "Front squat 3x5"],
        beginnerWod: "AMRAP 9분: medball clean 8, single-under 30, plank 20초",
        advancedWod: "EMOM 15분: power clean 3, double-under 40, plank hold",
        cooldown: ["손목/전완 스트레칭", "복식호흡 2분"],
      },
      {
        warmup: ["바이크 6분", "동적 햄스트링", "점프 없는 풋워크"],
        beginnerSkill: ["박스 스텝업", "페이스 조절 연습"],
        skill: ["박스 점프 착지", "로잉 페이스 전략"],
        strength: ["Step-up 3x10 each", "Single-leg RDL 3x8 each"],
        beginnerWod: "Intervals 5R: bike 90초, step-up 10, rest 60초",
        advancedWod: "5R: box jump 15, row 300m, dumbbell snatch 12",
        cooldown: ["종아리 스트레칭", "고관절 스트레칭"],
      },
      {
        warmup: ["걷기 또는 로잉 5분", "전신 동적 스트레칭"],
        beginnerSkill: ["호흡과 코어 안정화", "가벼운 터키시 겟업 패턴"],
        skill: ["저강도 기술 복습", "약점 동작 스케일링"],
        strength: ["Core circuit 3 rounds", "Light carry 3x40m"],
        beginnerWod: "회복 WOD 12분: easy bike, dead bug, band pull-apart",
        advancedWod: "Zone 2 20분 + mobility flow",
        cooldown: ["전신 스트레칭 8분", "호흡 정리 3분"],
      },
    ];
    const limitedLowerBodyTemplates = [
      {
        warmup: [
          "상체 에르고미터 또는 가벼운 로잉 팔 당김 5분",
          "목/흉추 가동성",
          "밴드 풀어파트 20회",
        ],
        beginnerSkill: ["인클라인 푸시업 자세", "링로우 견갑 조절"],
        skill: ["엄격한 링로우", "푸시업 스케일링"],
        strength: ["Seated dumbbell press 4x8", "Ring row 4x10"],
        beginnerWod: "EMOM 12분: seated DB press 8, ring row 8, dead bug 10",
        advancedWod:
          "AMRAP 14분: strict pull-up 5, seated DB press 10, hollow hold 20초",
        cooldown: ["가슴/광배 스트레칭", "복식호흡 3분"],
      },
      {
        warmup: ["어깨 CARs", "밴드 외회전 15회씩", "스캡 푸시업 10회"],
        beginnerSkill: ["코어 브레이싱", "데드버그 패턴"],
        skill: ["플랭크 포지션", "엄격한 프레스 궤도"],
        strength: [
          "Floor press 4x8",
          "Half-kneeling press 대신 seated press 3x10",
        ],
        beginnerWod: "3R: floor press 10, band pull-apart 20, plank 20초",
        advancedWod:
          "5R: floor press 12, strict ring row 10, plank shoulder tap 20",
        cooldown: ["전완/어깨 스트레칭", "흉추 회전"],
      },
      {
        warmup: [
          "상체 중심 동적 스트레칭",
          "가벼운 메디신볼 패스",
          "호흡 정리",
        ],
        beginnerSkill: ["메디신볼 체스트패스", "팔꿈치 위치 연습"],
        skill: ["상체 던지기 패턴", "견갑 안정화"],
        strength: [
          "Seated cable row 또는 band row 4x12",
          "Dumbbell bench 3x10",
        ],
        beginnerWod:
          "AMRAP 10분: seated band row 12, medball chest pass 10, hollow rock 8",
        advancedWod:
          "AMRAP 15분: DB bench 12, strict toes raise 10, band row 20",
        cooldown: ["어깨 후면 스트레칭", "코어 이완 호흡"],
      },
      {
        warmup: [
          "가벼운 팔 자전거 5분",
          "손목/팔꿈치 가동성",
          "밴드 페이스풀 15회",
        ],
        beginnerSkill: ["프레스 잠금 자세", "링로우 난도 조절"],
        skill: ["Strict press", "Scapular pull"],
        strength: ["Strict press 5x5", "Supported row 4x10"],
        beginnerWod: "EMOM 10분: strict press 6, supported row 8",
        advancedWod:
          "EMOM 16분: strict press 5, strict pull-up 4, hollow hold 25초",
        cooldown: ["삼두/광배 스트레칭", "목 주변 이완"],
      },
      {
        warmup: [
          "의자 앉은 자세 밴드 풀 20회",
          "가벼운 코어 활성화",
          "어깨 원 그리기",
        ],
        beginnerSkill: ["통증 없는 코어 수축", "상체 지지 자세"],
        skill: ["Pallof press", "Side plank 스케일링"],
        strength: ["Pallof press 3x12 each", "Side plank 3x20초 each"],
        beginnerWod:
          "회복 WOD 12분: pallof press, bird dog 상체 집중, breathing drill",
        advancedWod: "Core circuit 18분: pallof press, side plank, strict row",
        cooldown: ["부상 부위에 통증 없는 범위의 가벼운 이완", "호흡 정리"],
      },
      {
        warmup: [
          "상체 관절 가동성 6분",
          "밴드 로우 20회",
          "가벼운 프레스 10회",
        ],
        beginnerSkill: ["일주일 기술 복습", "운동 중 통증 체크 방법"],
        skill: ["약점 상체 동작 복습", "회복 강도 조절"],
        strength: [
          "Upper-body accessory circuit 3 rounds",
          "Core stability 3 rounds",
        ],
        beginnerWod: "저강도 15분: ring row, incline push-up, dead bug 순환",
        advancedWod: "저강도 20분: strict upper accessory + mobility flow",
        cooldown: ["전신 이완", "통증 기록과 다음 세션 조정"],
      },
    ];
    const activeTemplates = movementLimit.avoidLowerBody
      ? limitedLowerBodyTemplates
      : workoutTemplates;
    const evidenceTitles = evidence.map((doc) => doc.title).slice(0, 2);
    return dayNames.slice(0, frequency).map((day, index) => ({
      day,
      goal_focus: this.buildWorkoutGoalFocus(goal),
      warmup: activeTemplates[index].warmup,
      skill:
        level === "beginner"
          ? activeTemplates[index].beginnerSkill
          : activeTemplates[index].skill,
      strength: this.adjustStrengthForGoal(
        activeTemplates[index].strength,
        goal,
      ),
      wod:
        level === "advanced"
          ? this.adjustWodForGoal(activeTemplates[index].advancedWod, goal)
          : this.adjustWodForGoal(activeTemplates[index].beginnerWod, goal),
      cooldown: activeTemplates[index].cooldown,
      target_minutes: goal.dailyWorkoutMinutes,
      alternatives: [
        ...(injuries ? ["점프 동작은 로잉 또는 바이크로 대체"] : []),
        ...(movementLimit.avoidLowerBody
          ? [
              "햄스트링/하체 제한으로 스쿼트, 런지, 점프, 달리기, 데드리프트, 케틀벨 스윙은 제외",
              "하체 통증이 있으면 해당 세션은 상체/코어 재활성 루틴으로만 진행",
            ]
          : []),
        ...(evidenceTitles.length
          ? [
              `근거 문서(${evidenceTitles.join(", ")})에 맞춰 강도와 동작을 스케일링`,
            ]
          : ["RAG 근거가 부족하면 낮은 강도부터 시작"]),
      ],
    }));
  }

  private async generateWorkoutDaysFromEvidence(
    frequency: number,
    level: string,
    goal: WorkoutGoalContext,
    injuries?: string | null,
    medicalNotes?: string | null,
    evidence: RagSearchResult[] = [],
  ): Promise<GenerationAttempt<WorkoutDay[]>> {
    if (!this.llm) return this.fallback("llm_not_configured");
    if (evidence.length === 0) return this.fallback("evidence_insufficient");

    const response =
      await this.generateStructuredJson<GeneratedWorkoutResponse>(
        generatedWorkoutResponseSchema,
        this.buildWorkoutSystemPrompt(),
        this.buildWorkoutUserPrompt(
          frequency,
          level,
          goal,
          injuries,
          medicalNotes,
          evidence,
        ),
        "workout_plan",
      );
    if (!response.value) return this.fallback(response.reason);

    if (response.value.days.length !== frequency) {
      this.logger.warn(
        `Workout schema validation failed: expected ${frequency} days, got ${response.value.days.length}`,
      );
      return this.fallback("schema_validation_failed");
    }

    const postValidation = this.validateWorkoutPostParsing(
      response.value.days,
      frequency,
    );
    if (!postValidation.valid) {
      this.logger.warn(
        `Workout post validation failed: ${postValidation.reason}`,
      );
      return this.fallback("schema_validation_failed");
    }

    const evidenceCheck = this.validateWorkoutEvidenceUsage(
      response.value.days,
      evidence,
    );
    if (!evidenceCheck.valid) {
      this.logger.warn(
        `Workout evidence validation failed: ${evidenceCheck.reason}`,
      );
      return this.fallback("schema_validation_failed");
    }

    const safetyCheck = this.validateWorkoutSafety(
      response.value.days,
      injuries,
      medicalNotes,
    );
    if (!safetyCheck.valid) {
      this.logger.warn(
        `Workout safety validation failed: ${safetyCheck.reason}`,
      );
      return this.fallback("safety_validation_failed");
    }

    return {
      value: response.value.days,
      fallback_used: false,
      fallback_reason: null,
    };
  }

  private async generateMealsFromEvidence(
    goalType: string,
    dailyCalories: number,
    proteinG: number,
    carbsG: number,
    fatG: number,
    restrictions?: string | null,
    allergies?: string | null,
    foodPreferences?: string | null,
    medicalNotes?: string | null,
    evidence: RagSearchResult[] = [],
  ): Promise<GenerationAttempt<Meal[]>> {
    if (!this.llm) return this.fallback("llm_not_configured");
    if (evidence.length === 0) return this.fallback("evidence_insufficient");

    const response = await this.generateStructuredJson<GeneratedMealResponse>(
      generatedMealResponseSchema,
      this.buildMealSystemPrompt(),
      this.buildMealUserPrompt(
        goalType,
        dailyCalories,
        proteinG,
        carbsG,
        fatG,
        restrictions,
        allergies,
        foodPreferences,
        medicalNotes,
        evidence,
      ),
      "meal_plan",
    );
    if (!response.value) return this.fallback(response.reason);

    const meals = response.value.meals;
    const postValidation = this.validateMealPostParsing(meals);
    if (!postValidation.valid) {
      this.logger.warn(`Meal post validation failed: ${postValidation.reason}`);
      return this.fallback("schema_validation_failed");
    }

    const evidenceCheck = this.validateMealEvidenceUsage(meals, evidence);
    if (!evidenceCheck.valid) {
      this.logger.warn(
        `Meal evidence validation failed: ${evidenceCheck.reason}`,
      );
      return this.fallback("schema_validation_failed");
    }

    return {
      value: meals,
      fallback_used: false,
      fallback_reason: null,
    };
  }

  private buildWorkoutSystemPrompt() {
    return [
      "당신은 FitRAG Coach의 운동 추천 생성기입니다.",
      "반드시 evidence의 chunk_text를 근거로 사용하고, 검색 근거에 없는 내용을 확정적 사실처럼 말하지 마세요.",
      "초보자는 고난도 역도/체조 동작을 피합니다.",
      "부상 정보가 있으면 통증 없는 범위의 대체 동작을 우선합니다.",
      "하루 운동 시간이 짧으면 WOD보다 warmup, skill, strength 우선순위를 명확히 조정합니다.",
      "의료 진단이나 치료 표현은 금지합니다.",
      "각 workout day의 alternatives에는 반영한 evidence title을 최소 1개 포함합니다.",
      "반드시 JSON만 반환합니다.",
    ].join(" ");
  }

  private buildWorkoutUserPrompt(
    frequency: number,
    level: string,
    goal: WorkoutGoalContext,
    injuries: string | null | undefined,
    medicalNotes: string | null | undefined,
    evidence: RagSearchResult[],
  ) {
    return JSON.stringify(
      {
        output_schema: {
          days: [
            {
              day: "Monday",
              goal_focus: "string",
              warmup: ["string"],
              skill: ["string"],
              strength: ["string"],
              wod: "string",
              cooldown: ["string"],
              target_minutes: 60,
              alternatives: ["Evidence: {title} 반영 - string"],
            },
          ],
        },
        constraints: {
          number_of_days: frequency,
          allowed_days: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          experience_level: level,
          target_minutes: goal.dailyWorkoutMinutes,
          required_sections: [
            "warmup",
            "skill",
            "strength",
            "wod",
            "cooldown",
            "alternatives",
          ],
          lower_body_limit_mode: this.detectMovementLimit(
            injuries,
            medicalNotes,
          ).avoidLowerBody,
          forbidden_when_lower_body_limited: this.forbiddenLowerBodyMovements(),
        },
        user_context: {
          goal,
          injuries,
          medical_notes: medicalNotes,
        },
        evidence: this.formatEvidenceForPrompt(evidence),
      },
      null,
      2,
    );
  }

  private buildMealSystemPrompt() {
    return [
      "당신은 FitRAG Coach의 영양 추천 생성기입니다.",
      "반드시 evidence의 chunk_text를 근거로 사용하고, 검색 근거에 없는 내용을 확정적 사실처럼 말하지 마세요.",
      "알레르기 식품은 절대 포함하지 않습니다.",
      "식단 제한과 선호/비선호 음식을 반영합니다.",
      "목표 칼로리와 단백질/탄수화물/지방 목표를 참고합니다.",
      "한국에서 일반적으로 구매 가능한 식재료 중심으로 구성합니다.",
      "의료 진단이나 치료 표현은 금지합니다.",
      "각 meal notes에는 관련 evidence title을 최소 1개 포함합니다.",
      "반드시 JSON만 반환합니다.",
    ].join(" ");
  }

  private buildMealUserPrompt(
    goalType: string,
    dailyCalories: number,
    proteinG: number,
    carbsG: number,
    fatG: number,
    restrictions: string | null | undefined,
    allergies: string | null | undefined,
    foodPreferences: string | null | undefined,
    medicalNotes: string | null | undefined,
    evidence: RagSearchResult[],
  ) {
    return JSON.stringify(
      {
        output_schema: {
          meals: [
            {
              type: "breakfast | lunch | dinner | snack",
              menu: "string",
              notes: "Evidence: {title} 반영 - string",
            },
          ],
        },
        nutrition_targets: {
          goal_type: goalType,
          daily_calories: dailyCalories,
          protein_g: proteinG,
          carbs_g: carbsG,
          fat_g: fatG,
        },
        user_context: {
          dietary_restrictions: restrictions,
          allergies,
          food_preferences: foodPreferences,
          medical_notes: medicalNotes,
        },
        constraints: {
          required_meal_types: ["breakfast", "lunch", "dinner", "snack"],
          use_common_korean_grocery_items: true,
        },
        evidence: this.formatEvidenceForPrompt(evidence),
      },
      null,
      2,
    );
  }

  private validateWorkoutEvidenceUsage(
    days: WorkoutDay[],
    evidence: RagSearchResult[],
  ) {
    if (evidence.length === 0)
      return { valid: false, reason: "evidence is empty" };

    const invalidDay = days.find(
      (day) =>
        !this.containsEvidenceTitle(day.alternatives.join(" "), evidence),
    );
    if (invalidDay) {
      return {
        valid: false,
        reason: `${invalidDay.day} alternatives do not reference an evidence title`,
      };
    }

    return { valid: true, reason: null };
  }

  private validateMealEvidenceUsage(
    meals: Meal[],
    evidence: RagSearchResult[],
  ) {
    if (evidence.length === 0)
      return { valid: false, reason: "evidence is empty" };

    const invalidMeal = meals.find(
      (meal) => !this.containsEvidenceTitle(meal.notes, evidence),
    );
    if (invalidMeal) {
      return {
        valid: false,
        reason: `${invalidMeal.type} notes do not reference an evidence title`,
      };
    }

    return { valid: true, reason: null };
  }

  private validateWorkoutPostParsing(days: WorkoutDay[], frequency: number) {
    if (days.length !== frequency) {
      return {
        valid: false,
        reason: `expected ${frequency} days, got ${days.length}`,
      };
    }

    for (const day of days) {
      if (!this.isNonEmptyString(day.day)) {
        return { valid: false, reason: "day must be a non-empty string" };
      }
      if (!this.isNonEmptyString(day.goal_focus)) {
        return {
          valid: false,
          reason: "goal_focus must be a non-empty string",
        };
      }
      if (!this.isNonEmptyString(day.wod)) {
        return { valid: false, reason: "wod must be a non-empty string" };
      }
      if (!Array.isArray(day.warmup) || day.warmup.length === 0) {
        return { valid: false, reason: "warmup must be a non-empty array" };
      }
      if (!Array.isArray(day.skill) || day.skill.length === 0) {
        return { valid: false, reason: "skill must be a non-empty array" };
      }
      if (!Array.isArray(day.strength) || day.strength.length === 0) {
        return { valid: false, reason: "strength must be a non-empty array" };
      }
      if (!Array.isArray(day.cooldown) || day.cooldown.length === 0) {
        return { valid: false, reason: "cooldown must be a non-empty array" };
      }
      if (!Array.isArray(day.alternatives) || day.alternatives.length === 0) {
        return {
          valid: false,
          reason: "alternatives must be a non-empty array",
        };
      }
      if (!Number.isInteger(day.target_minutes) || day.target_minutes < 1) {
        return {
          valid: false,
          reason:
            "target_minutes must be an integer greater than or equal to 1",
        };
      }

      const arraysToCheck = [
        { name: "warmup", value: day.warmup },
        { name: "skill", value: day.skill },
        { name: "strength", value: day.strength },
        { name: "cooldown", value: day.cooldown },
        { name: "alternatives", value: day.alternatives },
      ];

      for (const item of arraysToCheck) {
        for (const element of item.value) {
          if (!this.isNonEmptyString(element)) {
            return {
              valid: false,
              reason: `${item.name} must not contain empty strings`,
            };
          }
        }
      }
    }

    return { valid: true, reason: null };
  }

  private validateMealPostParsing(meals: Meal[]) {
    const requiredTypes = ["breakfast", "lunch", "dinner", "snack"];
    for (const type of requiredTypes) {
      if (!meals.some((meal) => meal.type === type)) {
        return { valid: false, reason: `missing ${type}` };
      }
    }

    for (const meal of meals) {
      if (!requiredTypes.includes(meal.type)) {
        return {
          valid: false,
          reason: `invalid meal type ${meal.type}`,
        };
      }
      if (!this.isNonEmptyString(meal.menu)) {
        return {
          valid: false,
          reason: `${meal.type} menu must be a non-empty string`,
        };
      }
      if (!this.isNonEmptyString(meal.notes)) {
        return {
          valid: false,
          reason: `${meal.type} notes must be a non-empty string`,
        };
      }
    }

    return { valid: true, reason: null };
  }

  private isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private validateWorkoutSafety(
    days: WorkoutDay[],
    injuries?: string | null,
    medicalNotes?: string | null,
  ) {
    const movementLimit = this.detectMovementLimit(injuries, medicalNotes);
    if (!movementLimit.avoidLowerBody) return { valid: true, reason: null };

    const forbiddenPattern = this.forbiddenLowerBodyMovementPattern();
    const unsafeDay = days.find((day) =>
      forbiddenPattern.test(this.workoutDayText(day)),
    );
    if (!unsafeDay) return { valid: true, reason: null };

    return {
      valid: false,
      reason: `${unsafeDay.day} includes lower-body restricted movement`,
    };
  }

  private workoutDayText(day: WorkoutDay) {
    return [
      day.goal_focus,
      ...day.warmup,
      ...day.skill,
      ...day.strength,
      day.wod,
      ...day.cooldown,
      ...day.alternatives,
    ]
      .join(" ")
      .toLowerCase();
  }

  private containsEvidenceTitle(text: string, evidence: RagSearchResult[]) {
    const normalized = text.toLowerCase();
    return evidence.some((doc) => normalized.includes(doc.title.toLowerCase()));
  }

  private async generateStructuredJson<T>(
    schema: z.ZodType<T>,
    system: string,
    user: string,
    name: string,
  ): Promise<{ value: T | null; reason: FallbackReason }> {
    if (!this.llm) return { value: null, reason: "llm_not_configured" };

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    try {
      await this.waitForLlmRateLimit();
      const structured = this.llm.withStructuredOutput(schema, {
        name,
      }) as StructuredInvoker<T>;
      const parsed = await structured.invoke(messages);
      const validation = schema.safeParse(parsed);
      if (validation.success) {
        return { value: validation.data, reason: "llm_generation_failed" };
      }

      this.logger.warn(
        `${name} structured output schema validation failed: ${validation.error.message}`,
      );
    } catch (error) {
      this.logger.warn(
        `${name} structured output failed: ${this.errorMessage(error)}`,
      );
    }

    return this.generateJsonWithParserFallback(schema, messages, name);
  }

  private async generateJsonWithParserFallback<T>(
    schema: z.ZodType<T>,
    messages: Array<{ role: "system" | "user"; content: string }>,
    name: string,
    attempt = 0,
  ): Promise<{ value: T | null; reason: FallbackReason }> {
    if (!this.llm) return { value: null, reason: "llm_not_configured" };
    if (attempt >= 3) {
      this.logger.warn(
        `${name} parser fallback reached max retry attempts (${attempt}), giving up.`,
      );
      return { value: null, reason: "llm_generation_failed" };
    }

    try {
      await this.waitForLlmRateLimit();
      const response = await this.llm.invoke(messages);
      const text = this.messageContentToText(response.content);
      const jsonText = this.extractJsonObject(text);
      if (!jsonText) {
        this.logger.warn(
          `${name} parser fallback failed: JSON object not found`,
        );
        return { value: null, reason: "llm_generation_failed" };
      }

      const parsed: unknown = JSON.parse(jsonText);
      const validation = schema.safeParse(parsed);
      if (validation.success)
        return { value: validation.data, reason: "llm_generation_failed" };

      this.logger.warn(
        `${name} parser fallback schema validation failed: ${validation.error.message}`,
      );
      return { value: null, reason: "schema_validation_failed" };
    } catch (error) {
      const errorMsg = this.errorMessage(error);
      this.logger.warn(`${name} parser fallback failed: ${errorMsg}`);

      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        const retryMatch =
          errorMsg.match(/Retry after (\d+\.?\d*)s/i) ||
          errorMsg.match(/Please retry in (\d+\.?\d*)s/i);
        const delaySeconds = retryMatch ? Number(retryMatch[1]) : 5;
        this.logger.warn(
          `${name} parser fallback encountered quota limit, retrying after ${delaySeconds}s.`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delaySeconds * 1000),
        );
        return this.generateJsonWithParserFallback(
          schema,
          messages,
          name,
          attempt + 1,
        );
      }

      return { value: null, reason: "llm_generation_failed" };
    }
  }

  private messageContentToText(content: unknown) {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return "";

    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          part.type === "text" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("");
  }

  private extractJsonObject(text: string) {
    const trimmed = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return trimmed.slice(start, end + 1);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private formatEvidenceForPrompt(evidence: RagSearchResult[]) {
    return evidence.slice(0, 5).map((doc, index) => ({
      index: index + 1,
      source: doc.source,
      title: doc.title,
      source_url: doc.source_url,
      relevance_score: doc.relevance_score,
      chunk_text: doc.chunk_text.slice(0, 1800),
    }));
  }

  private fallback<T>(reason: FallbackReason): GenerationAttempt<T> {
    return {
      value: null,
      fallback_used: true,
      fallback_reason: reason,
    };
  }

  private buildCautions(
    injuries?: string | null,
    medicalNotes?: string | null,
    goal?: WorkoutGoalContext,
    level?: string,
    evidence: Awaited<ReturnType<RagService["search"]>> = [],
  ) {
    const movementLimit = this.detectMovementLimit(injuries, medicalNotes);
    const cautions = ["통증이 있으면 즉시 강도를 낮추고 휴식하세요."];
    if (injuries)
      cautions.push(
        `${injuries} 이력이 있으므로 점프/고중량 동작은 보수적으로 진행하세요.`,
      );
    if (medicalNotes) cautions.push(`주의사항: ${medicalNotes}`);
    if (movementLimit.avoidLowerBody) {
      cautions.push(
        "하체 운동 불가 조건을 반영해 하체 부하 동작은 제외하고 상체/코어 중심으로 구성했습니다.",
      );
      cautions.push(
        "햄스트링 부상은 회복 단계 확인이 필요하므로 통증 없는 범위에서만 진행하고 전문가 상담을 권장합니다.",
      );
    }
    if (level === "beginner")
      cautions.push("초보자는 기록보다 자세와 회복을 우선합니다.");
    if (goal) {
      cautions.push(...this.buildGoalCautions(goal));
    }
    if (evidence.length) {
      cautions.push(`RAG 근거: ${evidence.map((doc) => doc.title).join(", ")}`);
    } else {
      cautions.push("RAG 근거가 부족하므로 확정적인 강도 처방은 피합니다.");
    }
    return cautions;
  }

  private detectMovementLimit(
    injuries?: string | null,
    medicalNotes?: string | null,
  ) {
    const text = `${injuries ?? ""} ${medicalNotes ?? ""}`.toLowerCase();
    const hasHamstringIssue = /햄스트링|hamstring/.test(text);
    const hasLowerBodyLimit =
      /하체.*(불가|금지|제한|통증)|lower body.*(avoid|limit|pain)/.test(text);
    return {
      avoidLowerBody: hasHamstringIssue || hasLowerBodyLimit,
    };
  }

  private forbiddenLowerBodyMovements() {
    return [
      "squat",
      "lunge",
      "jump",
      "run",
      "deadlift",
      "kettlebell swing",
      "box jump",
      "wall ball",
      "front squat",
      "back squat",
      "스쿼트",
      "런지",
      "점프",
      "달리기",
      "데드리프트",
      "케틀벨 스윙",
      "박스 점프",
      "월볼",
      "프론트 스쿼트",
      "백 스쿼트",
    ];
  }

  private forbiddenLowerBodyMovementPattern() {
    return /\b(front squat|back squat|box jump|wall ball|kettlebell swing|deadlift|squat|lunge|jump|run)\b|스쿼트|런지|점프|달리기|데드리프트|케틀벨\s*스윙|박스\s*점프|월볼|프론트\s*스쿼트|백\s*스쿼트/i;
  }

  private buildWorkoutGoalContext(
    goal: {
      goal_type: string;
      target_weight_kg: string | number | null;
      target_muscle_mass_kg: string | number | null;
      target_fat_mass_kg: string | number | null;
      target_body_fat_percentage?: string | number | null;
      target_date: string | null;
      weekly_workout_days: number | null;
      daily_workout_minutes: number | null;
      experience_level: string;
    },
    frequency: number,
  ): WorkoutGoalContext {
    return {
      goalType: goal.goal_type,
      targetWeightKg: this.toNullableNumber(goal.target_weight_kg),
      targetMuscleMassKg: this.toNullableNumber(goal.target_muscle_mass_kg),
      targetFatMassKg: this.toNullableNumber(goal.target_fat_mass_kg),
      targetBodyFatPercentage: this.toNullableNumber(
        goal.target_body_fat_percentage ?? null,
      ),
      targetDate: goal.target_date,
      weeklyWorkoutDays: frequency,
      dailyWorkoutMinutes: goal.daily_workout_minutes ?? 60,
      experienceLevel: goal.experience_level,
    };
  }

  private buildWorkoutGoalFocus(goal: WorkoutGoalContext) {
    const parts = [];
    if (goal.goalType === "muscle_gain") parts.push("근력 보강과 근육 증가");
    if (goal.goalType === "fat_loss")
      parts.push("체지방 감소와 회복 가능한 대사 컨디셔닝");
    if (goal.goalType === "weight_gain")
      parts.push("무리한 유산소보다 근력 기반 증량");
    if (goal.goalType === "body_recomposition")
      parts.push("근력 유지와 체지방 관리 균형");
    if (goal.goalType === "performance") parts.push("기술 숙련과 운동 수행력");
    if (goal.targetMuscleMassKg)
      parts.push(`목표 근육량 ${goal.targetMuscleMassKg}kg`);
    if (goal.targetFatMassKg)
      parts.push(`목표 체지방량 ${goal.targetFatMassKg}kg`);
    if (goal.targetBodyFatPercentage) {
      parts.push(`목표 체지방률 ${goal.targetBodyFatPercentage}%`);
    }
    return parts.join(" / ") || "기초 체력과 안전한 습관 형성";
  }

  private adjustWodForGoal(wod: string, goal: WorkoutGoalContext) {
    const scale = this.getWorkoutTimeScale(goal.dailyWorkoutMinutes);
    const scaledWod = this.scaleWorkoutPrescription(wod, scale);
    const timeCap = Math.max(6, Math.min(Math.round(16 * scale), 20));
    const suffix =
      goal.goalType === "muscle_gain" || goal.goalType === "weight_gain"
        ? ` / 목표 반영: WOD는 ${timeCap}분 이내로 제한하고 근력 세트 품질 우선`
        : goal.goalType === "fat_loss" || goal.goalType === "body_recomposition"
          ? ` / 목표 반영: ${timeCap}분 내 지속 가능한 페이스 유지`
          : ` / 목표 반영: ${timeCap}분 내 기술 정확도와 페이스 기록`;
    return `${scaledWod}${suffix}`;
  }

  private adjustStrengthForGoal(strength: string[], goal: WorkoutGoalContext) {
    const scale = this.getWorkoutTimeScale(goal.dailyWorkoutMinutes);
    return strength.map((item) => this.scaleWorkoutPrescription(item, scale));
  }

  private getWorkoutTimeScale(minutes: number) {
    if (minutes <= 30) return 0.5;
    if (minutes <= 45) return 0.75;
    if (minutes <= 60) return 1;
    return 1.15;
  }

  private scaleWorkoutPrescription(text: string, scale: number) {
    return text
      .replace(/AMRAP\s+(\d+)분/gi, (_, value: string) => {
        const minutes = this.scaleNumber(Number(value), scale, 6);
        return `AMRAP ${minutes}분`;
      })
      .replace(/EMOM\s+(\d+)분/gi, (_, value: string) => {
        const minutes = this.scaleNumber(Number(value), scale, 6);
        return `EMOM ${minutes}분`;
      })
      .replace(/Intervals\s+(\d+)R/gi, (_, value: string) => {
        const rounds = this.scaleNumber(Number(value), scale, 3);
        return `Intervals ${rounds}R`;
      })
      .replace(/(\d+)R:/g, (_, value: string) => {
        const rounds = this.scaleNumber(Number(value), scale, 2);
        return `${rounds}R:`;
      })
      .replace(/(\d+)x(\d+)/g, (_, sets: string, reps: string) => {
        const scaledSets = this.scaleNumber(Number(sets), scale, 2);
        const scaledReps = this.scaleNumber(Number(reps), scale, 5);
        return `${scaledSets}x${scaledReps}`;
      })
      .replace(/(\d+)m\b/g, (_, value: string) => {
        const distance = this.floorToStep(Number(value) * scale, 50, 100);
        return `${distance}m`;
      })
      .replace(/(\d+)cal\b/g, (_, value: string) => {
        const calories = this.scaleNumber(Number(value), scale, 6);
        return `${calories}cal`;
      })
      .replace(/(\d+)초/g, (_, value: string) => {
        const seconds = this.scaleNumber(Number(value), scale, 10);
        return `${seconds}초`;
      })
      .replace(/(?<!x)(?<!\d)(\d+)(?=,|\s|$)/g, (match, value: string) => {
        const numeric = Number(value);
        if (numeric > 60) return match;
        return String(this.roundToStep(numeric * scale, 5, 5));
      });
  }

  private scaleNumber(value: number, scale: number, minimum: number) {
    return Math.max(minimum, Math.round(value * scale));
  }

  private roundToStep(value: number, step: number, minimum: number) {
    return Math.max(minimum, Math.round(value / step) * step);
  }

  private floorToStep(value: number, step: number, minimum: number) {
    return Math.max(minimum, Math.floor(value / step) * step);
  }

  private buildGoalCautions(goal: WorkoutGoalContext) {
    const cautions: string[] = [];
    if (goal.targetDate) {
      cautions.push(
        `목표 기간(${goal.targetDate})을 기준으로 주간 운동량을 급격히 늘리지 않습니다.`,
      );
    }
    if (goal.dailyWorkoutMinutes < 45) {
      cautions.push(
        "하루 운동 가능 시간이 짧으므로 기술 연습과 WOD 시간을 압축해 진행합니다.",
      );
    }
    if (goal.weeklyWorkoutDays >= 6) {
      cautions.push(
        "주 6회 이상 계획은 최소 1회 저강도 회복 세션으로 배치합니다.",
      );
    }
    if (goal.goalType === "muscle_gain" || goal.goalType === "weight_gain") {
      cautions.push(
        "증량/근육 증가 목표는 과도한 장시간 WOD보다 근력 훈련 품질과 회복을 우선합니다.",
      );
    }
    if (
      goal.goalType === "fat_loss" ||
      goal.goalType === "body_recomposition"
    ) {
      cautions.push(
        "감량/체형 재구성 목표는 매일 고강도보다 지속 가능한 빈도와 식단 병행을 우선합니다.",
      );
    }
    return cautions;
  }

  private toNullableNumber(value: string | number | null | undefined) {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private goalIntensity(goalType: string) {
    if (goalType === "performance") return "moderate_to_high";
    if (goalType === "muscle_gain") return "strength_focused";
    return "low_to_moderate";
  }

  private estimateCalories(profile: Record<string, unknown>, goalType: string) {
    const weight = Number(profile.weight_kg);
    const height = Number(profile.height_cm);
    const age = Number(profile.age ?? 30);
    const genderOffset = profile.gender === "female" ? -161 : 5;
    const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
    const maintenance = bmr * 1.45;
    const adjustment =
      goalType === "weight_gain" || goalType === "muscle_gain"
        ? 250
        : goalType === "fat_loss"
          ? -350
          : 0;
    return Math.max(1300, Math.round((maintenance + adjustment) / 50) * 50);
  }

  private async buildMeals(
    goalType: string,
    dailyCalories: number,
    proteinG: number,
    carbsG: number,
    fatG: number,
    restrictions?: string | null,
    allergies?: string | null,
    foodPreferences?: string | null,
    medicalNotes?: string | null,
    evidence: Awaited<ReturnType<RagService["search"]>> = [],
  ): Promise<GenerationResult<Meal[]>> {
    const generated = await this.generateMealsFromEvidence(
      goalType,
      dailyCalories,
      proteinG,
      carbsG,
      fatG,
      restrictions,
      allergies,
      foodPreferences,
      medicalNotes,
      evidence,
    );
    if (!generated.fallback_used) return generated;

    this.logger.warn(
      `Using meal fallback: reason=${generated.fallback_reason ?? "unknown"}`,
    );
    return {
      value: this.buildFallbackMeals(
        goalType,
        restrictions,
        allergies,
        foodPreferences,
        medicalNotes,
        evidence,
      ),
      fallback_used: true,
      fallback_reason: generated.fallback_reason,
    };
  }

  private buildFallbackMeals(
    goalType: string,
    restrictions?: string | null,
    allergies?: string | null,
    foodPreferences?: string | null,
    medicalNotes?: string | null,
    evidence: Awaited<ReturnType<RagService["search"]>> = [],
  ): Meal[] {
    const avoidEggs =
      allergies?.includes("달걀") || allergies?.includes("계란");
    const avoidDairy = allergies?.includes("유제품");
    const avoidSeafood =
      allergies?.includes("해산물") ||
      foodPreferences?.includes("해산물 비선호");
    const prefersChicken = foodPreferences?.includes("닭가슴살 선호");
    const protein = restrictions?.includes("채식")
      ? "두부"
      : avoidEggs
        ? "닭가슴살"
        : prefersChicken
          ? "닭가슴살"
          : "닭가슴살 또는 계란";
    const dinnerProtein = avoidSeafood ? protein : `연어 또는 ${protein}`;
    const breakfastProtein = avoidDairy
      ? "무가당 두유, 블루베리, 오트밀"
      : "그릭요거트, 블루베리, 오트밀";
    const lowSodium =
      restrictions?.includes("저염") || medicalNotes?.includes("혈압");
    const sugarLimited =
      restrictions?.includes("당 제한") || medicalNotes?.includes("당뇨");
    const extraCarb =
      goalType === "muscle_gain" || goalType === "weight_gain"
        ? "고구마 추가"
        : sugarLimited
          ? "채소와 소량 현미밥"
          : "채소 추가";
    const evidenceNote = evidence.length
      ? `RAG 근거(${evidence[0].title}) 반영`
      : "근거 부족 시 일반 원칙으로 보수적 구성";
    const cautionNote = lowSodium
      ? "저염 조건을 반영해 소스와 가공식품을 줄입니다."
      : "가공식품과 액상 칼로리 줄이기";

    return [
      {
        type: "breakfast",
        menu: breakfastProtein,
        notes: `단백질과 탄수화물을 함께 섭취. ${evidenceNote}`,
      },
      {
        type: "lunch",
        menu: `${protein}, 현미밥, 샐러드`,
        notes: `훈련일에는 탄수화물을 너무 낮추지 않기. ${evidenceNote}`,
      },
      {
        type: "dinner",
        menu: `${dinnerProtein}, 구운 채소, ${extraCarb}`,
        notes: `${cautionNote}. ${evidenceNote}`,
      },
      {
        type: "snack",
        menu: avoidEggs
          ? "단백질 보충제 또는 두부 스낵"
          : "단백질 보충제 또는 삶은 계란",
        notes: `운동 후 회복 보조. ${evidenceNote}`,
      },
    ];
  }

  private async createShoppingItems(
    mealPlanId: string,
    meals: Meal[],
    restrictions?: string | null,
    foodPreferences?: string | null,
    medicalNotes?: string | null,
  ) {
    const keywordSuffix = [
      restrictions?.includes("글루텐 제한") ? "글루텐프리" : "",
      restrictions?.includes("저염") || medicalNotes?.includes("혈압")
        ? "저염"
        : "",
      restrictions?.includes("당 제한") || medicalNotes?.includes("당뇨")
        ? "저당"
        : "",
      foodPreferences?.includes("선호") ? "선호 식품" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const names = Array.from(
      new Set(
        meals
          .flatMap((meal) => meal.menu.split(/,|또는/))
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8),
      ),
    );
    const created = [];
    for (const name of names) {
      const keyword = `${name} ${keywordSuffix} 식단`
        .replace(/\s+/g, " ")
        .trim();
      const url = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
      const result = await this.db.query(
        `insert into public.shopping_items (
          meal_plan_id, name, quantity, search_keyword, search_url
        ) values ($1,$2,$3,$4,$5)
        returning name, quantity, search_keyword, search_url, estimated_price`,
        [mealPlanId, name, "1회분", keyword, url],
      );
      created.push(result.rows[0]);
    }
    return created;
  }

  private async attachEvidenceRows(
    workoutPlanId: string | null,
    mealPlanId: string | null,
    evidence: Awaited<ReturnType<RagService["search"]>>,
  ) {
    for (const doc of evidence) {
      if (doc.id === "00000000-0000-0000-0000-000000000000") continue;
      await this.db.query(
        `insert into public.recommendation_evidence (
          workout_plan_id, meal_plan_id, rag_document_id, evidence_type,
          summary, relevance_score
        ) values ($1,$2,$3,$4,$5,$6)
        on conflict do nothing`,
        [
          workoutPlanId,
          mealPlanId,
          doc.id,
          workoutPlanId ? "workout" : "nutrition",
          doc.title,
          this.normalizeRelevanceScore(doc.relevance_score),
        ],
      );
    }
  }

  private normalizeRelevanceScore(score: number | null | undefined) {
    if (score === null || score === undefined || Number.isNaN(score))
      return null;
    return Math.max(0, Math.min(1, score));
  }

  private nextMonday() {
    const date = new Date();
    const diff = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + diff);
    return date.toISOString().slice(0, 10);
  }
}
