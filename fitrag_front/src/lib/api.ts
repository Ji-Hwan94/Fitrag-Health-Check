const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";

const SESSION_KEY = "fitrag.session";

export type ApiSession = {
  userId: string;
  email: string;
  accessToken: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

export type AuthResponse = {
  user_id: string;
  access_token: string;
};

export type HealthProfileResponse = {
  user_id: string;
  gender: string | null;
  age: number | null;
  height_cm: string | number | null;
  weight_kg: string | number | null;
  muscle_mass_kg?: string | number | null;
  fat_mass_kg?: string | number | null;
  body_fat_percentage?: string | number | null;
  bmi: string | number | null;
  activity_level: string | null;
  injuries: string | null;
  allergies: string | null;
  dietary_restrictions: string | null;
  food_preferences?: string | null;
  medical_notes?: string | null;
};

export type UpsertProfilePayload = {
  gender: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  muscle_mass_kg?: number | null;
  fat_mass_kg?: number | null;
  body_fat_percentage?: number | null;
  activity_level: string;
  injuries?: string;
  allergies?: string;
  dietary_restrictions?: string;
  food_preferences?: string;
  medical_notes?: string;
};

export type GoalResponse = {
  id: string;
  user_id: string;
  goal_type: string;
  target_weight_kg: string | number | null;
  target_muscle_mass_kg: string | number | null;
  target_fat_mass_kg: string | number | null;
  target_body_fat_percentage: string | number | null;
  target_date: string | null;
  weekly_workout_days: number | null;
  daily_workout_minutes: number | null;
  experience_level: "beginner" | "intermediate" | "advanced";
};

export type FullRecommendationResponse = {
  body_analysis: {
    bmi: number;
    weight_change_kg: number;
    recommended_weekly_change_kg: string;
    estimated_duration_weeks: number;
    risk_flags: string[];
    summary: string;
  };
  workout_plan: {
    workout_plan_id: string;
    frequency_per_week: number;
    intensity_level: string;
    days: Array<{
      day: string;
      goal_focus?: string;
      warmup: string[];
      skill: string[];
      strength: string[];
      wod: string;
      cooldown: string[];
      alternatives: string[];
      target_minutes?: number;
    }>;
    caution_notes: string[];
  };
  meal_plan: {
    meal_plan_id: string;
    daily_calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meals: Array<{ type: string; menu: string; notes: string }>;
    nutrition_notes: string[];
    shopping_items: Array<{
      name: string;
      quantity: string | null;
      search_keyword: string | null;
      search_url: string | null;
      estimated_price: string | number | null;
    }>;
  };
  rag_evidence: Array<{
    id: string;
    source: string;
    title: string;
    source_url: string | null;
    chunk_text: string;
    relevance_score: number;
  }>;
};

export type CreateGoalPayload = {
  goal_type: string;
  target_weight_kg: number;
  target_muscle_mass_kg?: number | null;
  target_fat_mass_kg?: number | null;
  target_body_fat_percentage?: number | null;
  target_date: string;
  weekly_workout_days?: number | null;
  daily_workout_minutes?: number | null;
  experience_level: string;
};

const isLoopbackHost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const getApiBaseUrl = () => {
  if (typeof window === "undefined") return configuredApiBaseUrl;

  const apiUrl = new URL(configuredApiBaseUrl);
  const pageHost = window.location.hostname;

  if (isLoopbackHost(apiUrl.hostname) && !isLoopbackHost(pageHost)) {
    apiUrl.hostname = pageHost;
  }

  return apiUrl.toString().replace(/\/$/, "");
};

const apiRequest = async <T>(
  path: string,
  options: RequestInit & { token?: string } = {},
) => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });
  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !envelope.success || !envelope.data) {
    throw new Error(envelope.error?.message ?? "API 요청에 실패했습니다.");
  }

  return envelope.data;
};

export const signup = (input: {
  email: string;
  password: string;
  name: string;
}) =>
  apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const login = (input: { email: string; password: string }) =>
  apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getProfile = (token: string) =>
  apiRequest<HealthProfileResponse>("/me/profile", {
    method: "GET",
    token,
  });

export const upsertProfile = (token: string, payload: UpsertProfilePayload) =>
  apiRequest<HealthProfileResponse>("/me/profile", {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });

export const listGoals = (token: string) =>
  apiRequest<GoalResponse[]>("/goals", {
    method: "GET",
    token,
  });

export const createGoal = (token: string, payload: CreateGoalPayload) =>
  apiRequest<GoalResponse>("/goals", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });

export const createFullRecommendation = (
  token: string,
  input: { goal_id: string; week_start_date?: string },
) =>
  apiRequest<FullRecommendationResponse>("/recommendations/full", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });

export const saveSession = (session: ApiSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
};

export const loadSession = (): ApiSession | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ApiSession) : null;
  } catch {
    return null;
  }
};
