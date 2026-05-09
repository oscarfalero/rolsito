import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateSceneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'])
  type: string;
}
