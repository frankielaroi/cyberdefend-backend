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
import { ComprehensiveReportService } from './services/comprehensive-report.service';
import {
  CreateAssessmentDto,
  BulkSubmitResponseDto,
  SingleResponseDto,
  AssessmentQueryDto,
  ReportQueryDto,
  CSIDirectoryQueryDto,
  CreateAnonymousAssessmentDto,
  BulkAnonymousResponseDto,
  CompleteAnonymousAssessmentDto,
  TransferAnonymousAssessmentDto,
} from './dto/assessment.dto';
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
    private comprehensiveReportService: ComprehensiveReportService,
  ) {}

  // Public CSI Directory Endpoints
  @Public()
  @Get('csi-directory')
  @ApiOperation({ summary: 'Get public CSI directory with filtering and benchmarking' })
  @ApiResponse({ status: 200, description: 'Directory retrieved successfully' })
  async getPublicDirectory(@Query() query: CSIDirectoryQueryDto) {
    return this.assessmentService.getCSIDirectory(query);
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

  // Assessment Management Endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiResponse({ status: 201, description: 'Assessment created successfully' })
  @ApiResponse({ status: 403, description: 'Access denied or assessment already exists' })
  async createAssessment(
    @GetUser('userId') userId: string,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    return this.assessmentService.createAssessment(userId, createAssessmentDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organization assessments with pagination' })
  @ApiResponse({ status: 200, description: 'Organization assessments retrieved successfully' })
  async getAssessments(
    @GetUser('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.assessmentService.getOrganizationAssessments(userId, { page, limit });
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assessment by ID' })
  @ApiResponse({ status: 200, description: 'Assessment retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async getAssessment(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.assessmentService.getAssessment(id, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('assessments/:id/start')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start an assessment (change from DRAFT to IN_PROGRESS)' })
  @ApiResponse({ status: 200, description: 'Assessment started successfully' })
  @ApiResponse({ status: 400, description: 'Assessment already started' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async startAssessment(
    @GetUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.assessmentService.startAssessment(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('assessments/:id/responses')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a single assessment response' })
  @ApiResponse({ status: 200, description: 'Response submitted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment or question not found' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async submitResponse(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
    @Body() submitResponseDto: SingleResponseDto,
  ) {
    return this.assessmentService.submitResponse(assessmentId, userId, submitResponseDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('assessments/:id/responses/bulk')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit multiple assessment responses in bulk' })
  @ApiResponse({ status: 200, description: 'Responses submitted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async bulkSubmitResponses(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
    @Body() bulkSubmitDto: BulkSubmitResponseDto,
  ) {
    return this.assessmentService.bulkSubmitResponses(assessmentId, userId, bulkSubmitDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('assessments/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete assessment and generate results' })
  @ApiResponse({ status: 200, description: 'Assessment completed successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async completeAssessment(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
  ) {
    return this.assessmentService.completeAssessment(assessmentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/:id/report')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate assessment report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 400, description: 'Assessment not completed' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async generateReport(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.assessmentService.generateReport(assessmentId, userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/:id/report/comprehensive')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate comprehensive assessment report',
    description: 'Generate detailed report with recommendations, vulnerabilities, benchmarking, and compliance mapping'
  })
  @ApiResponse({ status: 200, description: 'Comprehensive report generated successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 400, description: 'Assessment not completed' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async generateComprehensiveReport(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
  ) {
    return this.comprehensiveReportService.generateAssessmentReport(assessmentId);
  }

  // Anonymous Assessment Endpoints
  @Public()
  @Post('assessments/anonymous')
  @ApiOperation({ summary: 'Create a new anonymous assessment session' })
  @ApiResponse({ status: 201, description: 'Anonymous assessment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid session ID or assessment already exists' })
  async createAnonymousAssessment(@Body() dto: CreateAnonymousAssessmentDto) {
    return this.assessmentService.createAnonymousAssessment(dto);
  }

  @Public()
  @Get('assessments/anonymous/check/:sessionId')
  @ApiOperation({ summary: 'Check if anonymous assessment session exists' })
  @ApiResponse({ status: 200, description: 'Session check result' })
  @ApiParam({ name: 'sessionId', description: 'Session ID to check' })
  async checkAnonymousSession(@Param('sessionId') sessionId: string) {
    return this.assessmentService.checkAnonymousSessionExists(sessionId);
  }

  @Public()
  @Get('questions')
  @ApiOperation({ summary: 'Get all active assessment questions (public for anonymous assessments)' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category ID' })
  async getQuestions(@Query('categoryId') categoryId?: string) {
    return this.assessmentService.getQuestionsForAssessment(categoryId);
  }

  @Public()
  @Get('questions/categories')
  @ApiOperation({ summary: 'Get all question categories (public)' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getQuestionCategories() {
    return this.assessmentService.getQuestionCategories();
  }

  @Public()
  @Post('assessments/:id/responses/bulk/anonymous')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit multiple responses for anonymous assessment' })
  @ApiResponse({ status: 200, description: 'Responses submitted successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Invalid session ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async bulkSubmitAnonymousResponses(
    @Param('id') assessmentId: string,
    @Body() dto: BulkAnonymousResponseDto,
  ) {
    return this.assessmentService.bulkSubmitAnonymousResponses(assessmentId, dto);
  }

  @Public()
  @Post('assessments/:id/complete/anonymous')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete anonymous assessment and generate results' })
  @ApiResponse({ status: 200, description: 'Assessment completed successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Invalid session ID' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  async completeAnonymousAssessment(
    @Param('id') assessmentId: string,
    @Body() dto: CompleteAnonymousAssessmentDto,
  ) {
    return this.assessmentService.completeAnonymousAssessment(assessmentId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('assessments/transfer')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Transfer anonymous assessment to authenticated user' })
  @ApiResponse({ status: 200, description: 'Assessment transferred successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Assessment already transferred or expired' })
  async transferAnonymousAssessment(
    @GetUser('userId') userId: string,
    @Body() dto: TransferAnonymousAssessmentDto,
  ) {
    return this.assessmentService.transferAnonymousAssessment(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('assessments/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get assessment statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getAssessmentStats(
    @GetUser('userId') userId: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.assessmentService.getAssessmentStats(organizationId);
  }

  // Legacy/Dashboard Endpoints for backward compatibility
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
  @ApiOperation({ summary: '[LEGACY] Initialize a new cybersecurity readiness assessment for an organization' })
  @ApiResponse({ status: 201, description: 'Assessment started successfully' })
  @ApiResponse({ status: 403, description: 'Access denied or assessment already in progress' })
  async startCSIAssessment(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() createAssessmentDto: CreateAssessmentDto,
  ) {
    // Add organizationId to DTO for legacy support
    const dtoWithOrgId = { ...createAssessmentDto, organizationId };
    const assessment = await this.assessmentService.createAssessment(userId, dtoWithOrgId);
    return this.assessmentService.startAssessment(assessment.id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('csi/submit')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[LEGACY] Submit completed assessment answers and trigger score computation' })
  @ApiResponse({ status: 200, description: 'Assessment submitted and scored successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  async submitCSIAssessment(
    @GetUser('userId') userId: string,
    @Body() bulkSubmitDto: BulkSubmitResponseDto,
  ) {
    return this.assessmentService.bulkSubmitResponses(bulkSubmitDto.assessmentId, userId, bulkSubmitDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('csi/result/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[LEGACY] Retrieve detailed assessment results and report by ID (PDF/HTML/JSON)' })
  @ApiResponse({ status: 200, description: 'Assessment results retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Assessment not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this assessment' })
  @ApiParam({ name: 'id', description: 'Assessment ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Response format (json, pdf, html)', enum: ['json', 'pdf', 'html'] })
  async getCSIAssessmentResult(
    @GetUser('userId') userId: string,
    @Param('id') assessmentId: string,
    @Query('format') _format: 'json' | 'pdf' | 'html' = 'json',
  ) {
    const query: ReportQueryDto = {
      includeDetails: true,
      includeRecommendations: true,
      includeBenchmarks: true
    };
    return this.assessmentService.generateReport(assessmentId, userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/current-org/assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[LEGACY] Get current user organization assessment history' })
  @ApiResponse({ status: 200, description: 'Assessment history retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getCurrentOrganizationAssessments(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    const query: AssessmentQueryDto = {
      organizationId,
      skip: page ? (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 20) : 0,
      take: limit ? parseInt(limit, 10) : 20
    };
    
    return this.assessmentService.getAssessments(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:id/assessments')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[LEGACY] Get organization assessment history' })
  @ApiResponse({ status: 200, description: 'Assessment history retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getOrganizationAssessments(
    @GetUser('userId') userId: string,
    @Param('id') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const query: AssessmentQueryDto = {
      organizationId: orgId,
      skip: page ? (parseInt(page, 10) - 1) * (parseInt(limit, 10) || 20) : 0,
      take: limit ? parseInt(limit, 10) : 20
    };
    
    return this.assessmentService.getAssessments(userId, query);
  }
}