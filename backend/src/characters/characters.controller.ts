import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/characters')
export class CharactersController {
  constructor(private charactersService: CharactersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateCharacterDto,
    @Request() req,
  ) {
    return this.charactersService.create(req.user.userId, campaignId, dto);
  }

  @Get()
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.charactersService.findByCampaign(campaignId);
  }
}

@Controller('characters')
export class CharacterManagementController {
  constructor(private charactersService: CharactersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
    @Request() req,
  ) {
    const character = await this.charactersService.findOne(id);
    const isDm = character.campaign.createdById === req.user.userId;
    return this.charactersService.update(id, req.user.userId, dto, isDm);
  }
}
