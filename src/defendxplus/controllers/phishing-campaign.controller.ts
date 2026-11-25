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
  Patch,
  Res,
  Req,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { PhishingCampaignService } from '../services/phishing-campaign.service';
import { HealthCheckService } from '../services/health-check.service';
import { CampaignSchedulerService } from '../services/campaign-scheduler.service';
import { 
  CreateCampaignDto, 
  UpdateCampaignDto, 
  CampaignQueryDto,
  LaunchCampaignDto,
  BulkTargetsDto,
  CampaignAnalyticsDto,
  CampaignExportDto,
  CampaignWebhookDto
} from '../dto/phishing-campaign.dto';

// Local enum definitions (temporary until Prisma client is properly generated)
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  CSA_ADMIN = 'CSA_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  ORG_MANAGER = 'ORG_MANAGER',
  END_USER = 'END_USER'
}

enum PhishingEventType {
  EMAIL_SENT = 'EMAIL_SENT',
  EMAIL_DELIVERED = 'EMAIL_DELIVERED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  LINK_CLICKED = 'LINK_CLICKED',
  CREDENTIALS_ENTERED = 'CREDENTIALS_ENTERED',
  PHISHING_REPORTED = 'PHISHING_REPORTED',
  EMAIL_BOUNCED = 'EMAIL_BOUNCED'
}

@ApiTags('Phishing Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defendx-plus/campaigns')
export class PhishingCampaignController {
  private readonly logger = new Logger(PhishingCampaignController.name);

  constructor(
    private readonly campaignService: PhishingCampaignService,
    private readonly healthCheckService: HealthCheckService,
    private readonly campaignScheduler: CampaignSchedulerService
  ) {}

  /**
   * Campaign CRUD Operations
   */

