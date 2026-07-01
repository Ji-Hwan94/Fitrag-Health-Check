import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateRagDocumentDto {
  @IsString()
  source: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsUrl()
  source_url?: string;

  @IsString()
  text: string;
}

export class RagSearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  use_case?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  top_k?: number;
}
