import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
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
