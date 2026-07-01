import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateGoalDto } from './dto';

export type GoalRow = {
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
  experience_level: 'beginner' | 'intermediate' | 'advanced';
};

@Injectable()
export class GoalsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateGoalDto) {
    const profile = await this.getProfileForGoalEstimate(userId);
    const estimatedBody = this.estimateTargetBodyComposition(
      profile,
      dto.target_weight_kg,
    );
    const result = await this.db.query<GoalRow>(
      `insert into public.goals (
        user_id, goal_type, target_weight_kg, target_muscle_mass_kg,
        target_fat_mass_kg, target_body_fat_percentage, target_date,
        weekly_workout_days, daily_workout_minutes, experience_level
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      returning *`,
      [
        userId,
        dto.goal_type,
        dto.target_weight_kg,
        dto.target_muscle_mass_kg && dto.target_muscle_mass_kg > 0
          ? dto.target_muscle_mass_kg
          : estimatedBody.muscleMassKg,
        dto.target_fat_mass_kg && dto.target_fat_mass_kg > 0
          ? dto.target_fat_mass_kg
          : estimatedBody.fatMassKg,
        dto.target_body_fat_percentage && dto.target_body_fat_percentage > 0
          ? dto.target_body_fat_percentage
          : estimatedBody.bodyFatPercentage,
        dto.target_date,
        dto.weekly_workout_days ?? null,
        dto.daily_workout_minutes ?? null,
        dto.experience_level,
      ],
    );
    return result.rows[0];
  }

  private async getProfileForGoalEstimate(userId: string) {
    const result = await this.db.query<{
      gender: string | null;
      age: number | null;
      height_cm: string | number | null;
    }>(
      `select gender, age, height_cm
       from public.health_profiles
       where user_id = $1`,
      [userId],
    );

    if (!result.rowCount) {
      throw new NotFoundException({
        code: 'PROFILE_REQUIRED',
        message: '목표 저장 전 건강 프로필이 필요합니다.',
      });
    }

    return result.rows[0];
  }

  private estimateTargetBodyComposition(
    profile: { gender: string | null; age: number | null; height_cm: string | number | null },
    targetWeightKg: number,
  ) {
    const gender = profile.gender === 'female' ? 'female' : 'male';
    const age = Number(profile.age ?? 30);
    const heightCm = Number(profile.height_cm ?? 170);
    const bmi = targetWeightKg / (heightCm / 100) ** 2;
    const sexOffset = gender === 'male' ? 10.8 : 0;
    const minBodyFat = gender === 'male' ? 8 : 18;
    const maxBodyFat = gender === 'male' ? 35 : 45;
    const bodyFatPercentage = Number(
      Math.max(
        minBodyFat,
        Math.min(maxBodyFat, 1.2 * bmi + 0.23 * age - sexOffset - 5.4),
      ).toFixed(1),
    );
    const fatMassKg = Number(
      ((targetWeightKg * bodyFatPercentage) / 100).toFixed(1),
    );
    const leanMassKg = targetWeightKg - fatMassKg;
    const muscleMassRatio = gender === 'male' ? 0.55 : 0.5;
    const muscleMassKg = Number((leanMassKg * muscleMassRatio).toFixed(1));

    return { bodyFatPercentage, fatMassKg, muscleMassKg };
  }

  async list(userId: string) {
    const result = await this.db.query<GoalRow>(
      'select * from public.goals where user_id = $1 order by created_at desc',
      [userId],
    );
    return result.rows;
  }

  async getOwnedGoal(userId: string, goalId: string) {
    const result = await this.db.query<GoalRow>(
      'select * from public.goals where id = $1 and user_id = $2',
      [goalId, userId],
    );
    if (!result.rowCount) {
      throw new NotFoundException({
        code: 'GOAL_NOT_FOUND',
        message: '목표를 찾을 수 없습니다.',
      });
    }
    return result.rows[0];
  }
}
