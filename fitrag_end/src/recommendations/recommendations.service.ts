import { Injectable } from '@nestjs/common';
import { AnalysisService } from '../analysis/analysis.service';
import { DatabaseService } from '../database/database.service';
import { GoalsService } from '../goals/goals.service';
import { RagService } from '../rag/rag.service';
import { UsersService } from '../users/users.service';

type Meal = {
  type: string;
  menu: string;
  notes: string;
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly goals: GoalsService,
    private readonly users: UsersService,
    private readonly analysis: AnalysisService,
    private readonly rag: RagService,
  ) {}

  async createWorkoutPlan(userId: string, goalId: string, weekStartDate: string) {
    const goal = await this.goals.getOwnedGoal(userId, goalId);
    const profile = await this.users.getProfile(userId);
    const frequency = goal.weekly_workout_days ?? 3;
    const intensityLevel = `${goal.experience_level}_${this.goalIntensity(goal.goal_type)}`;
    const days = this.buildWorkoutDays(frequency, goal.experience_level, profile.injuries);
    const cautionNotes = this.buildCautions(profile.injuries, goal.experience_level);

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
        JSON.stringify({ days }),
        cautionNotes.join('\n'),
      ],
    );

    const workoutPlanId = result.rows[0].id;
    await this.attachEvidence(workoutPlanId, null, '초보자 크로스핏 운동 강도');

    return {
      workout_plan_id: workoutPlanId,
      frequency_per_week: frequency,
      intensity_level: intensityLevel,
      days,
      caution_notes: cautionNotes,
    };
  }

  async createMealPlan(userId: string, goalId: string) {
    const goal = await this.goals.getOwnedGoal(userId, goalId);
    const profile = await this.users.getProfile(userId);
    const currentWeight = Number(profile.weight_kg);
    const dailyCalories = this.estimateCalories(profile, goal.goal_type);
    const proteinG = Math.round(currentWeight * 1.8);
    const fatG = Math.round((dailyCalories * 0.25) / 9);
    const carbsG = Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4);
    const meals = this.buildMeals(goal.goal_type, profile.dietary_restrictions);
    const nutritionNotes = [
      '극단적인 칼로리 제한은 피하세요.',
      '운동 전후에는 단백질과 탄수화물을 함께 섭취하는 편이 좋습니다.',
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
        nutritionNotes.join('\n'),
      ],
    );

    const mealPlanId = mealResult.rows[0].id;
    const shoppingItems = await this.createShoppingItems(mealPlanId, meals);
    await this.attachEvidence(null, mealPlanId, '단백질 섭취량 기준과 감량 식단');

    return {
      meal_plan_id: mealPlanId,
      daily_calories: dailyCalories,
      protein_g: proteinG,
      carbs_g: carbsG,
      fat_g: fatG,
      meals,
      nutrition_notes: nutritionNotes,
      shopping_items: shoppingItems,
    };
  }

  async createFullRecommendation(
    userId: string,
    goalId: string,
    weekStartDate = this.nextMonday(),
  ) {
    const [body_analysis, workout_plan, meal_plan] = await Promise.all([
      this.analysis.analyzeBody(userId, goalId),
      this.createWorkoutPlan(userId, goalId, weekStartDate),
      this.createMealPlan(userId, goalId),
    ]);
    const rag_evidence = await this.rag.search({
      query: '크로스핏 운동 강도 단백질 섭취 감량 증량 기준',
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

  private buildWorkoutDays(frequency: number, level: string, injuries?: string | null) {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames.slice(0, frequency).map((day, index) => ({
      day,
      warmup: ['5분 가벼운 로잉', '동적 스트레칭'],
      skill:
        level === 'beginner'
          ? ['스쿼트 기본 자세', '푸시업 스케일링']
          : ['클린 테크닉', '풀업 스케일 조정'],
      strength:
        index % 2 === 0
          ? ['Goblet squat 3x10']
          : ['Strict press 4x6'],
      wod:
        level === 'advanced'
          ? 'AMRAP 16분: wall ball 15, pull-up 10, row 250m'
          : 'AMRAP 10분: air squat 10, ring row 8, bike 200m',
      cooldown: ['호흡 정리 2분', '하체 스트레칭 5분'],
      alternatives: injuries ? ['점프 동작은 로잉 또는 바이크로 대체'] : [],
    }));
  }

  private buildCautions(injuries?: string | null, level?: string) {
    const cautions = ['통증이 있으면 즉시 강도를 낮추고 휴식하세요.'];
    if (injuries) cautions.push(`${injuries} 이력이 있으므로 점프/고중량 동작은 보수적으로 진행하세요.`);
    if (level === 'beginner') cautions.push('초보자는 기록보다 자세와 회복을 우선합니다.');
    return cautions;
  }

  private goalIntensity(goalType: string) {
    if (goalType === 'performance') return 'moderate_to_high';
    if (goalType === 'muscle_gain') return 'strength_focused';
    return 'low_to_moderate';
  }

  private estimateCalories(profile: Record<string, unknown>, goalType: string) {
    const weight = Number(profile.weight_kg);
    const height = Number(profile.height_cm);
    const age = Number(profile.age ?? 30);
    const genderOffset = profile.gender === 'female' ? -161 : 5;
    const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
    const maintenance = bmr * 1.45;
    const adjustment =
      goalType === 'weight_gain' || goalType === 'muscle_gain'
        ? 250
        : goalType === 'fat_loss'
          ? -350
          : 0;
    return Math.max(1300, Math.round((maintenance + adjustment) / 50) * 50);
  }

  private buildMeals(goalType: string, restrictions?: string | null): Meal[] {
    const protein = restrictions?.includes('채식') ? '두부' : '닭가슴살';
    const extraCarb =
      goalType === 'muscle_gain' || goalType === 'weight_gain'
        ? '고구마 추가'
        : '채소 추가';
    return [
      {
        type: 'breakfast',
        menu: '그릭요거트, 블루베리, 삶은 계란',
        notes: '단백질과 탄수화물을 함께 섭취',
      },
      {
        type: 'lunch',
        menu: `${protein}, 현미밥, 샐러드`,
        notes: '훈련일에는 탄수화물을 너무 낮추지 않기',
      },
      {
        type: 'dinner',
        menu: `연어 또는 ${protein}, 구운 채소, ${extraCarb}`,
        notes: '가공식품과 액상 칼로리 줄이기',
      },
      {
        type: 'snack',
        menu: '단백질 보충제 또는 삶은 계란',
        notes: '운동 후 회복 보조',
      },
    ];
  }

  private async createShoppingItems(mealPlanId: string, meals: Meal[]) {
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
      const keyword = `${name} 식단`;
      const url = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
      const result = await this.db.query(
        `insert into public.shopping_items (
          meal_plan_id, name, quantity, search_keyword, search_url
        ) values ($1,$2,$3,$4,$5)
        returning name, quantity, search_keyword, search_url, estimated_price`,
        [mealPlanId, name, '1회분', keyword, url],
      );
      created.push(result.rows[0]);
    }
    return created;
  }

  private async attachEvidence(
    workoutPlanId: string | null,
    mealPlanId: string | null,
    query: string,
  ) {
    const evidence = await this.rag.search({ query, top_k: 3 });
    for (const doc of evidence) {
      if (doc.id === '00000000-0000-0000-0000-000000000000') continue;
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
          workoutPlanId ? 'workout' : 'nutrition',
          doc.title,
          doc.relevance_score,
        ],
      );
    }
  }

  private nextMonday() {
    const date = new Date();
    const diff = (8 - date.getDay()) % 7 || 7;
    date.setDate(date.getDate() + diff);
    return date.toISOString().slice(0, 10);
  }
}
