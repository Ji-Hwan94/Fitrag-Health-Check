"use client";

import NumberInput from "@/components/ui/NumberInput";
import Panel from "@/components/ui/Panel";
import {
  experienceLabels,
  ExperienceLevel,
  goalLabels,
  GoalType,
  useCoachStore,
} from "@/store/useCoachStore";

export default function GoalForm() {
  const { goal, updateGoal } = useCoachStore();

  return (
    <Panel title="목표 입력">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          목표 유형
          <select
            className="h-11 rounded-md border border-[#cbd4c4] bg-white px-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            value={goal.goalType}
            onChange={(event) =>
              updateGoal({ goalType: event.target.value as GoalType })
            }
          >
            {Object.entries(goalLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          운동 경험
          <select
            className="h-11 rounded-md border border-[#cbd4c4] bg-white px-3 text-sm outline-none transition focus:border-[#52735d] focus:ring-2 focus:ring-[#52735d]/20"
            value={goal.experienceLevel}
            onChange={(event) =>
              updateGoal({
                experienceLevel: event.target.value as ExperienceLevel,
              })
            }
          >
            {Object.entries(experienceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <NumberInput
          label="목표 체중"
          min={30}
          suffix="kg"
          value={goal.targetWeightKg}
          onChange={(targetWeightKg) => updateGoal({ targetWeightKg })}
        />
        <NumberInput
          label="주당 운동"
          max={6}
          min={1}
          suffix="회"
          value={goal.weeklyWorkoutDays}
          onChange={(weeklyWorkoutDays) => updateGoal({ weeklyWorkoutDays })}
        />
        <NumberInput
          label="하루 운동 가능 시간"
          min={20}
          suffix="분"
          value={goal.dailyWorkoutMinutes}
          onChange={(dailyWorkoutMinutes) =>
            updateGoal({ dailyWorkoutMinutes })
          }
        />
      </div>
    </Panel>
  );
}
