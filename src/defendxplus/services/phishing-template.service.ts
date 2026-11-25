import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  TemplatePreviewDto,
  TemplateCategory,
} from '../dto/phishing-template.dto';

@Injectable()
export class PhishingTemplateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Template CRUD Operations
   */

  async createTemplate(userId: string, organizationId: string | null, createTemplateDto: CreateTemplateDto) {
    const { name } = createTemplateDto;

    // Check if template name already exists
    const existingTemplate = await this.prisma.phishingTemplate.findUnique({
      where: { name }
    });

    if (existingTemplate) {
      throw new ConflictException('Template with this name already exists');
    }

    const template = await this.prisma.phishingTemplate.create({
      data: {
        ...createTemplateDto,
        createdBy: userId,
        organizationId: organizationId // null for global templates
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: organizationId ? {
          select: { id: true, name: true }
        } : undefined
      }
    });

    return template;
  }

  async getTemplates(organizationId: string | null, query: TemplateQueryDto) {
    const {
      page = 1,
      limit = 20,
      category,
      riskLevel,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = true
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      isActive,
      OR: [
        { organizationId: null }, // Global templates
        ...(organizationId ? [{ organizationId }] : []) // Organization-specific templates
      ],
      ...(category && { category }),
      ...(riskLevel && { riskLevel }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { defaultSubject: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]
      })
    };

    const [templates, total] = await Promise.all([
      this.prisma.phishingTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          organization: {
            select: { id: true, name: true }
          }
        }
      }),
      this.prisma.phishingTemplate.count({ where })
    ]);

    return {
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getTemplateById(templateId: string, organizationId?: string) {
    const template = await this.prisma.phishingTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { organizationId: null }, // Global template
          ...(organizationId ? [{ organizationId }] : []) // Organization template
        ]
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async updateTemplate(
    templateId: string,
    actor: { userId: string; role: string; organizationId: string | null },
    updateTemplateDto: UpdateTemplateDto,
  ) {
    const template = await this.prisma.phishingTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Global templates: platform admins only. Org templates: the creator or an admin of that organization.
    const isPlatformAdmin = actor.role === 'SUPER_ADMIN' || actor.role === 'CSA_ADMIN';
    const canUpdate = template.organizationId
      ? template.createdBy === actor.userId ||
        isPlatformAdmin ||
        (actor.role === 'ORG_ADMIN' && template.organizationId === actor.organizationId)
      : isPlatformAdmin;

    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this template');
    }

    const updatedTemplate = await this.prisma.phishingTemplate.update({
      where: { id: templateId },
      data: updateTemplateDto,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return updatedTemplate;
  }

  async deleteTemplate(templateId: string, userId: string) {
    const template = await this.prisma.phishingTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Only creator can delete
    if (template.createdBy !== userId) {
      throw new ConflictException('Only template creator can delete this template');
    }

    await this.prisma.phishingTemplate.delete({
      where: { id: templateId }
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Template Preview & Content
   */

  async getTemplatePreview(templateId: string, organizationId?: string): Promise<TemplatePreviewDto> {
    const template = await this.getTemplateById(templateId, organizationId);

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category as TemplateCategory,
      riskLevel: template.riskLevel as any,
      defaultSubject: template.defaultSubject,
      defaultSenderName: template.defaultSenderName,
      previewContent: template.previewContent,
      emailBodyHtml: this.sanitizeHtmlForPreview(template.emailBodyHtml),
      landingPageHtml: template.landingPageHtml ? this.sanitizeHtmlForPreview(template.landingPageHtml) : null,
      captureCredentials: template.captureCredentials,
      tags: template.tags,
      usageCount: template.usageCount,
      successRate: template.successRate
    };
  }

  private sanitizeHtmlForPreview(html: string): string {
    // Remove potentially harmful scripts and tracking pixels
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/{{[^}]+}}/g, '[PLACEHOLDER]'); // Replace template variables
  }

  async cloneTemplate(templateId: string, userId: string, organizationId: string, newName: string) {
    const originalTemplate = await this.getTemplateById(templateId, organizationId);

    const clonedTemplate = await this.prisma.phishingTemplate.create({
      data: {
        name: newName,
        description: `Cloned from: ${originalTemplate.description}`,
        category: originalTemplate.category,
        riskLevel: originalTemplate.riskLevel,
        defaultSubject: originalTemplate.defaultSubject,
        defaultSenderName: originalTemplate.defaultSenderName,
        emailBodyHtml: originalTemplate.emailBodyHtml,
        emailBodyText: originalTemplate.emailBodyText,
        landingPageHtml: originalTemplate.landingPageHtml,
        captureCredentials: originalTemplate.captureCredentials,
        previewContent: originalTemplate.previewContent,
        tags: [...originalTemplate.tags, 'cloned'],
        createdBy: userId,
        organizationId
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return clonedTemplate;
  }

  /**
   * Template Statistics & Analytics
   */

  async getTemplateStats(templateId: string, organizationId?: string) {
    const template = await this.getTemplateById(templateId, organizationId);

    // Get campaigns using this template
    const campaigns = await this.prisma.phishingCampaign.findMany({
      where: { templateId },
      select: {
        id: true,
        name: true,
        status: true,
        targetCount: true,
        emailsDelivered: true,
        emailsOpened: true,
        linksClicked: true,
        credentialsEntered: true,
        phishingReported: true,
        createdAt: true,
        completedAt: true
      }
    });

    // Calculate aggregate statistics
    const totalCampaigns = campaigns.length;
    const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED').length;
    const totalTargets = campaigns.reduce((sum, c) => sum + c.targetCount, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.emailsDelivered, 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + c.emailsOpened, 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + c.linksClicked, 0);
    const totalCredentials = campaigns.reduce((sum, c) => sum + c.credentialsEntered, 0);
    const totalReported = campaigns.reduce((sum, c) => sum + c.phishingReported, 0);

    // Calculate rates
    const avgOpenRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const avgClickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
    const avgCredentialRate = totalDelivered > 0 ? (totalCredentials / totalDelivered) * 100 : 0;
    const avgReportRate = totalDelivered > 0 ? (totalReported / totalDelivered) * 100 : 0;

    // Update template success rate
    await this.prisma.phishingTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: totalCampaigns,
        successRate: avgClickRate // Success = click rate for phishing templates
      }
    });

    return {
      templateId,
      templateName: template.name,
      usage: {
        totalCampaigns,
        completedCampaigns,
        totalTargets,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalCredentials,
        totalReported
      },
      rates: {
        avgOpenRate: parseFloat(avgOpenRate.toFixed(2)),
        avgClickRate: parseFloat(avgClickRate.toFixed(2)),
        avgCredentialRate: parseFloat(avgCredentialRate.toFixed(2)),
        avgReportRate: parseFloat(avgReportRate.toFixed(2))
      },
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        targetCount: c.targetCount,
        openRate: c.emailsDelivered > 0 ? ((c.emailsOpened / c.emailsDelivered) * 100) : 0,
        clickRate: c.emailsDelivered > 0 ? ((c.linksClicked / c.emailsDelivered) * 100) : 0,
        credentialRate: c.emailsDelivered > 0 ? ((c.credentialsEntered / c.emailsDelivered) * 100) : 0,
        createdAt: c.createdAt,
        completedAt: c.completedAt
      }))
    };
  }

  /**
   * Template Categories & Filtering
   */

  async getTemplateCategories() {
    const categories = await this.prisma.phishingTemplate.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { category: true }
    });

    return categories.map(cat => ({
      category: cat.category as TemplateCategory,
      count: cat._count.category,
      description: this.getCategoryDescription(cat.category as TemplateCategory)
    }));
  }

  private getCategoryDescription(category: TemplateCategory): string {
    const descriptions = {
      SECURITY: 'Security-related phishing scenarios (password resets, security alerts)',
      HR: 'Human Resources communications (job offers, policy updates)',
      FINANCE: 'Financial and accounting communications (invoices, payments)',
      IT: 'IT department communications (system updates, software installations)',
      EXECUTIVE: 'Executive and leadership communications (urgent requests)',
      GENERAL: 'General purpose templates for various scenarios'
    };

    return descriptions[category] || 'Template category';
  }

  async getPopularTemplates(organizationId?: string, limit: number = 10) {
    const templates = await this.prisma.phishingTemplate.findMany({
      where: {
        isActive: true,
        OR: [
          { organizationId: null },
          ...(organizationId ? [{ organizationId }] : [])
        ]
      },
      orderBy: [
        { usageCount: 'desc' },
        { successRate: 'desc' }
      ],
      take: limit,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    return templates;
  }

  /**
   * Template Validation
   */

  async validateTemplate(templateId: string): Promise<{ isValid: boolean; issues: string[] }> {
    const template = await this.getTemplateById(templateId);
    const issues: string[] = [];

    // Check required fields
    if (!template.emailBodyHtml || template.emailBodyHtml.trim().length === 0) {
      issues.push('Email body HTML is required');
    }

    if (!template.defaultSubject || template.defaultSubject.trim().length === 0) {
      issues.push('Default subject is required');
    }

    if (!template.defaultSenderName || template.defaultSenderName.trim().length === 0) {
      issues.push('Default sender name is required');
    }

    // Check for template variables
    const requiredVariables = ['{{unsubscribe_url}}', '{{tracking_pixel}}'];
    const htmlContent = template.emailBodyHtml;

    for (const variable of requiredVariables) {
      if (!htmlContent.includes(variable)) {
        issues.push(`Missing required template variable: ${variable}`);
      }
    }

    // Check HTML validity (basic check)
    if (!this.isValidHtml(htmlContent)) {
      issues.push('Email HTML appears to be malformed');
    }

    // Check landing page if present
    if (template.landingPageHtml && !this.isValidHtml(template.landingPageHtml)) {
      issues.push('Landing page HTML appears to be malformed');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private isValidHtml(html: string): boolean {
    // Basic HTML validation - check for balanced tags
    const openTags = (html.match(/<[^\/][^>]*>/g) || []).length;
    const closeTags = (html.match(/<\/[^>]*>/g) || []).length;
    
    // Allow for self-closing tags, so we're lenient with the count
    return Math.abs(openTags - closeTags) <= 5; // Allow some tolerance
  }
}