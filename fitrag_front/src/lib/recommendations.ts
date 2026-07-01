import type {
  CoachGoal,
  ExperienceLevel,
  GoalType,
  HealthProfile,
} from "@/store/useCoachStore";

export type BodyAnalysis = {
  bmi: number;
  bmiLabel: string;
  weightChangeKg: number;
  recommendedWeeklyChangeKg: string;
  estimatedDurationWeeks: number;
  paceLabel: string;
  riskFlags: string[];
  summary: string;
};

export type NutritionTargets = {
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: Array<{ type: string; menu: string; notes: string }>;
  notes: string[];
};

export type WorkoutDay = {
  day: string;
  title: string;
  goalFocus?: string;
  intensity: string;
  minutes: number;
  warmup: string[];
  skill: string[];
  strength: string[];
  wod: string;
  cooldown: string[];
  alternatives: string[];
};

export type ShoppingItem = {
  name: string;
  quantity: string;
  keyword: string;
  url: string;
};

export type EvidenceItem = {
  source: string;
  title: string;
  summary: string;
  url: string;
};

const dayNames = ["월", "화", "수", "목", "금", "토", "일"];

export function analyzeBody(profile: HealthProfile, goal: CoachGoal): BodyAnalysis {
  const bmi = round(profile.weightKg / (profile.heightCm / 100) ** 2, 1);
  const weightChangeKg = round(goal.targetWeightKg - profile.weightKg, 1);
  const absChange = Math.abs(weightChangeKg);
  const estimatedDurationWeeks = estimateDurationWeeks(goal, absChange);
  const weeklyChange = absChange / Math.max(estimatedDurationWeeks, 1);
  const riskFlags = buildRiskFlags(profile, goal, weeklyChange);
  const direction =
    weightChangeKg < 0 ? "감량" : weightChangeKg > 0 ? "증량" : "유지";

  return {
    bmi,
    bmiLabel: getBmiLabel(bmi),
    weightChangeKg,
    recommendedWeeklyChangeKg:
      goal.goalType === "weight_gain" || goal.goalType === "muscle_gain"
        ? "0.25~0.5kg"
        : "0.25~0.75kg",
    estimatedDurationWeeks,
    paceLabel: weeklyChange > 0.75 ? "빠름" : weeklyChange < 0.25 ? "완만" : "적정",
    riskFlags,
    summary:
      direction === "유지"
        ? "현재 체중을 크게 바꾸기보다 운동 수행력과 회복 루틴을 안정화하는 구성이 적합합니다."
        : `${direction} 목표는 주당 ${weeklyChange.toFixed(2)}kg 수준의 변화를 기준으로 점진적으로 접근하는 것이 좋습니다.`,
  };
}

export function buildNutritionTargets(
  profile: HealthProfile,
  goal: CoachGoal,
): NutritionTargets {
  const bmr =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    (profile.gender === "female" ? -161 : 5);
  const activityFactor =
    goal.weeklyWorkoutDays >= 5 ? 1.6 : goal.weeklyWorkoutDays >= 3 ? 1.45 : 1.3;
  const adjustment = getCalorieAdjustment(goal.goalType);
  const dailyCalories = Math.max(
    1300,
    Math.round((bmr * activityFactor + adjustment) / 50) * 50,
  );
  const proteinMultiplier =
    goal.goalType === "muscle_gain" || goal.goalType === "body_recomposition"
      ? 2
      : 1.7;
  const proteinG = Math.round(profile.weightKg * proteinMultiplier);
  const fatG = Math.round((dailyCalories * 0.25) / 9);
  const carbsG = Math.max(
    80,
    Math.round((dailyCalories - proteinG * 4 - fatG * 9) / 4),
  );

  return {
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    meals: buildMeals(goal.goalType, profile),
    notes: [
      "극단적인 칼로리 제한은 피하고, 2주 단위로 체중과 컨디션을 보고 조정합니다.",
      "운동 전후에는 탄수화물과 단백질을 함께 배치해 회복을 돕습니다.",
      profile.allergies.length || profile.dietaryRestrictions.length
        ? "알레르기와 식단 제한 조건을 우선 반영해 대체 식품을 선택합니다."
        : "특별한 제한 조건이 없으므로 조리 난이도가 낮은 식품 위주로 구성합니다.",
    ],
  };
}

export function buildWorkoutPlan(
  profile: HealthProfile,
  goal: CoachGoal,
): WorkoutDay[] {
  const frequency = Math.min(goal.weeklyWorkoutDays, dayNames.length);
  return dayNames.slice(0, frequency).map((day, index) => {
    const strengthFocus = index % 2 === 0 ? "하체 기초 근력" : "상체 당기기/밀기";
    return {
      day,
      title: buildWorkoutTitle(goal.goalType, goal.experienceLevel, index),
      intensity: buildIntensity(goal.experienceLevel, goal.goalType),
      minutes: goal.dailyWorkoutMinutes,
      warmup: ["가벼운 로잉 또는 바이크 5분", "고관절, 어깨 동적 스트레칭"],
      skill:
        goal.experienceLevel === "beginner"
          ? ["스쿼트 기본 자세", "힌지 패턴 연습"]
          : ["클린 풀 동작 분해", "더블언더 또는 로잉 페이스 조절"],
      strength: [`${strengthFocus} 3~4세트`, "세트 사이 호흡이 회복될 만큼 휴식"],
      wod:
        goal.experienceLevel === "advanced"
          ? "AMRAP 16분: 월볼 15회, 풀업 10회, 로잉 250m"
          : "AMRAP 10분: 에어스쿼트 10회, 링로우 8회, 바이크 200m",
      cooldown: ["호흡 정리 2분", "하체와 흉추 스트레칭 5분"],
      alternatives: profile.injuries.length
        ? ["통증 부위에 부담이 있으면 점프 동작은 로잉/바이크로 대체", "무게보다 자세와 가동 범위를 우선"]
        : ["컨디션이 낮은 날은 WOD 시간을 20% 줄이기"],
    };
  });
}

