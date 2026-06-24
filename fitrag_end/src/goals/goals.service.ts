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
  target_date: string | null;
  weekly_workout_days: number | null;
  daily_workout_minutes: number | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
};

@Injectable()
export class GoalsService {
  constructor(private readonly db: DatabaseService) {}

  async create(userId: string, dto: CreateGoalDto) {
    const result = await this.db.query<GoalRow>(
      `insert into public.goals (
        user_id, goal_type, target_weight_kg, target_muscle_mass_kg,
        target_fat_mass_kg, target_date, weekly_workout_days,
        daily_workout_minutes, experience_level
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      returning *`,
      [
        userId,
        dto.goal_type,
        dto.target_weight_kg ?? null,
        dto.target_muscle_mass_kg ?? null,
        dto.target_fat_mass_kg ?? null,
        dto.target_date ?? null,
        dto.weekly_workout_days ?? null,
        dto.daily_workout_minutes ?? null,
        dto.experience_level,
      ],
    );
    return result.rows[0];
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
