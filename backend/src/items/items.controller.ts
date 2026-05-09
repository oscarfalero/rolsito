import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/items')
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.itemsService.findByCampaign(campaignId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateItemDto,
    @Request() req,
  ) {
    return this.itemsService.create(campaignId, req.user.userId, dto);
  }
}

@Controller('items')
export class ItemManagementController {
  constructor(private itemsService: ItemsService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto, @Request() req) {
    return this.itemsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    return this.itemsService.remove(id, req.user.userId);
  }
}
