"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NumberInput from "@/components/ui/NumberInput";
import Panel from "@/components/ui/Panel";
import { createGoal, loadSession } from "@/lib/api";
import { useAuthProfileGuard } from "@/lib/useAuthProfileGuard";
import {
  experienceLabels,
  ExperienceLevel,
  goalLabels,
  GoalType,
  useCoachStore,
} from "@/store/useCoachStore";

const GoalForm = () => {
  useAuthProfileGuard(true);

  const router = useRouter();
  const { goal, setCurrentGoalId, setFullRecommendation, updateGoal } =
    useCoachStore();
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const token = loadSession()?.accessToken;
    if (!token) {
      router.replace("/login");
      return;
    }

    setIsSaving(true);
    setStatus("");

    if (!goal.goalType) {
      setIsSaving(false);
      setStatus("목표 유형은 필수 입력 요소입니다.");
      return;
    }

    if (!goal.targetWeightKg || goal.targetWeightKg < 30) {
      setIsSaving(false);
      setStatus("목표 체중은 필수 입력 요소입니다.");
      return;
    }

    if (!goal.targetDate) {
      setIsSaving(false);
      setStatus("목표 기간은 필수 입력 요소입니다.");
      return;
    }

    try {
      const savedGoal = await createGoal(token, {
        goal_type: goal.goalType,
        target_weight_kg: goal.targetWeightKg,
        target_muscle_mass_kg: goal.targetMuscleMassKg,
        target_fat_mass_kg: goal.targetFatMassKg,
        target_body_fat_percentage: goal.targetBodyFatPercentage,
        target_date: goal.targetDate,
        weekly_workout_days: goal.weeklyWorkoutDays,
        daily_workout_minutes: goal.dailyWorkoutMinutes,
        experience_level: goal.experienceLevel,
      });
      setCurrentGoalId(savedGoal.id);
      setFullRecommendation(null);
      updateGoal({
        targetDate: savedGoal.target_date?.slice(0, 10) ?? goal.targetDate,
        targetMuscleMassKg:
          Number(savedGoal.target_muscle_mass_kg) || goal.targetMuscleMassKg,
        targetFatMassKg:
          Number(savedGoal.target_fat_mass_kg) || goal.targetFatMassKg,
        targetBodyFatPercentage:
          Number(savedGoal.target_body_fat_percentage) ||
          goal.targetBodyFatPercentage,
      });
      router.push("/");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "목표 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel title="목표 입력">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          목표 유형
          <span className="text-xs font-normal text-[#8a4b3d]">필수</span>
          <select
            className="form-field"
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
            className="form-field"
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
          label="목표 체중 (필수)"
          min={30}
          suffix="kg"
          value={goal.targetWeightKg}
          onChange={(targetWeightKg) => updateGoal({ targetWeightKg })}
        />
        <NumberInput
          label="목표 근육량"
          min={0}
          suffix="kg"
          value={goal.targetMuscleMassKg ?? 0}
          onChange={(targetMuscleMassKg) =>
            updateGoal({ targetMuscleMassKg: targetMuscleMassKg || null })
          }
        />
        <NumberInput
          label="목표 체지방량"
          min={0}
          suffix="kg"
          value={goal.targetFatMassKg ?? 0}
          onChange={(targetFatMassKg) =>
            updateGoal({ targetFatMassKg: targetFatMassKg || null })
          }
        />
        <NumberInput
          label="목표 체지방률"
          max={100}
          min={0}
          suffix="%"
          value={goal.targetBodyFatPercentage ?? 0}
          onChange={(targetBodyFatPercentage) =>
            updateGoal({
              targetBodyFatPercentage: targetBodyFatPercentage || null,
            })
          }
        />
        <p className="text-xs leading-5 text-[#6b766c] md:col-span-2">
          목표 근육량, 목표 체지방량, 목표 체지방률을 비워두면 저장된
          건강 프로필의 성별, 나이, 키와 목표 체중을 기준으로 평균 추정값을
          저장합니다.
        </p>
        <label className="grid gap-2 text-sm font-medium text-[#344238]">
          목표 기간
          <span className="text-xs font-normal text-[#8a4b3d]">필수</span>
          <input
            className="form-field"
            type="date"
            value={goal.targetDate}
            onChange={(event) => updateGoal({ targetDate: event.target.value })}
          />
        </label>
        <NumberInput
          label="주당 운동 가능 횟수"
          max={7}
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
        <div className="rounded-md border border-[#d8ded7] bg-[#f7f8f3] p-4 text-sm leading-6 text-[#526052] md:col-span-2">
          목표를 저장하면 다음 로그인부터 프로필과 목표 입력이 완료된 사용자로
          판단해 메인 페이지로 바로 이동합니다.
        </div>
        {status ? (
          <p className="text-sm leading-6 text-[#526052] md:col-span-2">
            {status}
          </p>
        ) : null}
        <button
          className="primary-button md:col-span-2"
          disabled={isSaving}
          type="button"
          onClick={handleSave}
        >
          {isSaving ? "저장 중" : "목표 저장 후 결과 보기"}
        </button>
      </div>
    </Panel>
  );
};

export default GoalForm;
