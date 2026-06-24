import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AnalysisService } from './analysis.service';
import { BodyAnalysisDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Post('body')
  analyzeBody(@CurrentUser() user: CurrentUser, @Body() dto: BodyAnalysisDto) {
    return this.analysisService.analyzeBody(user.userId, dto.goal_id);
  }
}
