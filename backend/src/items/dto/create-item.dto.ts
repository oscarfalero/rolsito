import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['weapon', 'armor', 'consumable', 'misc'])
  type: string;
}