  @Post()
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Create a new phishing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation errors' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createCampaign(
    @GetUser() user: any,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignService.createCampaign(
      user.organizationId, 
      user.userId, 
      createCampaignDto
    );
  }

  @Get()
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get all campaigns for organization' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async getCampaigns(
    @GetUser() user: any,
    @Query() query: CampaignQueryDto
  ) {
    return this.campaignService.getCampaigns(user.organizationId, query);
  }

  @Get(':campaignId')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignById(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.getCampaignById(user.organizationId, campaignId);
  }

  @Put(':campaignId')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot update running campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async updateCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() updateCampaignDto: UpdateCampaignDto
  ) {
    return this.campaignService.updateCampaign(
      user.organizationId, 
      campaignId, 
      updateCampaignDto
    );
  }

  @Delete(':campaignId')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete running campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async deleteCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.deleteCampaign(user.organizationId, campaignId);
  }

  /**
   * Campaign Launch & Control
   */

  @Post(':campaignId/launch')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Launch a phishing campaign' })
  @ApiResponse({ status: 200, description: 'Campaign launched successfully' })
  @ApiResponse({ status: 400, description: 'Campaign cannot be launched' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async launchCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() launchDto: LaunchCampaignDto
  ) {
    return this.campaignService.launchCampaign(
      user.organizationId, 
      campaignId, 
      launchDto
    );
  }

  @Patch(':campaignId/pause')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Pause a running campaign' })
  @ApiResponse({ status: 200, description: 'Campaign paused successfully' })
  @ApiResponse({ status: 400, description: 'Can only pause running campaigns' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async pauseCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.pauseCampaign(user.organizationId, campaignId);
  }

  @Patch(':campaignId/resume')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Resume a paused campaign' })
  @ApiResponse({ status: 200, description: 'Campaign resumed successfully' })
  @ApiResponse({ status: 400, description: 'Can only resume paused campaigns' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async resumeCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.resumeCampaign(user.organizationId, campaignId);
  }

  @Patch(':campaignId/complete')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Mark campaign as completed' })
  @ApiResponse({ status: 200, description: 'Campaign completed successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async completeCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.completeCampaign(user.organizationId, campaignId);
  }

  @Post(':campaignId/schedule')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Schedule a campaign to run at a future time' })
  @ApiResponse({ status: 201, description: 'Campaign scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid scheduledAt or campaign already scheduled' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async scheduleCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() dto: LaunchCampaignDto
  ) {
    return this.campaignScheduler.scheduleCampaign(
      user.organizationId,
      campaignId,
      dto
    );
  }

  /**
   * Target Management
   */

  @Post(':campaignId/targets')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Add targets to campaign' })
  @ApiResponse({ status: 201, description: 'Targets added successfully' })
  @ApiResponse({ status: 400, description: 'Cannot add targets to running campaign' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async addTargets(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() bulkTargetsDto: BulkTargetsDto
  ) {
    return this.campaignService.addTargets(
      user.organizationId, 
      campaignId, 
      bulkTargetsDto
    );
  }

  @Delete(':campaignId/targets/:targetId')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Remove target from campaign' })
  @ApiResponse({ status: 200, description: 'Target removed successfully' })
  @ApiResponse({ status: 400, description: 'Cannot remove targets from running campaign' })
  @ApiResponse({ status: 404, description: 'Target not found' })
  async removeTarget(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Param('targetId') targetId: string
  ) {
    return this.campaignService.removeTarget(
      user.organizationId, 
      campaignId, 
      targetId
    );
  }

  @Get(':campaignId/targets/search')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Search targets in campaign' })
  @ApiResponse({ status: 200, description: 'Targets found' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  async searchTargets(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Query('q') query: string
  ) {
    return this.campaignService.searchTargets(
      user.organizationId, 
      campaignId, 
      query
    );
  }

  /**
   * Analytics & Reporting
   */

  @Get(':campaignId/analytics')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get comprehensive campaign analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully', type: CampaignAnalyticsDto })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getCampaignAnalytics(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ): Promise<CampaignAnalyticsDto> {
    return this.campaignService.getCampaignAnalytics(
      user.organizationId, 
      campaignId
    );
  }

  @Get(':campaignId/live-stats')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get real-time campaign statistics' })
  @ApiResponse({ status: 200, description: 'Live stats retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async getLiveStats(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string
  ) {
    return this.campaignService.getLiveStats(user.organizationId, campaignId);
  }

  @Post(':campaignId/export')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Export campaign data' })
  @ApiResponse({ status: 200, description: 'Export file generated successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async exportCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() exportDto: CampaignExportDto,
  ) {
    // This would be implemented to generate CSV/PDF exports
    // For now, return a placeholder
    return {
      message: 'Export functionality will be implemented',
      exportType: exportDto.format,
      campaignId
    };
  }

  /**
   * Email Tracking Endpoints (Public - No Auth Required)
   */

  @Get('track/open/:campaignId/:targetId')
  @Public() // Loaded by the target's mail client
  @ApiOperation({ summary: 'Track email open (pixel tracking)' })
  @ApiResponse({ status: 200, description: 'Email open tracked' })
  async trackEmailOpen(
    @Param('campaignId') campaignId: string,
    @Param('targetId') targetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.campaignService.trackEmailEvent(
        campaignId,
        targetId,
        PhishingEventType.EMAIL_OPENED,
        this.requestMetadata(req),
      );
    } catch (error) {
      this.logger.warn(`Open tracking failed for campaign ${campaignId}: ${error.message}`);
    }

    // Always return the 1x1 pixel, even when tracking fails
    const pixel = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Length': String(pixel.length),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pixel);
  }

  @Get('track/click/:campaignId/:targetId')
  @Public() // Followed from the target's email
  @ApiOperation({ summary: 'Track link click and redirect to the campaign landing page' })
  @ApiResponse({ status: 302, description: 'Redirect to landing page' })
  async trackLinkClick(
    @Param('campaignId') campaignId: string,
    @Param('targetId') targetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Redirect target comes from the campaign, never from the query string (open redirect)
    const redirectUrl = await this.campaignService.getLandingRedirectUrl(campaignId, targetId);

    try {
      await this.campaignService.trackEmailEvent(
        campaignId,
        targetId,
        PhishingEventType.LINK_CLICKED,
        { ...this.requestMetadata(req), redirectUrl },
      );
    } catch (error) {
      this.logger.warn(`Click tracking failed for campaign ${campaignId}: ${error.message}`);
    }

    return res.redirect(302, redirectUrl);
  }

  @Post('track/credentials/:campaignId/:targetId')
  @Public() // Submitted from the phishing landing page
  @ApiOperation({ summary: 'Track credential submission' })
  @ApiResponse({ status: 200, description: 'Credentials tracked' })
  async trackCredentials(
    @Param('campaignId') campaignId: string,
    @Param('targetId') targetId: string,
    @Body() credentialsData: any,
    @Req() req: Request,
  ) {
    const { userAgent, ipAddress } = this.requestMetadata(req);
    credentialsData = credentialsData || {};
    // Track the credential submission event
    await this.campaignService.trackEmailEvent(
      campaignId, 
      targetId, 
      PhishingEventType.CREDENTIALS_ENTERED,
      { 
        userAgent, 
        ipAddress,
        submittedFields: Object.keys(credentialsData),
        // Don't store actual credentials for security
        hasPassword: !!credentialsData.password,
        hasUsername: !!credentialsData.username || !!credentialsData.email
      }
    );

    return {
      success: true,
      message: 'Thank you. Your credentials have been verified.',
      // This would typically redirect to a success page or the real login
      redirectUrl: '/login-success'
    };
  }

  @Post('track/report/:campaignId/:targetId')
  @Public() // Reported from the target's mail client or report button
  @ApiOperation({ summary: 'Track phishing report' })
  @ApiResponse({ status: 200, description: 'Report tracked' })
  async trackPhishingReport(
    @Param('campaignId') campaignId: string,
    @Param('targetId') targetId: string,
    @Body() reportData: any,
    @Req() req: Request,
  ) {
    const { userAgent, ipAddress } = this.requestMetadata(req);
    reportData = reportData || {};
    // Track the phishing report event
    await this.campaignService.trackEmailEvent(
      campaignId, 
      targetId, 
      PhishingEventType.PHISHING_REPORTED,
      { 
        userAgent, 
        ipAddress,
        reportMethod: reportData.method || 'manual',
        reportSource: reportData.source || 'email_client'
      }
    );

    return {
      success: true,
      message: 'Thank you for reporting this suspicious email. Your security awareness is appreciated!'
    };
  }

  /**
   * Webhook Management
   */

  @Post(':campaignId/webhooks')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Configure campaign webhooks' })
  @ApiResponse({ status: 201, description: 'Webhook configured successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async configureWebhook(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() webhookDto: CampaignWebhookDto
  ) {
    // Webhook configuration would be implemented here
    return {
      message: 'Webhook configuration will be implemented',
      campaignId,
      webhook: webhookDto
    };
  }

  /**
   * Bulk Operations
   */

  @Post(':campaignId/clone')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Clone an existing campaign' })
  @ApiResponse({ status: 201, description: 'Campaign cloned successfully' })
  @ApiResponse({ status: 404, description: 'Campaign not found' })
  async cloneCampaign(
    @GetUser() user: any,
    @Param('campaignId') campaignId: string,
    @Body() cloneData: { name: string; description?: string }
  ) {
    // Campaign cloning would be implemented here
    return {
      message: 'Campaign cloning will be implemented',
      originalCampaignId: campaignId,
      newCampaignName: cloneData.name
    };
  }

  @Post('bulk-actions')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Perform bulk actions on campaigns' })
  @ApiResponse({ status: 200, description: 'Bulk actions completed' })
  async bulkActions(
    @GetUser() user: any,
    @Body() bulkData: {
      campaignIds: string[];
      action: 'pause' | 'resume' | 'complete' | 'delete';
    }
  ) {
    // Bulk actions would be implemented here
    return {
      message: 'Bulk actions will be implemented',
      action: bulkData.action,
      campaignCount: bulkData.campaignIds.length
    };
  }

  /**
   * Template Integration
   */

  @Get('templates')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get available phishing templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(
    @GetUser() user: any,
    @Query('category') category?: string,
    @Query('riskLevel') riskLevel?: string
  ) {
    // Template retrieval would be implemented here
    return {
      message: 'Template system will be implemented',
      filters: { category, riskLevel }
    };
  }

  @Get('templates/:templateId/preview')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Preview a phishing template' })
  @ApiResponse({ status: 200, description: 'Template preview retrieved' })
  async previewTemplate(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ) {
    // Template preview would be implemented here
    return {
      message: 'Template preview will be implemented',
      templateId
    };
  }

  /**
   * Health Check & System Monitoring
   */

  @Get('system/health')
  @Roles(UserRole.ORG_ADMIN, UserRole.CSA_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get comprehensive system health check' })
  @ApiResponse({ status: 200, description: 'Health check completed successfully' })
  async getHealthCheck() {
    return this.healthCheckService.performHealthCheck();
  }

  @Get('system/health/quick')
  @ApiOperation({ summary: 'Get quick health status (lightweight)' })
  @ApiResponse({ status: 200, description: 'Quick health check completed' })
  async getQuickHealthCheck() {
    return this.healthCheckService.quickHealthCheck();
  }

  private requestMetadata(req: Request) {
    return {
      userAgent: req.headers['user-agent'] || undefined,
      ipAddress: req.ip,
    };
  }
}
