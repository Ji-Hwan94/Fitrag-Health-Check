import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalysisModule } from './analysis/analysis.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GoalsModule } from './goals/goals.module';
import { RagModule } from './rag/rag.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ShoppingModule } from './shopping/shopping.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    AnalysisModule,
    RecommendationsModule,
    ShoppingModule,
    RagModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
