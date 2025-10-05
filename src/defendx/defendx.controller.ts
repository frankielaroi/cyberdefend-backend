import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { DefendxService } from './defendx.service';
import { AssessmentService } from './services/assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { BulkSubmitResponseDto } from './dto/bulk-submit-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('defendx')
@Controller('defendx')
export class DefendxController {
  constructor(
    private defendxService: DefendxService,
    private assessmentService: AssessmentService,
  ) {}

  // Public CSI Directory Endpoints
  @Public()
  @Get('csi-directory')
  @ApiOperation({ summary: 'Get public CSI directory' })
  @ApiResponse({ status: 200, description: 'Directory retrieved successfully' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getPublicDirectory(
    @Query('region') region?: string,
    @Query('sector') sector?: string,
    @Query('size') size?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.defendxService.getPublicDirectory(region, sector, size, page, limit);
  }

  @Public()
  @Get('stats/regional')
  @ApiOperation({ summary: 'Get regional cybersecurity statistics' })
  @ApiResponse({ status: 200, description: 'Regional stats retrieved successfully' })
  async getRegionalStats() {
    return this.defendxService.getRegionalStats();
  }

  @Public()
  @Get('stats/sectoral')
  @ApiOperation({ summary: 'Get sectoral cybersecurity statistics' })
  @ApiResponse({ status: 200, description: 'Sectoral stats retrieved successfully' })
  async getSectorStats() {
    return this.defendxService.getSectorStats();
  }

  // CSI Assessment Endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization dashboard overview with CSI stats and recent assessments' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.assessmentService.getDashboardStats(userId, organizationId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('csi/start')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize a new cybersecurity readiness assessment for an organization' })
  @ApiResponse({ status: 201, description: 'Assessment started successfully' })
  @ApiResponse({ status: 403, description: 'Access denied or assessment already in progress' })
  async startCSIAssessment(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    return this.assessmentService.startAssessment(userId, organizationId, createAssessmentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('csi/submit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit completed assessment answers and trigger score computation' })
  @ApiResponse({ status: 200, description: 'Assessment submitted and scored successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async submitCSIAssessment(
    @GetUser('userId') userId: string,
    @Body() bulkSubmitDto: BulkSubmitResponseDto,
  ) {
    return this.assessmentService.submitBulkResponse(userId, bulkSubmitDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('assessments/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete and calculate assessment score' })
  @ApiResponse({ status: 200, description: 'Assessment completed successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async completeAssessment(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
  ) {
    return this.assessmentService.completeAssessment(userId, assessmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('csi/result/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve detailed assessment results and report by ID (PDF/HTML/JSON)' })
  @ApiResponse({ status: 200, description: 'Assessment results retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Response format (json, pdf, html)', enum: ['json', 'pdf', 'html'] })
  async getCSIAssessmentResult(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
    @Query('format') format: 'json' | 'pdf' | 'html' = 'json',
  ) {
    // TODO: Add format parameter support to assessment service
    return this.assessmentService.getAssessmentResult(userId, assessmentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/current-org/assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user organization assessment history' })
  @ApiResponse({ status: 200, description: 'Assessment history retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getCurrentOrganizationAssessments(
    @GetUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.id;
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.assessmentService.getOrganizationAssessments(userId, organizationId, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:id/assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization assessment history' })
  @ApiResponse({ status: 200, description: 'Assessment history retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getOrganizationAssessments(
    @GetUser() user: any,
    @Param('id') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = user.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    
    return this.assessmentService.getOrganizationAssessments(userId, orgId, pageNum, limitNum);
  }
}