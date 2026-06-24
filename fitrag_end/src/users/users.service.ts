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
    const bmi =
      dto.height_cm && dto.weight_kg
        ? Number((dto.weight_kg / (dto.height_cm / 100) ** 2).toFixed(2))
        : undefined;

    const result = await this.db.query(
      `insert into public.health_profiles (
        user_id, gender, age, height_cm, weight_kg, muscle_mass_kg,
        fat_mass_kg, body_fat_percentage, bmi, activity_level, injuries,
        allergies, dietary_restrictions, food_preferences
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
        food_preferences = excluded.food_preferences
      returning *`,
      [
        userId,
        dto.gender ?? null,
        dto.age ?? null,
        dto.height_cm ?? null,
        dto.weight_kg ?? null,
        dto.muscle_mass_kg ?? null,
        dto.fat_mass_kg ?? null,
        dto.body_fat_percentage ?? null,
        bmi ?? null,
        dto.activity_level ?? null,
        dto.injuries ?? null,
        dto.allergies ?? null,
        dto.dietary_restrictions ?? null,
        dto.food_preferences ?? null,
      ],
    );

    return result.rows[0];
  }
}
