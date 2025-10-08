import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeController } from '@nestjs/swagger';
import { PhishingCampaignService } from '../services/phishing-campaign.service';
import { PhishingTemplateService } from '../services/phishing-template.service';

/**
 * Legacy Phishing Controller for backward compatibility
 * Redirects old /api/v1/phishing/* routes to new /api/v1/defendx-plus/* routes
 */
@ApiTags('Legacy Phishing APIs (Deprecated)')
@ApiExcludeController() // Exclude from main API documentation
@Controller('phishing')
export class LegacyPhishingController {
  constructor(
    private readonly campaignService: PhishingCampaignService,
    private readonly templateService: PhishingTemplateService
  ) {}

  /**
   * Legacy endpoint: GET /api/v1/phishing/campaigns/templates
   * New endpoint: GET /api/v1/defendx-plus/campaigns/templates
   */
  @Get('campaigns/templates')
  @ApiOperation({ 
    summary: '[DEPRECATED] Get phishing templates', 
    description: 'Use /api/v1/defendx-plus/templates instead' 
  })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiResponse({ status: 301, description: 'Permanent redirect to new endpoint' })
  async getTemplatesLegacy(@Query() query?: any) {
    // For now, directly serve the templates instead of redirecting
    // This maintains API compatibility while we migrate clients
    return this.templateService.getTemplates(null, query || {});
  }

  /**
   * Legacy endpoint: GET /api/v1/phishing/campaigns/templates/:id/preview
   * New endpoint: GET /api/v1/defendx-plus/templates/:id/preview
   */
  @Get('campaigns/templates/:templateId/preview')
  @ApiOperation({ 
    summary: '[DEPRECATED] Get template preview', 
    description: 'Use /api/v1/defendx-plus/templates/:id/preview instead' 
  })
  @ApiResponse({ status: 200, description: 'Template preview retrieved successfully' })
  async getTemplatePreviewLegacy(@Param('templateId') templateId: string) {
    return this.templateService.getTemplatePreview(templateId);
  }

  /**
   * Legacy endpoint: GET /api/v1/phishing/campaigns
   * New endpoint: GET /api/v1/defendx-plus/campaigns
   */
  @Get('campaigns')
  @ApiOperation({ 
    summary: '[DEPRECATED] Get phishing campaigns', 
    description: 'Use /api/v1/defendx-plus/campaigns instead' 
  })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async getCampaignsLegacy(@Query() query?: any) {
    // This would need proper user context in a real implementation
    // For now, return empty array to avoid errors
    return {
      campaigns: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      message: 'Please use /api/v1/defendx-plus/campaigns endpoint instead'
    };
  }
}