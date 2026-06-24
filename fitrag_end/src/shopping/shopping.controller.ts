import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ShoppingService } from './shopping.service';

@UseGuards(JwtAuthGuard)
@Controller('meal-plans')
export class ShoppingController {
  constructor(private readonly shopping: ShoppingService) {}

  @Get(':mealPlanId/shopping-items')
  getItems(@CurrentUser() user: CurrentUser, @Param('mealPlanId') mealPlanId: string) {
    return this.shopping.getShoppingItems(user.userId, mealPlanId);
  }
}
