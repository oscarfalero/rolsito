import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('characters/:characterId/inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCharacter(@Param('characterId') characterId: string) {
    return this.inventoryService.findByCharacter(characterId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async addItem(
    @Param('characterId') characterId: string,
    @Body() dto: CreateInventoryDto,
    @Request() req,
  ) {
    return this.inventoryService.addItem(characterId, req.user.userId, dto);
  }

  @Patch(':itemId')
  @UseGuards(JwtAuthGuard)
  async updateQuantity(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInventoryDto,
    @Request() req,
  ) {
    return this.inventoryService.updateQuantity(characterId, itemId, req.user.userId, dto);
  }

  @Delete(':itemId')
  @UseGuards(JwtAuthGuard)
  async removeItem(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.inventoryService.removeItem(characterId, itemId, req.user.userId);
  }
}
