import {
  Controller,
  Get,
  Post,
  Put,
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

import { AdminService } from './admin.service';
import { CreateQuestionDto, UpdateQuestionDto, CreateDetectionRuleDto, UpdateDetectionRuleDto, TestDetectionRuleDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'View overall usage, orgs, revenue, and campaign data' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Get('orgs')
  @ApiOperation({ summary: 'List all registered organizations' })
  @ApiResponse({ status: 200, description: 'Organizations retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'search', required: false, description: 'Search organizations by name' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size' })
  async getOrganizations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sector') sector?: string,
    @Query('size') size?: string,
  ) {
    return this.adminService.getOrganizations(page, limit, search, sector, size);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Put('orgs/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend or activate an organization' })
  @ApiResponse({ status: 200, description: 'Organization status updated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async updateOrganizationStatus(
    @GetUser('userId') userId: string,
    @Param('id') organizationId: string,
    @Body() statusDto: { isActive: boolean; reason?: string },
  ) {
    return this.adminService.updateOrganizationStatus(userId, organizationId, statusDto);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Get('audit-logs')
  @ApiOperation({ summary: 'Retrieve system and billing audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO string)' })
  async getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, action, fromDate, toDate);
  }

  @Roles('SUPER_ADMIN')
  @Get('users')
  @ApiOperation({ summary: 'List all users across all organizations' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by user role' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization' })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.adminService.getUsers(page, limit, role, organizationId);
  }

  // Question Management Endpoints
  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Get('questions')
  @ApiOperation({ summary: 'Get all assessment questions with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Questions retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category' })
  async getQuestions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.adminService.getQuestions(page, limit, categoryId);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Post('questions')
  @ApiOperation({ summary: 'Create a new assessment question' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid question data' })
  async createQuestion(
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.adminService.createQuestion(createQuestionDto);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Put('questions/:id')
  @ApiOperation({ summary: 'Update an existing question' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  async updateQuestion(
    @Param('id') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.adminService.updateQuestion(questionId, updateQuestionDto);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('questions/:id/archive')
  @ApiOperation({ summary: 'Archive/unarchive a question (soft delete)' })
  @ApiResponse({ status: 200, description: 'Question archived/unarchived successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiParam({ name: 'id', description: 'Question ID' })
  async archiveQuestion(
    @Param('id') questionId: string,
  ) {
    return this.adminService.archiveQuestion(questionId);
  }

  // Detection Rules Management Endpoints
  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Get('detection-rules')
  @ApiOperation({ summary: 'Get all detection rules for DefendX+ alerts' })
  @ApiResponse({ status: 200, description: 'Detection rules retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getDetectionRules(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getDetectionRules(page, limit);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Post('detection-rules')
  @ApiOperation({ summary: 'Create a new detection rule' })
  @ApiResponse({ status: 201, description: 'Detection rule created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rule data' })
  async createDetectionRule(
    @GetUser('userId') userId: string,
    @Body() createRuleDto: CreateDetectionRuleDto,
  ) {
    return this.adminService.createDetectionRule(createRuleDto);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Put('detection-rules/:id')
  @ApiOperation({ summary: 'Update an existing detection rule' })
  @ApiResponse({ status: 200, description: 'Detection rule updated successfully' })
  @ApiResponse({ status: 404, description: 'Detection rule not found' })
  @ApiParam({ name: 'id', description: 'Detection Rule ID' })
  async updateDetectionRule(
    @Param('id') ruleId: string,
    @Body() updateRuleDto: UpdateDetectionRuleDto,
  ) {
    return this.adminService.updateDetectionRule(ruleId, updateRuleDto);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @HttpCode(HttpStatus.OK)
  @Post('detection-rules/:id/delete')
  @ApiOperation({ summary: 'Delete a detection rule' })
  @ApiResponse({ status: 200, description: 'Detection rule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Detection rule not found' })
  @ApiParam({ name: 'id', description: 'Detection Rule ID' })
  async deleteDetectionRule(
    @Param('id') ruleId: string,
  ) {
    return this.adminService.deleteDetectionRule(ruleId);
  }

  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @Post('detection-rules/test')
  @ApiOperation({ summary: 'Test a detection rule against sample data' })
  @ApiResponse({ status: 200, description: 'Rule test completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid rule or test data' })
  async testDetectionRule(
    @Body() testRuleDto: TestDetectionRuleDto,
  ) {
    return this.adminService.testDetectionRule(testRuleDto);
  }
}