import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import {
  FullRecommendationDto,
  MealRecommendationDto,
  WorkoutRecommendationDto,
} from './dto';
import { RecommendationsService } from './recommendations.service';

@UseGuards(JwtAuthGuard)
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post('workout')
  workout(@CurrentUser() user: CurrentUser, @Body() dto: WorkoutRecommendationDto) {
    return this.recommendations.createWorkoutPlan(
      user.userId,
      dto.goal_id,
      dto.week_start_date,
    );
  }

  @Post('meal')
  meal(@CurrentUser() user: CurrentUser, @Body() dto: MealRecommendationDto) {
    return this.recommendations.createMealPlan(user.userId, dto.goal_id);
  }

  @Post('full')
  full(@CurrentUser() user: CurrentUser, @Body() dto: FullRecommendationDto) {
    return this.recommendations.createFullRecommendation(
      user.userId,
      dto.goal_id,
      dto.week_start_date,
    );
  }

  @Get(':recommendationId/evidence')
  evidence(@Param('recommendationId') recommendationId: string) {
    return this.recommendations.getEvidence(recommendationId);
  }
}
