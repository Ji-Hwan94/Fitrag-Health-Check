"use client";

import Panel from "@/components/ui/Panel";
import StatusRow from "@/components/ui/StatusRow";
import {
  experienceLabels,
  goalLabels,
  useCoachStore,
} from "@/store/useCoachStore";

export default function GoalAnalysisPanel() {
  const { goal } = useCoachStore();

  return (
    <Panel title="목표 분석">
      <div className="space-y-4">
        <StatusRow label="목표" value={goalLabels[goal.goalType]} />
        <StatusRow
          label="경험 수준"
          value={experienceLabels[goal.experienceLevel]}
        />
        <StatusRow label="운동 시간" value={`${goal.dailyWorkoutMinutes}분`} />
        <div className="rounded-md bg-[#eef3e9] p-4 text-sm leading-6 text-[#405143]">
          현재 조건에서는 주당 0.25~0.75kg 범위의 완만한 감량 전략이
          적합합니다.
        </div>
      </div>
    </Panel>
  );
}
