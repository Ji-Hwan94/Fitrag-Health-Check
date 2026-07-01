"use client";

import Panel from "@/components/ui/Panel";
import { buildWorkoutPlan } from "@/lib/recommendations";
import { useCoachStore } from "@/store/useCoachStore";

const PlanBlock = ({
  title,
  items,
}: Readonly<{ title: string; items: string[] }>) => (
  <div className="rounded-md border border-[#d8ded7] bg-[#fbfcf8] p-4">
    <p className="text-sm font-semibold text-[#344238]">{title}</p>
    <ul className="mt-2 grid gap-2">
      {items.map((item) => (
        <li key={item} className="text-sm leading-6 text-[#526052]">
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const WorkoutPlanPanel = () => {
  const {
    fullRecommendation,
    goal,
    profile,
    selectedPlanDay,
    setSelectedPlanDay,
  } = useCoachStore();
  const fallbackPlan = buildWorkoutPlan(profile, goal);
  const weekPlan =
    fullRecommendation?.workout_plan.days.map((plan) => ({
      day: plan.day,
      title: `${plan.day} 크로스핏 루틴`,
      goalFocus: plan.goal_focus,
      intensity: fullRecommendation.workout_plan.intensity_level,
      minutes: plan.target_minutes ?? goal.dailyWorkoutMinutes,
      warmup: plan.warmup,
      skill: plan.skill,
      strength: plan.strength,
      wod: plan.wod,
      cooldown: plan.cooldown,
      alternatives: plan.alternatives,
    })) ?? fallbackPlan;
  const selectedPlan =
    weekPlan.find((plan) => plan.day === selectedPlanDay) ?? weekPlan[0];

  return (
    <Panel title="주간 크로스핏 운동 계획">
      <div className="mb-4 flex flex-wrap gap-2">
        {weekPlan.map((plan) => (
          <button
            key={plan.day}
            className={`h-10 rounded-md px-4 text-sm font-semibold transition ${
              selectedPlan.day === plan.day
                ? "bg-[#152018] text-white"
                : "border border-[#c9d2c8] bg-white text-[#344238] hover:border-[#3d6d5a]"
            }`}
            type="button"
            onClick={() => setSelectedPlanDay(plan.day)}
          >
            {plan.day}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <h3 className="text-xl font-semibold">{selectedPlan.title}</h3>
          <p className="mt-2 text-sm text-[#526052]">
            예상 소요 시간 {selectedPlan.minutes}분
          </p>
          {selectedPlan.goalFocus ? (
            <p className="mt-2 rounded-md bg-[#e8f2eb] px-3 py-2 text-sm leading-6 text-[#405143]">
              목표 반영: {selectedPlan.goalFocus}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PlanBlock title="워밍업" items={selectedPlan.warmup} />
            <PlanBlock title="기술 연습" items={selectedPlan.skill} />
            <PlanBlock title="근력 운동" items={selectedPlan.strength} />
            <PlanBlock title="쿨다운" items={selectedPlan.cooldown} />
          </div>
          <div className="mt-3 rounded-md bg-[#e8f2eb] p-4">
            <p className="text-sm font-semibold text-[#344238]">WOD</p>
            <p className="mt-2 text-sm leading-6 text-[#405143]">
              {selectedPlan.wod}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-[#d8ded7] bg-white p-4">
          <p className="text-sm text-[#6b766c]">운동 강도</p>
          <p className="mt-1 text-2xl font-semibold">{selectedPlan.intensity}</p>
          <div className="mt-4">
            <p className="text-sm font-semibold text-[#344238]">대체 운동</p>
            <ul className="mt-2 grid gap-2">
              {selectedPlan.alternatives.map((item) => (
                <li key={item} className="text-sm leading-6 text-[#526052]">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {fullRecommendation?.workout_plan.caution_notes.length ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-[#344238]">주의 사항</p>
              <ul className="mt-2 grid gap-2">
                {fullRecommendation.workout_plan.caution_notes.map((item) => (
                  <li key={item} className="text-sm leading-6 text-[#526052]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </Panel>
  );
};

export default WorkoutPlanPanel;
