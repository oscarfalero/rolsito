import { IsString, IsInt, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  itemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
