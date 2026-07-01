"use client";

import { create } from "zustand";
import type { FullRecommendationResponse } from "@/lib/api";

export type GoalType =
  | "fat_loss"
  | "muscle_gain"
  | "weight_gain"
  | "body_recomposition"
  | "performance";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Gender = "male" | "female" | "none";

export type Account = {
  email: string;
  userId: string;
  accessToken: string;
  created: boolean;
};

export type HealthProfile = {
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  muscleMassKg: number | null;
  fatMassKg: number | null;
  bodyFatPercentage: number | null;
  experienceLevel: ExperienceLevel;
  injuries: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  foodPreferences: string;
  medicalNotes: string;
};

export type CoachGoal = {
  goalType: GoalType;
  targetWeightKg: number;
  targetMuscleMassKg: number | null;
  targetFatMassKg: number | null;
  targetBodyFatPercentage: number | null;
  targetDate: string;
  weeklyWorkoutDays: number;
  dailyWorkoutMinutes: number;
  experienceLevel: ExperienceLevel;
};

type CoachState = {
  account: Account;
  profile: HealthProfile;
  goal: CoachGoal;
  currentGoalId: string;
  fullRecommendation: FullRecommendationResponse | null;
  recommendationStatus: string;
  selectedPlanDay: string;
  updateAccount: (account: Partial<Account>) => void;
  updateProfile: (profile: Partial<HealthProfile>) => void;
  updateGoal: (goal: Partial<CoachGoal>) => void;
  setCurrentGoalId: (goalId: string) => void;
  setFullRecommendation: (
    recommendation: FullRecommendationResponse | null,
  ) => void;
  setRecommendationStatus: (status: string) => void;
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

export const genderLabels: Record<Gender, string> = {
  male: "남성",
  female: "여성",
  none: "응답 안 함",
};

export const useCoachStore = create<CoachState>((set) => ({
  account: {
    email: "",
    userId: "",
    accessToken: "",
    created: false,
  },
  profile: {
    gender: "none",
    age: 30,
    heightCm: 175,
    weightKg: 82,
    muscleMassKg: null,
    fatMassKg: null,
    bodyFatPercentage: null,
    experienceLevel: "beginner",
    injuries: [],
    allergies: [],
    dietaryRestrictions: [],
    foodPreferences: "",
    medicalNotes: "",
  },
  goal: {
    goalType: "fat_loss",
    targetWeightKg: 74,
    targetMuscleMassKg: null,
    targetFatMassKg: null,
    targetBodyFatPercentage: null,
    targetDate: "2026-09-30",
    weeklyWorkoutDays: 3,
    dailyWorkoutMinutes: 60,
    experienceLevel: "beginner",
  },
  currentGoalId: "",
  fullRecommendation: null,
  recommendationStatus: "",
  selectedPlanDay: "월",
  updateAccount: (account) =>
    set((state) => ({ account: { ...state.account, ...account } })),
  updateProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),
  updateGoal: (goal) => set((state) => ({ goal: { ...state.goal, ...goal } })),
  setCurrentGoalId: (goalId) => set({ currentGoalId: goalId }),
  setFullRecommendation: (recommendation) =>
    set({ fullRecommendation: recommendation }),
  setRecommendationStatus: (status) => set({ recommendationStatus: status }),
  setSelectedPlanDay: (day) => set({ selectedPlanDay: day }),
}));
