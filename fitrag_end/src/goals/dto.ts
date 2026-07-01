import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export const goalTypes = [
  'fat_loss',
  'muscle_gain',
  'weight_gain',
  'body_recomposition',
  'performance',
] as const;

export const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;

export type GoalType = (typeof goalTypes)[number];
export type ExperienceLevel = (typeof experienceLevels)[number];

export class CreateGoalDto {
  @IsIn(goalTypes)
  goal_type: GoalType;

  @IsNumber()
  @Min(1)
  target_weight_kg: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  target_muscle_mass_kg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  target_fat_mass_kg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  target_body_fat_percentage?: number | null;

  @IsDateString()
  target_date: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weekly_workout_days?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  daily_workout_minutes?: number | null;

  @IsIn(experienceLevels)
  experience_level: ExperienceLevel;
}
