"use client";

import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import GoalAnalysisPanel from "@/components/panels/GoalAnalysisPanel";
import NutritionTargetsPanel from "@/components/panels/NutritionTargetsPanel";
import RagEvidencePanel from "@/components/panels/RagEvidencePanel";
import RecommendationPolicyPanel from "@/components/panels/RecommendationPolicyPanel";
import ShoppingPanel from "@/components/panels/ShoppingPanel";
import WorkoutPlanPanel from "@/components/panels/WorkoutPlanPanel";
import Metric from "@/components/ui/Metric";
import Panel from "@/components/ui/Panel";
import { useCoachStore } from "@/store/useCoachStore";

export default function FitRagHome() {
  const { profile, goal } = useCoachStore();
  const bmi = profile.weightKg / (profile.heightCm / 100) ** 2;
  const weightDelta = goal.targetWeightKg - profile.weightKg;

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#17201a]">
      <AppHeader />
      <section className="border-b border-[#d9dfd1] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#52735d]">
              FitRAG Coach
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-[#111814] sm:text-5xl">
              크로스핏 운동과 식단을 근거 기반으로 추천하는 코칭 대시보드
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#526052]">
              신체 정보와 목표 입력은 별도 페이지에서 관리하고, 홈에서는
              추천 결과와 실행 항목을 확인합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-md border border-[#d9dfd1] bg-[#fbfcf8] p-3">
            <Metric label="BMI" value={bmi.toFixed(1)} />
            <Metric label="목표 변화" value={`${weightDelta}kg`} />
            <Metric label="운동" value={`주 ${goal.weeklyWorkoutDays}회`} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <aside className="space-y-5">
          <Panel title="입력 단계">
            <div className="grid gap-3">
              <Link className="primary-link" href="/profile">
                신체 정보 입력
              </Link>
              <Link className="primary-link" href="/goals">
                목표 입력
              </Link>
            </div>
          </Panel>
          <RecommendationPolicyPanel />
        </aside>

        <div className="grid gap-5">
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
}
