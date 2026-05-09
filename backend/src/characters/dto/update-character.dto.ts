import { IsObject, IsOptional, IsInt, Min, IsString } from 'class-validator';

export class UpdateCharacterDto {
  @IsObject()
  @IsOptional()
  stats?: Record<string, number>;

  @IsInt()
  @IsOptional()
  @Min(0)
  currentHp?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  maxHp?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  ac?: number;

  @IsString()
  @IsOptional()
  backstory?: string;
}
