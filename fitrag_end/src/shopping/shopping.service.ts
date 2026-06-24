import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ShoppingService {
  constructor(private readonly db: DatabaseService) {}

  async getShoppingItems(userId: string, mealPlanId: string) {
    const plan = await this.db.query(
      'select id from public.meal_plans where id = $1 and user_id = $2',
      [mealPlanId, userId],
    );
    if (!plan.rowCount) {
      throw new NotFoundException('식단 계획을 찾을 수 없습니다.');
    }
    const result = await this.db.query(
      `select name, quantity, search_keyword, search_url, estimated_price
       from public.shopping_items
       where meal_plan_id = $1
       order by created_at asc`,
      [mealPlanId],
    );
    return result.rows;
  }
}
