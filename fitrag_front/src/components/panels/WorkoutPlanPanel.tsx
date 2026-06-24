"use client";

import Panel from "@/components/ui/Panel";
import { useCoachStore } from "@/store/useCoachStore";

const weekPlan = [
  {
    day: "월",
    title: "기초 스쿼트 + 짧은 WOD",
    intensity: "낮음-중간",
    details: ["로잉 5분", "Goblet squat 3x10", "AMRAP 10분"],
  },
  {
    day: "수",
    title: "푸시/풀 기본기",
    intensity: "낮음",
    details: ["밴드 풀어파트", "푸시업 스케일", "Bike interval"],
  },
  {
    day: "금",
    title: "전신 컨디셔닝",
    intensity: "중간",
    details: ["데드리프트 자세", "EMOM 12분", "하체 스트레칭"],
  },
];

export default function WorkoutPlanPanel() {
  const { selectedPlanDay, setSelectedPlanDay } = useCoachStore();
  const selectedPlan =
    weekPlan.find((plan) => plan.day === selectedPlanDay) ?? weekPlan[0];

  return (
    <Panel title="주간 운동 계획">
      <div className="mb-4 flex gap-2">
        {weekPlan.map((plan) => (
          <button
            key={plan.day}
            className={`h-10 rounded-md px-4 text-sm font-semibold transition ${
              selectedPlanDay === plan.day
                ? "bg-[#17201a] text-white"
                : "border border-[#cbd4c4] bg-white text-[#344238] hover:border-[#52735d]"
            }`}
            onClick={() => setSelectedPlanDay(plan.day)}
            type="button"
          >
            {plan.day}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div>
          <h3 className="text-xl font-semibold">{selectedPlan.title}</h3>
          <ul className="mt-4 grid gap-3">
            {selectedPlan.details.map((detail) => (
              <li
                key={detail}
                className="rounded-md bg-[#f7f8f3] px-4 py-3 text-sm text-[#405143]"
              >
                {detail}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-[#d9dfd1] bg-white p-4">
          <p className="text-sm text-[#6b766c]">운동 강도</p>
          <p className="mt-1 text-2xl font-semibold">
            {selectedPlan.intensity}
          </p>
          <p className="mt-4 text-sm leading-6 text-[#526052]">
            무릎 통증이 있으면 점프 동작을 로잉 또는 바이크로 대체합니다.
          </p>
        </div>
      </div>
    </Panel>
  );
}
