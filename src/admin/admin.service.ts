import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto, CreateDetectionRuleDto, UpdateDetectionRuleDto, TestDetectionRuleDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations,
      totalUsers,
      activeAssessments,
      completedAssessments,
      phishingCampaigns,
      activeAgents,
      totalAlerts,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.organization.count({ where: { isActive: false } }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.assessment.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.assessment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.phishingCampaign.count(),
      this.prisma.agent.count({ where: { isActive: true } }),
      this.prisma.alert.count({ where: { status: 'OPEN' } }),
    ]);

    // Calculate national average CSI score
    const nationalCSIStats = await this.prisma.organization.aggregate({
      where: {
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    // Get sector-wise statistics
    const sectorStats = await this.prisma.organization.groupBy({
      by: ['sector'],
      where: {
        isActive: true,
        csiScore: { not: null },
      },
      _avg: {
        csiScore: true,
      },
      _count: {
        id: true,
      },
    });

    // Calculate month-over-month growth
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const [
      newOrgsThisMonth,
      newUsersThisMonth,
      assessmentsThisMonth,
    ] = await Promise.all([
      this.prisma.organization.count({
        where: { 
          isActive: true,
          createdAt: { gte: lastMonth }
        }
      }),
      this.prisma.user.count({
        where: { 
          isActive: true,
          createdAt: { gte: lastMonth }
        }
      }),
      this.prisma.assessment.count({
        where: { 
          createdAt: { gte: lastMonth }
        }
      }),
    ]);

    return {
      overview: {
        totalOrganizations,
        activeOrganizations,
        inactiveOrganizations,
        totalUsers,
        activeAssessments,
        completedAssessments,
        phishingCampaigns,
        activeAgents,
        totalAlerts,
      },
      nationalCSI: {
        averageScore: nationalCSIStats._avg.csiScore || 0,
        participatingOrgs: nationalCSIStats._count.id,
        participationRate: totalOrganizations > 0 ? (nationalCSIStats._count.id / totalOrganizations) * 100 : 0,
      },
      sectorBreakdown: sectorStats.map(sector => ({
        sector: sector.sector,
        averageScore: Math.round((sector._avg.csiScore || 0) * 100) / 100,
        organizationCount: sector._count.id,
        riskLevel: this.calculateRiskLevel(sector._avg.csiScore || 0),
      })),
      growth: {
        newOrganizationsThisMonth: newOrgsThisMonth,
        newUsersThisMonth: newUsersThisMonth,
        assessmentsThisMonth: assessmentsThisMonth,
      },
      generatedAt: new Date(),
    };
  }

  private calculateRiskLevel(score: number): string {
    if (score >= 81) return 'VERY_LOW';
    if (score >= 61) return 'LOW';
    if (score >= 41) return 'MEDIUM';
    if (score >= 21) return 'HIGH';
    return 'VERY_HIGH';
  }

  async getOrganizations(
    page: number = 1,
    limit: number = 20,
    search?: string,
    sector?: string,
    size?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (sector) where.sector = sector;
    if (size) where.size = size;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              assessments: true,
              phishingCampaigns: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrganizationStatus(
    userId: string,
    organizationId: string,
    statusDto: { isActive: boolean; reason?: string },
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        isActive: statusDto.isActive,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        action: statusDto.isActive ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_SUSPENDED',
        entity: 'Organization',
        entityId: organizationId,
        oldValues: JSON.stringify({ isActive: organization.isActive }),
        newValues: JSON.stringify({ 
          isActive: statusDto.isActive,
          reason: statusDto.reason,
        }),
        userId,
      },
    });

    return {
      message: `Organization ${statusDto.isActive ? 'activated' : 'suspended'} successfully`,
      data: updatedOrg,
    };
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    action?: string,
    fromDate?: string,
    toDate?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (action) where.action = action;
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = new Date(fromDate);
      if (toDate) where.timestamp.lte = new Date(toDate);
    }

    const [auditLogs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getUsers(
    page: number = 1,
    limit: number = 50,
    role?: string,
    organizationId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (role) where.role = role;
    if (organizationId) where.organizationId = organizationId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              sector: true,
              size: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Question Management Methods
  async getQuestions(page: number = 1, limit: number = 10, categoryId?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };

    if (categoryId) where.categoryId = categoryId;

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          category: true,
          options: true,
          _count: {
            select: {
              responses: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
        skip,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      questions,
      pagination: {
        current: page,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createQuestion(data: CreateQuestionDto): Promise<any> {
    const { options, ...questionData } = data;

    // Get the next order number for this category
    const lastQuestion = await this.prisma.question.findFirst({
      where: { categoryId: questionData.categoryId },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastQuestion ? lastQuestion.order + 1 : 1;

    const question = await this.prisma.question.create({
      data: {
        text: questionData.text,
        description: questionData.description,
        type: questionData.type as any, // Convert to QuestionType enum
        weight: questionData.weight,
        isRequired: questionData.isRequired,
        order: nextOrder,
        version: questionData.version || '1.0',
        categoryId: questionData.categoryId,
        options: {
          create: options.map((option, index) => ({
            text: option.text,
            value: option.value,
            score: option.score,
            order: index + 1,
            isCorrect: option.isCorrect || false,
          })),
        },
      },
      include: {
        category: true,
        options: true,
      },
    });

    return question;
  }

  async updateQuestion(id: string, data: UpdateQuestionDto): Promise<any> {
    const { options, ...questionData } = data;

    const updateData: any = {};
    if (questionData.text !== undefined) updateData.text = questionData.text;
    if (questionData.description !== undefined) updateData.description = questionData.description;
    if (questionData.type !== undefined) updateData.type = questionData.type as any;
    if (questionData.weight !== undefined) updateData.weight = questionData.weight;
    if (questionData.isRequired !== undefined) updateData.isRequired = questionData.isRequired;
    if (questionData.version !== undefined) updateData.version = questionData.version;
    if (questionData.categoryId !== undefined) updateData.categoryId = questionData.categoryId;

    const question = await this.prisma.question.update({
      where: { id },
      data: {
        ...updateData,
        ...(options && {
          options: {
            deleteMany: {},
            create: options.map((option, index) => ({
              text: option.text,
              value: option.value,
              score: option.score,
              order: index + 1,
              isCorrect: option.isCorrect || false,
            })),
          },
        }),
      },
      include: {
        category: true,
        options: true,
      },
    });

    return question;
  }

  async archiveQuestion(id: string): Promise<any> {
    const question = await this.prisma.question.update({
      where: { id },
      data: { isActive: false },
      include: {
        category: true,
        options: true,
      },
    });

    return question;
  }

  // Detection Rules Management Methods
  async getDetectionRules(page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [rules, total] = await Promise.all([
      this.prisma.detectionRule.findMany({
        include: {
          _count: {
            select: {
              alerts: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.detectionRule.count(),
    ]);

    return {
      rules,
      pagination: {
        current: page,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createDetectionRule(data: CreateDetectionRuleDto): Promise<any> {
    // Convert conditions array to JSON string for the condition field
    const conditionString = JSON.stringify(data.conditions);
    
    const rule = await this.prisma.detectionRule.create({
      data: {
        name: data.name,
        description: data.description,
        condition: conditionString,
        severity: data.severity as any,
        action: data.action as any,
        isActive: data.isActive ?? true,
      },
    });

    return rule;
  }

  async updateDetectionRule(id: string, data: UpdateDetectionRuleDto): Promise<any> {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.conditions !== undefined) updateData.condition = JSON.stringify(data.conditions);
    if (data.severity !== undefined) updateData.severity = data.severity as any;
    if (data.action !== undefined) updateData.action = data.action as any;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    
    const rule = await this.prisma.detectionRule.update({
      where: { id },
      data: updateData,
    });

    return rule;
  }

  async deleteDetectionRule(id: string): Promise<void> {
    await this.prisma.detectionRule.delete({
      where: { id },
    });
  }

  async testDetectionRule(data: TestDetectionRuleDto): Promise<any> {
    const { detectionRule, sampleData } = data;

    // Simulate rule testing logic
    const testResults = {
      ruleId: 'test-rule',
      ruleName: detectionRule.name,
      testTimestamp: new Date(),
      sampleDataProcessed: sampleData.length,
      matches: [],
      performance: {
        executionTimeMs: Math.floor(Math.random() * 100) + 10,
        memoryUsageMB: Math.floor(Math.random() * 50) + 10,
      },
    };

    // Simple pattern matching simulation
    sampleData.forEach((sample, index) => {
      // Simulate rule condition evaluation
      const shouldMatch = detectionRule.conditions.some(condition => {
        const fieldValue = sample[condition.field];
        if (!fieldValue) return false;

        switch (condition.operator) {
          case 'equals':
            return fieldValue === condition.value;
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
          case 'greater_than':
            return Number(fieldValue) > Number(condition.value);
          case 'less_than':
            return Number(fieldValue) < Number(condition.value);
          case 'regex':
            try {
              const regex = new RegExp(condition.value);
              return regex.test(String(fieldValue));
            } catch {
              return false;
            }
          default:
            return false;
        }
      });

      if (shouldMatch) {
        testResults.matches.push({
          sampleIndex: index,
          matchedConditions: detectionRule.conditions.filter(condition => {
            const fieldValue = sample[condition.field];
            // Simplified condition check for matched conditions
            return fieldValue !== undefined;
          }),
          sample,
        });
      }
    });

    return testResults;
  }
}