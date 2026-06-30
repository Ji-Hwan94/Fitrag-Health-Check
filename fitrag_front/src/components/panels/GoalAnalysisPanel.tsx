"use client";

import Panel from "@/components/ui/Panel";
import StatusRow from "@/components/ui/StatusRow";
import { analyzeBody } from "@/lib/recommendations";
import {
  experienceLabels,
  goalLabels,
  useCoachStore,
} from "@/store/useCoachStore";

const GoalAnalysisPanel = () => {
  const { fullRecommendation, goal, profile } = useCoachStore();
  const analysis = analyzeBody(profile, goal);
  const bodyAnalysis = fullRecommendation?.body_analysis;
  const bmi = bodyAnalysis?.bmi ?? analysis.bmi;
  const weightChangeKg =
    bodyAnalysis?.weight_change_kg ?? analysis.weightChangeKg;
  const estimatedDurationWeeks =
    bodyAnalysis?.estimated_duration_weeks ?? analysis.estimatedDurationWeeks;
  const riskFlags = bodyAnalysis?.risk_flags.length
    ? bodyAnalysis.risk_flags
    : analysis.riskFlags;

  return (
    <Panel title="신체 상태와 목표 분석">
      <div className="space-y-4">
        <StatusRow label="목표" value={goalLabels[goal.goalType]} />
        <StatusRow
          label="운동 경험"
          value={experienceLabels[goal.experienceLevel]}
        />
        <StatusRow label="현재 BMI" value={`${bmi} (${analysis.bmiLabel})`} />
        <StatusRow
          label="목표 체중 변화"
          value={`${weightChangeKg > 0 ? "+" : ""}${weightChangeKg}kg`}
        />
        <StatusRow
          label="예상 기간"
          value={`${estimatedDurationWeeks}주 (${analysis.paceLabel})`}
        />
        <div className="rounded-md bg-[#e8f2eb] p-4 text-sm leading-6 text-[#405143]">
          {bodyAnalysis?.summary ?? analysis.summary}
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-[#344238]">주의 사항</p>
          <ul className="grid gap-2">
            {riskFlags.map((flag) => (
              <li
                key={flag}
                className="rounded-md border border-[#d8ded7] bg-[#fbfcf8] px-3 py-2 text-sm leading-6 text-[#526052]"
              >
                {flag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Panel>
  );
};

export default GoalAnalysisPanel;
