import { IsUUID } from 'class-validator';

export class BodyAnalysisDto {
  @IsUUID()
  goal_id: string;
}
