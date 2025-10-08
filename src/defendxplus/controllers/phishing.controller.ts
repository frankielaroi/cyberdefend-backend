import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { PhishingService } from '../services/phishing.service';
import { CreateCampaignDto, LaunchCampaignDto, UpdateCampaignDto } from '../dto/phishing.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('defendxplus-phishing')
@Controller('defendx-plus/campaign')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PhishingController {
  constructor(private phishingService: PhishingService) {}

  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('create')
  @ApiOperation({ summary: 'Create a new phishing campaign (define name, template, target list)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createCampaign(
    @GetUser() user: any,
    @Body() createCampaignDto: CreateCampaignDto,
  ) {
    const userId = user.id;
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    return this.phishingService.createCampaign(userId, organizationId, createCampaignDto);
  }

  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Launch a campaign immediately or schedule for later' })
  @ApiResponse({ status: 200, description: 'Campaign launched successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async launchCampaign(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() launchCampaignDto: LaunchCampaignDto,
  ) {
    return this.phishingService.launchCampaign(userId, organizationId, launchCampaignDto);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Fetch campaign results and analytics (delivery, clicks, reports)' })
  @ApiResponse({ status: 200, description: 'Campaign results retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async getCampaignResults(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Param('id') campaignId: string,
  ) {
    return this.phishingService.getCampaignResults(userId, organizationId, campaignId);
  }


    
  

  @Get()
  @ApiOperation({ summary: 'List all campaigns for the organization' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by campaign status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getCampaigns(
    @GetUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const organizationId = user.organizationId;
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.phishingService.getCampaigns(organizationId, status, pageNum, limitNum);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update campaign configuration' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async updateCampaign(
    @GetUser() user: any,
    @Param('id') campaignId: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    const userId = user.id;
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    return this.phishingService.updateCampaign(userId, organizationId, campaignId, updateCampaignDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  @ApiParam({ name: 'id', description: 'Campaign ID' })
  async deleteCampaign(
    @GetUser() user: any,
    @Param('id') campaignId: string,
  ) {
    const userId = user.id;
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    return this.phishingService.deleteCampaign(userId, organizationId, campaignId);
  }
}