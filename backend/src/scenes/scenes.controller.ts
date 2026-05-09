import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ScenesService } from './scenes.service';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('campaigns/:campaignId/scenes')
export class ScenesController {
  constructor(private scenesService: ScenesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findByCampaign(@Param('campaignId') campaignId: string) {
    return this.scenesService.findByCampaign(campaignId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('campaignId') campaignId: string,
    @Body() dto: CreateSceneDto,
    @Request() req,
  ) {
    return this.scenesService.create(campaignId, req.user.userId, dto);
  }

  @Post(':sceneId/activate')
  @UseGuards(JwtAuthGuard)
  async activate(
    @Param('campaignId') campaignId: string,
    @Param('sceneId') sceneId: string,
    @Request() req,
  ) {
    return this.scenesService.setCurrentScene(campaignId, sceneId, req.user.userId);
  }
}

@Controller('scenes')
export class SceneManagementController {
  constructor(private scenesService: ScenesService) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateSceneDto, @Request() req) {
    return this.scenesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    return this.scenesService.remove(id, req.user.userId);
  }
}
