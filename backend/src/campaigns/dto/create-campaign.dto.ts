import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  systemPrompt: string;

  @IsInt()
  @Min(2)
  @IsOptional()
  maxPlayers?: number;
}
