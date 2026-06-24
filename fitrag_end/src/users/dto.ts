import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  height_cm?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  weight_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  muscle_mass_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat_mass_kg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  body_fat_percentage?: number;

  @IsOptional()
  @IsString()
  activity_level?: string;

  @IsOptional()
  @IsString()
  injuries?: string;

  @IsOptional()
  @IsString()
  allergies?: string;

  @IsOptional()
  @IsString()
  dietary_restrictions?: string;

  @IsOptional()
  @IsString()
  food_preferences?: string;
}
