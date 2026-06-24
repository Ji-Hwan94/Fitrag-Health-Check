import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class WorkoutRecommendationDto {
  @IsUUID()
  goal_id: string;

  @IsDateString()
  week_start_date: string;
}

export class MealRecommendationDto {
  @IsUUID()
  goal_id: string;
}

export class FullRecommendationDto {
  @IsUUID()
  goal_id: string;

  @IsOptional()
  @IsDateString()
  week_start_date?: string;
}
