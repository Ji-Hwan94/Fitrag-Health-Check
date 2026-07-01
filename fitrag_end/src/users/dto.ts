import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpsertProfileDto {
  @IsIn(['male', 'female'])
  gender: string;

  @IsInt()
  @Min(1)
  @Max(120)
  age: number;

  @IsNumber()
  @Min(1)
  height_cm: number;

  @IsNumber()
  @Min(1)
  weight_kg: number;

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

  @IsString()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  activity_level: string;

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

  @IsOptional()
  @IsString()
  medical_notes?: string;
}
