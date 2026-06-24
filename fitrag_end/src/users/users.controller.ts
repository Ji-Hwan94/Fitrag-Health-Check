import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { UpsertProfileDto } from './dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  me(@CurrentUser() user: CurrentUser) {
    return this.usersService.getMe(user.userId);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Put('profile')
  upsertProfile(
    @CurrentUser() user: CurrentUser,
    @Body() dto: UpsertProfileDto,
  ) {
    return this.usersService.upsertProfile(user.userId, dto);
  }
}
