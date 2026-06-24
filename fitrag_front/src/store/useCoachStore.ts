"use client";

import { create } from "zustand";

export type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "body_recomposition"
  | "performance";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

type HealthProfile = {
  gender: string;
  age: number;
  heightCm: number;
  weightKg: number;
  injuries: string;
  dietaryRestrictions: string;
};

type CoachGoal = {
  goalType: GoalType;
  targetWeightKg: number;
  weeklyWorkoutDays: number;
  dailyWorkoutMinutes: number;
  experienceLevel: ExperienceLevel;
};

type CoachState = {
  profile: HealthProfile;
  goal: CoachGoal;
  selectedPlanDay: string;
  updateProfile: (profile: Partial<HealthProfile>) => void;
  updateGoal: (goal: Partial<CoachGoal>) => void;
  setSelectedPlanDay: (day: string) => void;
};

export const goalLabels: Record<GoalType, string> = {
  fat_loss: "체지방 감소",
  muscle_gain: "근육 증가",
  weight_gain: "건강한 증량",
  body_recomposition: "체형 재구성",
  performance: "체력 향상",
};

export const experienceLabels: Record<ExperienceLevel, string> = {
  beginner: "초보",
  intermediate: "중급",
  advanced: "고급",
};

export const useCoachStore = create<CoachState>((set) => ({
  profile: {
    gender: "male",
    age: 30,
    heightCm: 175,
    weightKg: 82,
    injuries: "무릎 통증 이력",
    dietaryRestrictions: "없음",
  },
  goal: {
    goalType: "fat_loss",
    targetWeightKg: 74,
    weeklyWorkoutDays: 3,
    dailyWorkoutMinutes: 60,
    experienceLevel: "beginner",
  },
  selectedPlanDay: "월",
  updateProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),
  updateGoal: (goal) => set((state) => ({ goal: { ...state.goal, ...goal } })),
  setSelectedPlanDay: (day) => set({ selectedPlanDay: day }),
}));
