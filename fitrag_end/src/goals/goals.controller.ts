import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CreateGoalDto } from './dto';
import { GoalsService } from './goals.service';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUser, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: CurrentUser) {
    return this.goalsService.list(user.userId);
  }

  @Get(':goalId')
  get(@CurrentUser() user: CurrentUser, @Param('goalId') goalId: string) {
    return this.goalsService.getOwnedGoal(user.userId, goalId);
  }
}
