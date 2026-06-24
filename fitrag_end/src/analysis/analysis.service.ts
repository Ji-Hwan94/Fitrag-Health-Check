import { Injectable } from '@nestjs/common';
import { GoalsService } from '../goals/goals.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AnalysisService {
  constructor(
    private readonly goals: GoalsService,
    private readonly users: UsersService,
  ) {}

  async analyzeBody(userId: string, goalId: string) {
    const [goal, profile] = await Promise.all([
      this.goals.getOwnedGoal(userId, goalId),
      this.users.getProfile(userId),
    ]);

    const heightCm = Number(profile.height_cm);
    const currentWeight = Number(profile.weight_kg);
    const targetWeight = goal.target_weight_kg
      ? Number(goal.target_weight_kg)
      : currentWeight;
    const bmi = Number((currentWeight / (heightCm / 100) ** 2).toFixed(1));
    const weightChangeKg = Number((targetWeight - currentWeight).toFixed(1));
    const absChange = Math.abs(weightChangeKg);
    const weeklyChange = goal.goal_type === 'weight_gain' ? 0.25 : 0.5;
    const estimatedDurationWeeks = Math.max(1, Math.ceil(absChange / weeklyChange));

    const riskFlags: string[] = [];
    if (profile.injuries) riskFlags.push(`${profile.injuries} 확인 필요`);
    if (goal.weekly_workout_days && goal.weekly_workout_days >= 6) {
      riskFlags.push('주 6회 이상 운동 계획은 회복일 관리가 필요합니다.');
    }
    if (absChange > 10 && estimatedDurationWeeks < 12) {
      riskFlags.push('목표 변화량이 커서 기간을 보수적으로 조정하는 것이 좋습니다.');
    }

    const direction =
      weightChangeKg < 0 ? '감량' : weightChangeKg > 0 ? '증량' : '유지';

    return {
      bmi,
      weight_change_kg: weightChangeKg,
      recommended_weekly_change_kg:
        direction === '증량' ? '0.25~0.5' : '0.25~0.75',
      estimated_duration_weeks: estimatedDurationWeeks,
      risk_flags: riskFlags,
      summary: `${direction} 목표에는 완만한 변화 속도와 회복일을 포함한 전략이 적합합니다.`,
    };
  }
}
