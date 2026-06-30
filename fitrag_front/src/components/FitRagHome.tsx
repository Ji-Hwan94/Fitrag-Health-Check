"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import GoalAnalysisPanel from "@/components/panels/GoalAnalysisPanel";
import NutritionTargetsPanel from "@/components/panels/NutritionTargetsPanel";
import RagEvidencePanel from "@/components/panels/RagEvidencePanel";
import RecommendationPolicyPanel from "@/components/panels/RecommendationPolicyPanel";
import ShoppingPanel from "@/components/panels/ShoppingPanel";
import WorkoutPlanPanel from "@/components/panels/WorkoutPlanPanel";
import Metric from "@/components/ui/Metric";
import Panel from "@/components/ui/Panel";
import {
  createFullRecommendation,
  getProfile,
  GoalResponse,
  HealthProfileResponse,
  listGoals,
  loadSession,
} from "@/lib/api";
import { analyzeBody } from "@/lib/recommendations";
import { useAuthProfileGuard } from "@/lib/useAuthProfileGuard";
import {
  ExperienceLevel,
  Gender,
  GoalType,
  useCoachStore,
} from "@/store/useCoachStore";

const splitList = (value: string | null | undefined) =>
  value ? value.split(",").map((item) => item.trim()).filter(Boolean) : [];

const toNumber = (
  value: string | number | null | undefined,
  fallback: number,
) => {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toGoalState = (goal: GoalResponse) => ({
  goalType: goal.goal_type as GoalType,
  targetWeightKg: toNumber(goal.target_weight_kg, 74),
  targetMuscleMassKg: toOptionalNumber(goal.target_muscle_mass_kg),
  targetFatMassKg: toOptionalNumber(goal.target_fat_mass_kg),
  targetBodyFatPercentage: toOptionalNumber(goal.target_body_fat_percentage),
  targetDate: goal.target_date?.slice(0, 10) ?? "",
  weeklyWorkoutDays: goal.weekly_workout_days ?? 3,
  dailyWorkoutMinutes: goal.daily_workout_minutes ?? 60,
  experienceLevel: goal.experience_level,
});

const toProfileState = (profile: HealthProfileResponse) => {
  const experienceLevel =
    (profile.activity_level as ExperienceLevel | null) ?? "beginner";

  return {
    gender: (profile.gender as Gender | null) ?? "none",
    age: profile.age ?? 30,
    heightCm: toNumber(profile.height_cm, 175),
    weightKg: toNumber(profile.weight_kg, 82),
    muscleMassKg: toOptionalNumber(profile.muscle_mass_kg),
    fatMassKg: toOptionalNumber(profile.fat_mass_kg),
    bodyFatPercentage: toOptionalNumber(profile.body_fat_percentage),
    experienceLevel,
    injuries: splitList(profile.injuries),
    allergies: splitList(profile.allergies),
    dietaryRestrictions: splitList(profile.dietary_restrictions),
    foodPreferences: profile.food_preferences ?? "",
    medicalNotes: profile.medical_notes ?? "",
  };
};

const FitRagHome = () => {
  useAuthProfileGuard(true);

  const router = useRouter();
  const {
    account,
    currentGoalId,
    fullRecommendation,
    goal,
    profile,
    recommendationStatus,
    setCurrentGoalId,
    setFullRecommendation,
    setRecommendationStatus,
    updateAccount,
    updateGoal,
    updateProfile,
  } = useCoachStore();
  const analysis = analyzeBody(profile, goal);
  const displayedBmi = fullRecommendation?.body_analysis.bmi ?? analysis.bmi;
  const displayedWeightChange =
    fullRecommendation?.body_analysis.weight_change_kg ?? analysis.weightChangeKg;
  const displayedWorkoutFrequency =
    fullRecommendation?.workout_plan.frequency_per_week ??
    goal.weeklyWorkoutDays;

  useEffect(() => {
    let cancelled = false;

    const loadRecommendation = async () => {
      const session = loadSession();
      if (!session) return;

      setRecommendationStatus("저장된 프로필과 목표로 RAG 추천을 생성하는 중입니다.");

      try {
        updateAccount({
          email: session.email,
          userId: session.userId,
          accessToken: session.accessToken,
          created: true,
        });

        const [savedProfile, goals] = await Promise.all([
          getProfile(session.accessToken),
          listGoals(session.accessToken),
        ]);

        if (cancelled) return;

        updateProfile(toProfileState(savedProfile));

        const selectedGoal =
          goals.find((item) => item.id === currentGoalId) ?? goals[0];

        if (!selectedGoal) {
          setRecommendationStatus("목표 입력 후 추천 결과를 생성할 수 있습니다.");
          setFullRecommendation(null);
          router.replace("/goals");
          return;
        }

        updateGoal(toGoalState(selectedGoal));
        setCurrentGoalId(selectedGoal.id);

        const recommendation = await createFullRecommendation(
          session.accessToken,
          { goal_id: selectedGoal.id },
        );

        if (cancelled) return;

        setFullRecommendation(recommendation);
        setRecommendationStatus("RAG 추천 결과가 생성되었습니다.");
      } catch (error) {
        if (cancelled) return;
        setFullRecommendation(null);
        setRecommendationStatus(
          error instanceof Error
            ? error.message
            : "RAG 추천 결과를 생성하지 못했습니다.",
        );
      }
    };

    void loadRecommendation();

    return () => {
      cancelled = true;
    };
  }, [
    currentGoalId,
    router,
    setCurrentGoalId,
    setFullRecommendation,
    setRecommendationStatus,
    updateAccount,
    updateGoal,
    updateProfile,
  ]);

  return (
    <main className="min-h-screen bg-[#f4f6f1] text-[#152018]">
      <AppHeader />
      <section className="border-b border-[#d8ded7] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3d6d5a]">
              FitRAG Coach MVP
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#111814] sm:text-5xl">
              입력한 건강 정보로 운동, 식단, 장보기, 근거를 한 번에 정리합니다.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526052]">
              BMI와 목표 변화를 계산하고, 크로스핏 중심 주간 루틴과 식단 예시,
              재료 검색 링크, RAG 근거를 같은 화면에서 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-md border border-[#d8ded7] bg-[#fbfcf8] p-3">
            <Metric label="BMI" value={String(displayedBmi)} />
            <Metric
              label="목표 변화"
              value={`${displayedWeightChange > 0 ? "+" : ""}${displayedWeightChange}kg`}
            />
            <Metric label="운동" value={`주 ${displayedWorkoutFrequency}회`} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-5">
          <Panel title="입력 단계">
            <div className="grid gap-3">
              <div className="rounded-md border border-[#d8ded7] bg-[#fbfcf8] px-4 py-3 text-sm font-semibold text-[#344238]">
                {account.email}
              </div>
              <Link className="primary-link" href="/profile">
                건강 프로필 수정
              </Link>
              <Link className="primary-link" href="/goals">
                목표 입력
              </Link>
            </div>
          </Panel>
          <RecommendationPolicyPanel />
        </aside>

        <div className="grid gap-5">
          <Panel title="RAG 추천 상태">
            <p className="text-sm leading-6 text-[#526052]">
              {recommendationStatus ||
                "저장된 건강 프로필과 목표를 확인하는 중입니다."}
            </p>
          </Panel>
          <div className="grid gap-5 xl:grid-cols-3">
            <GoalAnalysisPanel />
            <NutritionTargetsPanel />
            <ShoppingPanel />
          </div>
          <WorkoutPlanPanel />
          <RagEvidencePanel />
        </div>
      </section>
    </main>
  );
};

export default FitRagHome;
