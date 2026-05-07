import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns')
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createCampaignDto: CreateCampaignDto, @Request() req) {
    return this.campaignsService.create(req.user.userId, createCampaignDto);
  }

  @Get()
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyCampaigns(@Request() req) {
    return this.campaignsService.findByUser(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async join(@Param('id') id: string, @Request() req) {
    return this.campaignsService.join(id, req.user.userId);
  }
}