export function buildShoppingItems(nutrition: NutritionTargets): ShoppingItem[] {
  const names = Array.from(
    new Set(
      nutrition.meals
        .flatMap((meal) => meal.menu.split(/,|\/|또는/))
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  );

  return names.map((name) => {
    const keyword = `${name} 식단`;
    return {
      name,
      quantity: "1주분",
      keyword,
      url: `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`,
    };
  });
}

export function buildEvidence(profile: HealthProfile, goal: CoachGoal): EvidenceItem[] {
  return [
    {
      source: "WHO",
      title: "신체활동 가이드라인",
      summary:
        "주간 운동 빈도와 회복일 배치는 일반 성인의 규칙적인 신체활동 권장 기준을 참고합니다.",
      url: "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
    },
    {
      source: "ACSM",
      title: "운동 강도와 점진적 과부하",
      summary:
        goal.experienceLevel === "beginner"
          ? "초보자는 낮은 강도와 기술 습득을 우선하며, 볼륨은 점진적으로 늘립니다."
          : "경험자는 목표에 따라 근력과 대사 컨디셔닝 비중을 조정합니다.",
      url: "https://www.acsm.org",
    },
    {
      source: "ISSN",
      title: "스포츠 영양 권장 범위",
      summary:
        profile.dietaryRestrictions.length > 0
          ? "단백질과 탄수화물 목표는 제한 식품을 제외한 대체 식품으로 충족하도록 구성합니다."
          : "단백질 목표와 운동 전후 탄수화물 배치는 회복과 수행력 유지를 위해 사용합니다.",
      url: "https://www.sportsnutritionsociety.org",
    },
  ];
}

function buildMeals(goalType: GoalType, profile: HealthProfile) {
  const vegetarian = profile.dietaryRestrictions.some((item) =>
    ["채식", "비건"].includes(item),
  );
  const protein = vegetarian ? "두부 또는 렌틸콩" : "닭가슴살 또는 달걀";
  const dinnerCarb =
    goalType === "muscle_gain" || goalType === "weight_gain"
      ? "고구마 추가"
      : "구운 채소 추가";

  return [
    {
      type: "아침",
      menu: "그릭요거트, 블루베리, 오트밀",
      notes: "단백질과 복합 탄수화물을 함께 배치합니다.",
    },
    {
      type: "점심",
      menu: `${protein}, 현미밥, 샐러드`,
      notes: "운동일에는 탄수화물을 지나치게 줄이지 않습니다.",
    },
    {
      type: "저녁",
      menu: `연어 또는 ${protein}, ${dinnerCarb}`,
      notes: "가공식품과 당류 섭취는 낮게 유지합니다.",
    },
    {
      type: "간식",
      menu: "단백질 보충식 또는 삶은 달걀",
      notes: "운동 후 회복 보조용으로 사용합니다.",
    },
  ];
}

function estimateDurationWeeks(goal: CoachGoal, absChange: number) {
  if (!goal.targetDate) {
    return Math.max(1, Math.ceil(absChange / 0.5));
  }

  const today = new Date();
  const target = new Date(`${goal.targetDate}T00:00:00`);
  const diffWeeks = Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7),
  );

  return Math.max(1, diffWeeks);
}

function buildRiskFlags(
  profile: HealthProfile,
  goal: CoachGoal,
  weeklyChange: number,
) {
  const flags: string[] = [];
  if (profile.injuries.length) {
    flags.push(`부상 이력: ${profile.injuries.join(", ")}. 통증이 있으면 전문가 상담을 권장합니다.`);
  }
  if (profile.medicalNotes.trim()) {
    flags.push("질환 또는 주의사항이 있으므로 운동 강도와 식단 변경은 보수적으로 시작합니다.");
  }
  if (goal.weeklyWorkoutDays >= 6) {
    flags.push("주 6회 이상 운동은 회복일과 수면 관리가 필요합니다.");
  }
  if (weeklyChange > 0.75) {
    flags.push("목표 변화 속도가 빠릅니다. 기간이나 목표 수치를 조정하는 것이 안전합니다.");
  }
  return flags.length ? flags : ["현재 입력값 기준으로 큰 위험 신호는 없지만, 통증이나 어지러움이 있으면 즉시 중단합니다."];
}

function getBmiLabel(bmi: number) {
  if (bmi < 18.5) return "저체중";
  if (bmi < 23) return "정상";
  if (bmi < 25) return "과체중";
  return "비만 범위";
}

function getCalorieAdjustment(goalType: GoalType) {
  if (goalType === "weight_gain" || goalType === "muscle_gain") return 250;
  if (goalType === "fat_loss" || goalType === "body_recomposition") return -350;
  return 0;
}

function buildWorkoutTitle(
  goalType: GoalType,
  level: ExperienceLevel,
  index: number,
) {
  if (level === "beginner") return index % 2 === 0 ? "기초 자세와 짧은 WOD" : "저충격 컨디셔닝";
  if (goalType === "muscle_gain") return "근력 보강 중심 크로스핏";
  if (goalType === "performance") return "기술과 대사 컨디셔닝";
  return "체지방 관리형 전신 루틴";
}

function buildIntensity(level: ExperienceLevel, goalType: GoalType) {
  if (level === "beginner") return "낮음~중간";
  if (level === "advanced" || goalType === "performance") return "중간~높음";
  return "중간";
}

function round(value: number, digits: number) {
  const unit = 10 ** digits;
  return Math.round(value * unit) / unit;
}
