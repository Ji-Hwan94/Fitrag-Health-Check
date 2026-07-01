import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpsertProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async getMe(userId: string) {
    const user = await this.db.query(
      'select id, email, name, created_at, updated_at from public.users where id = $1',
      [userId],
    );
    if (!user.rowCount) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    const profile = await this.getProfile(userId).catch(() => null);
    return { ...user.rows[0], profile };
  }

  async getProfile(userId: string) {
    const result = await this.db.query(
      'select * from public.health_profiles where user_id = $1',
      [userId],
    );
    if (!result.rowCount) {
      throw new NotFoundException({
        code: 'PROFILE_REQUIRED',
        message: '신체 프로필이 필요합니다.',
      });
    }
    return result.rows[0];
  }

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    const bodyEstimate = this.estimateBodyComposition(dto);
    const bmi = Number((dto.weight_kg / (dto.height_cm / 100) ** 2).toFixed(2));

    const result = await this.db.query(
      `insert into public.health_profiles (
        user_id, gender, age, height_cm, weight_kg, muscle_mass_kg,
        fat_mass_kg, body_fat_percentage, bmi, activity_level, injuries,
        allergies, dietary_restrictions, food_preferences, medical_notes
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      on conflict (user_id) do update set
        gender = excluded.gender,
        age = excluded.age,
        height_cm = excluded.height_cm,
        weight_kg = excluded.weight_kg,
        muscle_mass_kg = excluded.muscle_mass_kg,
        fat_mass_kg = excluded.fat_mass_kg,
        body_fat_percentage = excluded.body_fat_percentage,
        bmi = coalesce(excluded.bmi, public.health_profiles.bmi),
        activity_level = excluded.activity_level,
        injuries = excluded.injuries,
        allergies = excluded.allergies,
        dietary_restrictions = excluded.dietary_restrictions,
        food_preferences = excluded.food_preferences,
        medical_notes = excluded.medical_notes
      returning *`,
      [
        userId,
        dto.gender,
        dto.age,
        dto.height_cm,
        dto.weight_kg,
        dto.muscle_mass_kg && dto.muscle_mass_kg > 0
          ? dto.muscle_mass_kg
          : bodyEstimate.muscleMassKg,
        dto.fat_mass_kg && dto.fat_mass_kg > 0
          ? dto.fat_mass_kg
          : bodyEstimate.fatMassKg,
        dto.body_fat_percentage && dto.body_fat_percentage > 0
          ? dto.body_fat_percentage
          : bodyEstimate.bodyFatPercentage,
        bmi,
        dto.activity_level,
        dto.injuries ?? null,
        dto.allergies ?? null,
        dto.dietary_restrictions ?? null,
        dto.food_preferences ?? null,
        dto.medical_notes ?? null,
      ],
    );

    return result.rows[0];
  }

  private estimateBodyComposition(dto: UpsertProfileDto) {
    const bmi = dto.weight_kg / (dto.height_cm / 100) ** 2;
    const sexOffset = dto.gender === 'male' ? 10.8 : 0;
    const minBodyFat = dto.gender === 'male' ? 8 : 18;
    const maxBodyFat = dto.gender === 'male' ? 35 : 45;
    const bodyFatPercentage = Number(
      Math.max(
        minBodyFat,
        Math.min(maxBodyFat, 1.2 * bmi + 0.23 * dto.age - sexOffset - 5.4),
      ).toFixed(1),
    );
    const fatMassKg = Number(
      ((dto.weight_kg * bodyFatPercentage) / 100).toFixed(1),
    );
    const leanMassKg = dto.weight_kg - fatMassKg;
    const muscleMassRatio = dto.gender === 'male' ? 0.55 : 0.5;
    const muscleMassKg = Number((leanMassKg * muscleMassRatio).toFixed(1));

    return { bodyFatPercentage, fatMassKg, muscleMassKg };
  }
}
