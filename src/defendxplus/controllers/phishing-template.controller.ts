import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { PhishingTemplateService } from '../services/phishing-template.service';
import { 
  CreateTemplateDto, 
  UpdateTemplateDto, 
  TemplateQueryDto,
  TemplatePreviewDto,
  CloneTemplateDto,
  TemplateValidationDto,
  TemplateStatsDto,
  TemplateCategoryDto
} from '../dto/phishing-template.dto';
import { PrismaService } from '../../database/prisma.service';

// Local enum definition
enum UserRole {
  ORGANIZATION_ADMIN = 'ORGANIZATION_ADMIN',
  ORGANIZATION_USER = 'ORGANIZATION_USER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  ORG_ADMIN = 'ORGANIZATION_ADMIN',
  ORG_MANAGER = 'ORGANIZATION_USER',
  END_USER = 'ORGANIZATION_USER',
  SUPER_ADMIN = 'PLATFORM_ADMIN',
  CSA_ADMIN = 'PLATFORM_ADMIN'
}

@ApiTags('Phishing Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('defendx-plus/templates')
export class PhishingTemplateController {
  constructor(private readonly templateService: PhishingTemplateService) {}

  /**
   * Template CRUD Operations
   */

  @Post()
//   @Roles(UserRole.SUPER_ADMIN, UserRole.CSA_ADMIN, UserRole.ORG_ADMIN ,UserRole.ORGANIZATION_ADMIN,UserRole.ORGANIZATION_USER)
  @ApiOperation({ summary: 'Create a new phishing template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 409, description: 'Template name already exists' })
  async createTemplate(
    @GetUser() user: any,
    @Body() createTemplateDto: CreateTemplateDto
  ) {
    // Global templates (CSA/Super Admin) vs org-specific templates
    const organizationId = user.role === UserRole.ORG_ADMIN ? user.organizationId : null;
    
    return this.templateService.createTemplate(
      user.userId, 
      organizationId, 
      createTemplateDto
    );
  }

  @Get()
//   @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get all available templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, enum: ['SECURITY', 'HR', 'FINANCE', 'IT', 'EXECUTIVE', 'GENERAL'] })
  @ApiQuery({ name: 'riskLevel', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getTemplates(
    @GetUser() user: any,
    @Query() query: TemplateQueryDto
  ) {
    return this.templateService.getTemplates(user.organizationId, query);
  }

  @Get('categories')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get template categories with counts' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully', type: [TemplateCategoryDto] })
  async getTemplateCategories(): Promise<TemplateCategoryDto[]> {
    return this.templateService.getTemplateCategories();
  }

  @Get('popular')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get popular templates' })
  @ApiResponse({ status: 200, description: 'Popular templates retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of templates to return' })
  async getPopularTemplates(
    @GetUser() user: any,
    @Query('limit') limit?: number
  ) {
    return this.templateService.getPopularTemplates(user.organizationId, limit);
  }

  @Get(':templateId')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateById(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ) {
    return this.templateService.getTemplateById(templateId, user.organizationId);
  }

  @Get(':templateId/preview')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get template preview (sanitized content)' })
  @ApiResponse({ status: 200, description: 'Template preview retrieved successfully', type: TemplatePreviewDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplatePreview(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ): Promise<TemplatePreviewDto> {
    return this.templateService.getTemplatePreview(templateId, user.organizationId);
  }

  @Get(':templateId/stats')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER, UserRole.END_USER)
  @ApiOperation({ summary: 'Get template usage statistics' })
  @ApiResponse({ status: 200, description: 'Template stats retrieved successfully', type: TemplateStatsDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateStats(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ): Promise<TemplateStatsDto> {
    return this.templateService.getTemplateStats(templateId, user.organizationId);
  }

  @Get(':templateId/validate')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Validate template content and structure' })
  @ApiResponse({ status: 200, description: 'Template validation completed', type: TemplateValidationDto })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async validateTemplate(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ): Promise<TemplateValidationDto> {
    return this.templateService.validateTemplate(templateId);
  }

  @Put(':templateId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CSA_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Update template' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async updateTemplate(
    @GetUser() user: any,
    @Param('templateId') templateId: string,
    @Body() updateTemplateDto: UpdateTemplateDto
  ) {
    return this.templateService.updateTemplate(
      templateId, 
      user.userId, 
      updateTemplateDto
    );
  }

  @Delete(':templateId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.CSA_ADMIN, UserRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 403, description: 'Only template creator can delete' })
  async deleteTemplate(
    @GetUser() user: any,
    @Param('templateId') templateId: string
  ) {
    return this.templateService.deleteTemplate(templateId, user.userId);
  }

  /**
   * Template Operations
   */

  @Post(':templateId/clone')
  @Roles(UserRole.ORG_ADMIN, UserRole.ORG_MANAGER)
  @ApiOperation({ summary: 'Clone existing template' })
  @ApiResponse({ status: 201, description: 'Template cloned successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Cloned template name already exists' })
  async cloneTemplate(
    @GetUser() user: any,
    @Param('templateId') templateId: string,
    @Body() cloneTemplateDto: CloneTemplateDto
  ) {
    return this.templateService.cloneTemplate(
      templateId,
      user.userId,
      user.organizationId,
      cloneTemplateDto.name
    );
  }
}