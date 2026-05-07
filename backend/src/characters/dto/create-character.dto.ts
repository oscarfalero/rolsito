import { IsString, IsOptional, IsJSON } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  race?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsOptional()
  stats?: Record<string, any>;

  @IsString()
  @IsOptional()
  backstory?: string;
}
