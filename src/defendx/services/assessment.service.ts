import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import {
  CreateAssessmentDto,
  SubmitAssessmentDto,
  AssessmentQueryDto,
  ReportQueryDto,
  CSIDirectoryQueryDto,
  BulkSubmitResponseDto,
  SingleResponseDto,
  CSIScoreDto,
  AssessmentStatsDto,
  CSIBenchmarkDto,
  CreateAnonymousAssessmentDto,
  BulkAnonymousResponseDto,
  CompleteAnonymousAssessmentDto,
  TransferAnonymousAssessmentDto
} from '../dto/assessment.dto';
import { AssessmentType, AssessmentStatus, CSITier, RiskTier } from '../../../generated/prisma';
import { QuestionService } from './question.service';
import { BenchmarkService } from './benchmark.service';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private questionService: QuestionService,
    private benchmarkService: BenchmarkService,
  ) {}

  /**
   * Create a new assessment
   */
  async createAssessment(userId: string, dto: CreateAssessmentDto) {
    // Check if this is an anonymous assessment (has sessionId)
    if ((dto as any).sessionId) {
      return this.createAnonymousAssessment(dto as any);
    }

    // Verify user has access to the organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: dto.organizationId,
        status: 'ACTIVE'
      }
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Check if there's already an active assessment
    const existingAssessment = await this.prisma.assessment.findFirst({
      where: {
        organizationId: dto.organizationId,
        status: { in: [AssessmentStatus.DRAFT, AssessmentStatus.IN_PROGRESS] }
      }
    });

    if (existingAssessment) {
      throw new BadRequestException('Organization already has an active assessment');
    }

    const assessment = await this.prisma.assessment.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type || AssessmentType.CSI_ASSESSMENT,
        organizationId: dto.organizationId,
        userId,
        status: AssessmentStatus.DRAFT
      },
      include: {
        organization: true,
        user: true
      }
    });

    return assessment;
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(id: string, userId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        organization: true,
        user: true,
        responses: {
          include: {
            question: {
              include: {
                category: true,
                options: true
              }
            }
          }
        },
        result: true
      }
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Check if user has access (organization membership or transferred assessment)
    const hasAccess = await this.checkUserAccess(userId, assessment.organizationId) ||
                     (assessment.transferredToUserId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this assessment');
    }

    // Get all available questions for this assessment
    const allQuestions = await this.questionService.getActiveQuestions();
    
    // Map responses by questionId for easy lookup
    const responseMap = new Map(
      assessment.responses.map(r => [r.question.id, r])
    );

    // Combine all questions with their responses (if any)
    const questionsWithResponses = allQuestions.map(question => ({
      ...question,
      response: responseMap.get(question.id) || null
    }));

    return {
      ...assessment,
      questions: questionsWithResponses
    };
  }

  /**
   * Get assessments with filtering
   */
  async getAssessments(userId: string, query: AssessmentQueryDto) {
    const where: any = {};

    // If organizationId is provided, check access
    if (query.organizationId) {
      const hasAccess = await this.checkUserAccess(userId, query.organizationId);
      if (!hasAccess) {
        throw new ForbiddenException('You do not have access to this organization');
      }
      where.organizationId = query.organizationId;
    } else {
      // Get all organizations user has access to
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId, status: 'ACTIVE' },
        select: { organizationId: true }
      });
      where.organizationId = { in: memberships.map(m => m.organizationId) };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate)
      };
    }

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        include: {
          organization: true,
          user: true,
          result: true
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip || 0,
        take: query.take || 20
      }),
      this.prisma.assessment.count({ where })
    ]);

    return {
      data: assessments,
      total,
      skip: query.skip || 0,
      take: query.take || 20
    };
  }

  /**
   * Start an assessment (change status from DRAFT to IN_PROGRESS)
   */
  async startAssessment(id: string, userId: string) {
    const assessment = await this.getAssessment(id, userId);
    
    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new BadRequestException('Assessment has already been started');
    }

    const updatedAssessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.IN_PROGRESS,
        startedAt: new Date()
      },
      include: {
        organization: true,
        user: true
      }
    });

    // Get questions for the assessment
    const questions = await this.questionService.getActiveQuestions();

    return {
      assessment: updatedAssessment,
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        description: q.description,
        type: q.type,
        isRequired: q.isRequired,
        category: q.category,
        options: q.options?.map(o => ({
          id: o.id,
          text: o.text,
          value: o.value,
        })),
      })),
    };
  }

  /**
   * Submit assessment response
   */
  async submitResponse(assessmentId: string, userId: string, dto: SingleResponseDto) {
    const assessment = await this.getAssessment(assessmentId, userId);
    
    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new BadRequestException('Assessment is already completed');
    }

    // Get the question to validate the response
    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
      include: { options: true }
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Calculate score based on question type and response
    const score = this.calculateQuestionScore(question, dto.answer);

    // Upsert the response
    const response = await this.prisma.assessmentResponse.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId,
          questionId: dto.questionId
        }
      },
      update: {
        answer: JSON.stringify(dto.answer),
        score,
        timeSpent: dto.timeSpent
      },
      create: {
        assessmentId,
        questionId: dto.questionId,
        answer: JSON.stringify(dto.answer),
        score,
        timeSpent: dto.timeSpent
      }
    });

    return response;
  }

  /**
   * Bulk submit multiple responses
   */
  async bulkSubmitResponses(assessmentId: string, userId: string, dto: BulkSubmitResponseDto) {
    const assessment = await this.getAssessment(assessmentId, userId);
    
    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new BadRequestException('Assessment is already completed');
    }

    const results = [];
    
    for (const responseDto of dto.responses) {
      try {
        const result = await this.submitResponse(assessmentId, userId, responseDto);
        results.push({ success: true, questionId: responseDto.questionId, result });
      } catch (error) {
        results.push({ 
          success: false, 
          questionId: responseDto.questionId, 
          error: error.message 
        });
      }
    }

    return { results };
  }

  /**
   * Complete assessment and generate results
   */
  async completeAssessment(id: string, userId: string) {
    const assessment = await this.getAssessment(id, userId);
    
    if (assessment.status === AssessmentStatus.COMPLETED) {
      throw new BadRequestException('Assessment is already completed');
    }

    // Get all responses for scoring
    const responses = await this.prisma.assessmentResponse.findMany({
      where: { assessmentId: id },
      include: {
        question: {
          include: { category: true }
        }
      }
    });

    // Get all available questions for completion rate
    const totalQuestions = await this.prisma.question.count({
      where: { isActive: true }
    });

    // Calculate overall score and tier
    const scoreResult = this.calculateOverallScore(responses);
    const tier = this.determineTier(scoreResult.overallScore);
    
    // Get benchmarking data
    const benchmarks = await this.getBenchmarkData(assessment.organizationId);

    // Create assessment result
    const result = await this.prisma.assessmentResult.create({
      data: {
        assessmentId: id,
        overallScore: scoreResult.overallScore,
        overallPercentage: scoreResult.overallPercentage,
        tier,
        categoryScores: JSON.stringify(scoreResult.categoryScores),
        sectionScores: JSON.stringify(scoreResult.sectionScores),
        industryPercentile: benchmarks.industryPercentile,
        sizePercentile: benchmarks.sizePercentile,
        regionPercentile: benchmarks.regionPercentile,
        questionsAnswered: responses.length,
        totalQuestions,
        completionRate: (responses.length / totalQuestions) * 100,
        totalTimeMinutes: Math.round(responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / 60)
      }
    });

    // Update assessment status
    const updatedAssessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date(),
        score: scoreResult.overallPercentage,
        maxScore: 100,
        riskTier: this.mapTierToRiskTier(tier)
      }
    });

    // Update organization CSI score
    await this.prisma.organization.update({
      where: { id: assessment.organizationId },
      data: {
        csiScore: scoreResult.overallPercentage,
        riskTier: this.mapTierToRiskTier(tier)
      }
    });

    return { assessment: updatedAssessment, result };
  }

  /**
   * Get CSI directory with filtering and benchmarking
   */
  async getCSIDirectory(query: CSIDirectoryQueryDto) {
    const where: any = {
      status: AssessmentStatus.COMPLETED,
      result: { isNot: null }
    };

    if (query.sector) {
      where.organization = { sector: query.sector };
    }

    if (query.size) {
      where.organization = { ...where.organization, size: query.size };
    }

    if (query.region) {
      where.organization = { ...where.organization, region: query.region };
    }

    if (query.minScore !== undefined) {
      where.result = { ...where.result, overallScore: { gte: query.minScore } };
    }

    if (query.maxScore !== undefined) {
      where.result = { 
        ...where.result, 
        overallScore: { ...where.result.overallScore, lte: query.maxScore } 
      };
    }

    if (query.tier) {
      where.result = { ...where.result, tier: query.tier };
    }

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        include: {
          organization: {
            select: {
              name: true,
              sector: true,
              size: true,
              region: true,
              isPublic: true
            }
          },
          result: true
        },
        orderBy: query.orderBy === 'score' 
          ? { result: { overallScore: query.orderDirection || 'desc' } }
          : { completedAt: query.orderDirection || 'desc' },
        skip: query.skip || 0,
        take: query.take || 50
      }),
      this.prisma.assessment.count({ where })
    ]);

    // Filter out private organizations unless specifically requested
    const filteredAssessments = assessments.filter(a => 
      a.organization.isPublic || query.includePrivate
    );

    return {
      data: filteredAssessments,
      total: filteredAssessments.length,
      skip: query.skip || 0,
      take: query.take || 50
    };
  }

  /**
   * Generate assessment report
   */
  async generateReport(id: string, userId: string, query: ReportQueryDto) {
    const assessment = await this.getAssessment(id, userId);
    
    if (assessment.status !== AssessmentStatus.COMPLETED) {
      throw new BadRequestException('Assessment must be completed to generate report');
    }

    // Get detailed results
    const responses = await this.prisma.assessmentResponse.findMany({
      where: { assessmentId: id },
      include: {
        question: {
          include: { 
            category: true,
            options: true 
          }
        }
      }
    });

    const report = {
      assessment,
      responses: responses.map(r => ({
        question: r.question,
        answer: r.answer,
        score: r.score,
        timeSpent: r.timeSpent
      })),
      result: assessment.result,
      includeDetails: query.includeDetails !== false,
      includeRecommendations: query.includeRecommendations !== false,
      includeBenchmarks: query.includeBenchmarks !== false
    };

    return report;
  }

  /**
   * Get assessment statistics
   */
  async getAssessmentStats(organizationId?: string): Promise<AssessmentStatsDto> {
    const where: any = {};
    
    if (organizationId) {
      where.organizationId = organizationId;
    }

    const [
      totalAssessments,
      completedAssessments,
      avgScore,
      assessmentsByTier
    ] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.count({ 
        where: { ...where, status: AssessmentStatus.COMPLETED } 
      }),
      this.prisma.assessmentResult.aggregate({
        where: organizationId ? { assessment: { organizationId } } : {},
        _avg: { overallScore: true }
      }),
      this.prisma.assessmentResult.groupBy({
        by: ['tier'],
        where: organizationId ? { assessment: { organizationId } } : {},
        _count: { tier: true }
      })
    ]);

    const tierDistribution = assessmentsByTier.reduce((acc, item) => {
      acc[item.tier] = item._count.tier;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAssessments,
      completedAssessments,
      inProgress: totalAssessments - completedAssessments,
      averageScore: avgScore._avg.overallScore || 0,
      completionRate: totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0,
      tierDistribution
    };
  }

  /**
   * Get dashboard stats (legacy method for backward compatibility)
   */
  async getDashboardStats(userId: string, organizationId: string) {
    // Verify user has access to this organization
    const hasAccess = await this.checkUserAccess(userId, organizationId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Get organization with latest CSI data
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        csiScore: true,
        riskTier: true,
        sector: true,
        size: true,
        region: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get assessment statistics
    const [totalAssessments, recentAssessments, latestCompleted, previousCompleted] = await Promise.all([
      this.prisma.assessment.count({
        where: { organizationId, status: AssessmentStatus.COMPLETED },
      }),
      this.prisma.assessment.findMany({
        where: { organizationId },
        select: {
          id: true,
          title: true,
          status: true,
          score: true,
          completedAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.assessment.findFirst({
        where: { organizationId, status: AssessmentStatus.COMPLETED },
        orderBy: { completedAt: 'desc' },
        select: { score: true, completedAt: true },
      }),
      this.prisma.assessment.findMany({
        where: { organizationId, status: AssessmentStatus.COMPLETED },
        orderBy: { completedAt: 'desc' },
        select: { score: true },
        skip: 1,
        take: 1,
      }),
    ]);

    // Calculate score trend
    let scoreTrend = null;
    if (latestCompleted && previousCompleted.length > 0) {
      scoreTrend = (latestCompleted.score || 0) - (previousCompleted[0].score || 0);
    }

    // Get benchmarks for comparison
    let benchmarks = null;
    if (organization.csiScore) {
      benchmarks = await this.benchmarkService.getBenchmarks(
        organization.region,
        organization.sector,
        organization.size,
      );
    }

    return {
      organization: {
        id: organization.id,
        name: organization.name,
      },
      stats: {
        csiScore: organization.csiScore,
        riskTier: organization.riskTier,
        totalAssessments,
        lastAssessmentDate: latestCompleted?.completedAt || null,
        scoreTrend,
        benchmarks,
      },
      recentAssessments: recentAssessments.map(assessment => ({
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        score: assessment.score,
        completedAt: assessment.completedAt,
        createdBy: `${assessment.user.firstName} ${assessment.user.lastName}`,
      })),
    };
  }

  /**
   * Private helper methods
   */
  private async checkUserAccess(userId: string, organizationId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE'
      }
    });
    return !!membership;
  }

  private calculateQuestionScore(question: any, answer: string | number): number {
    // Basic scoring logic - can be enhanced based on question type
    const answerString = typeof answer === 'number' ? answer.toString() : answer;
    
    switch (question.type) {
      case 'YES_NO':
        // For yes/no questions, typically "yes" scores higher
        return answerString.toLowerCase() === 'yes' ? question.weight : 0;
      
      case 'SCALE':
        // For scale questions, parse the numeric value
        const numericValue = typeof answer === 'number' ? answer : parseFloat(answerString);
        return isNaN(numericValue) ? 0 : (numericValue / 5) * question.weight;
      
      case 'SINGLE_CHOICE':
      case 'MULTIPLE_CHOICE':
        // For choice questions, look up the option value
        const option = question.options.find((opt: any) => opt.text === answerString || opt.value === answerString);
        return option ? parseFloat(option.value) * question.weight : 0;
      
      default:
        return 0;
    }
  }

  private calculateOverallScore(responses: any[]) {
    const categoryScores: Record<string, { score: number; maxScore: number; count: number }> = {};
    let totalScore = 0;
    let maxTotalScore = 0;

    responses.forEach(response => {
      const categoryName = response.question.category.name;
      const score = response.score || 0;
      const maxScore = response.question.weight;

      if (!categoryScores[categoryName]) {
        categoryScores[categoryName] = { score: 0, maxScore: 0, count: 0 };
      }

      categoryScores[categoryName].score += score;
      categoryScores[categoryName].maxScore += maxScore;
      categoryScores[categoryName].count += 1;
      
      totalScore += score;
      maxTotalScore += maxScore;
    });

    // Calculate category percentages
    const categoryPercentages: Record<string, number> = {};
    Object.keys(categoryScores).forEach(category => {
      const cat = categoryScores[category];
      categoryPercentages[category] = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
    });

    const overallScore = maxTotalScore > 0 ? totalScore / maxTotalScore * 5 : 0; // 0-5 scale
    const overallPercentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

    return {
      overallScore,
      overallPercentage,
      categoryScores: categoryPercentages,
      sectionScores: categoryPercentages // For now, sections = categories
    };
  }

  private determineTier(score: number): CSITier {
    if (score >= 4.5) return CSITier.INNOVATIVE;
    if (score >= 4.0) return CSITier.PROGRESSIVE;
    if (score >= 3.5) return CSITier.ADVANCED;
    if (score >= 3.0) return CSITier.ORGANIZATIONAL;
    if (score >= 2.0) return CSITier.FOUNDATIONAL;
    return CSITier.BASIC;
  }

  private mapTierToRiskTier(tier: CSITier): RiskTier {
    switch (tier) {
      case CSITier.BASIC:
      case CSITier.FOUNDATIONAL:
        return RiskTier.HIGH;
      case CSITier.ORGANIZATIONAL:
        return RiskTier.MEDIUM;
      case CSITier.ADVANCED:
      case CSITier.PROGRESSIVE:
        return RiskTier.LOW;
      case CSITier.INNOVATIVE:
        return RiskTier.VERY_LOW;
      default:
        return RiskTier.HIGH;
    }
  }

  private async getBenchmarkData(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return { industryPercentile: null, sizePercentile: null, regionPercentile: null };
    }

    // Use default region if organization region is null
    const region = org.region || 'Unknown';
    const currentPeriod = new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth() + 1) / 3);

    // Get benchmark data from database
    const benchmarkData = await this.prisma.benchmarkData.findFirst({
      where: {
        region: region,
        sector: org.sector,
        size: org.size,
        period: currentPeriod
      }
    });

    // This would be calculated based on actual benchmark data
    // For now, return placeholder values
    return {
      industryPercentile: benchmarkData ? 65 : null,
      sizePercentile: benchmarkData ? 72 : null,
      regionPercentile: benchmarkData ? 58 : null
    };
  }

  private generateRecommendations(riskTier: string, categoryScores: any): string[] {
    const recommendations = [];

    if (riskTier === 'VERY_HIGH' || riskTier === 'HIGH') {
      recommendations.push(
        'Implement immediate security measures',
        'Conduct security training for all employees',
        'Review and update security policies',
      );
    }

    // Add category-specific recommendations based on low scores
    Object.values(categoryScores).forEach((category: any) => {
      const categoryScore = (category.totalScore / category.maxScore) * 100;
      if (categoryScore < 50) {
        recommendations.push(`Improve ${category.name.toLowerCase()} measures`);
      }
    });

    return recommendations;
  }

  /**
   * Create a new anonymous assessment
   */
  async createAnonymousAssessment(dto: CreateAnonymousAssessmentDto) {
    // Validate session ID format (should be UUID)
    if (!this.validateSessionId(dto.sessionId)) {
      throw new BadRequestException('Invalid session ID format. Must be a valid UUID.');
    }

    // Check if session ID already exists
    const existingAssessment = await this.prisma.assessment.findUnique({
      where: { sessionId: dto.sessionId }
    });

    if (existingAssessment) {
      // If the assessment exists and is expired, we can return it
      if (existingAssessment.expiresAt && new Date() > existingAssessment.expiresAt) {
        throw new BadRequestException('Session ID already exists but has expired. Please use a new session ID.');
      }
      
      // If assessment already exists and is active, return the existing one
      return {
        id: existingAssessment.id,
        sessionId: existingAssessment.sessionId,
        status: existingAssessment.status,
        createdAt: existingAssessment.createdAt,
        isAnonymous: existingAssessment.isAnonymous,
        message: 'Returning existing assessment for this session'
      };
    }

    // Set expiration to 48 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    try {
      const assessment = await this.prisma.assessment.create({
        data: {
          title: dto.title || 'Anonymous Security Assessment',
          type: dto.type || AssessmentType.CSI_ASSESSMENT,
          sessionId: dto.sessionId,
          isAnonymous: true,
          expiresAt,
          status: AssessmentStatus.DRAFT
        },
        include: {
          responses: {
            include: {
              question: {
                include: {
                  category: true,
                  options: true
                }
              }
            }
          }
        }
      });

      return {
        id: assessment.id,
        sessionId: assessment.sessionId,
        status: assessment.status,
        createdAt: assessment.createdAt,
        isAnonymous: assessment.isAnonymous
      };
    } catch (error) {
      // Handle Prisma unique constraint errors
      if (error.code === 'P2002') {
        throw new BadRequestException('This session ID is already in use. Please generate a new session ID.');
      }
      throw error;
    }
  }

  /**
   * Submit bulk responses for anonymous assessment
   */
  async bulkSubmitAnonymousResponses(assessmentId: string, dto: BulkAnonymousResponseDto) {
    // Validate session
    const assessment = await this.validateAnonymousSession(assessmentId, dto.sessionId);

    // Ensure assessment is in valid state
    if (assessment.status !== AssessmentStatus.DRAFT && assessment.status !== AssessmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Assessment is not in a valid state for responses');
    }

    // Update assessment status to IN_PROGRESS if it's still DRAFT
    if (assessment.status === AssessmentStatus.DRAFT) {
      await this.prisma.assessment.update({
        where: { id: assessmentId },
        data: { status: AssessmentStatus.IN_PROGRESS, startedAt: new Date() }
      });
    }

    // Process responses
    const responsePromises = dto.responses.map(async (response) => {
      // Validate question exists
      const question = await this.prisma.question.findUnique({
        where: { id: response.questionId }
      });

      if (!question) {
        throw new NotFoundException(`Question ${response.questionId} not found`);
      }

      // Create or update response
      return this.prisma.assessmentResponse.upsert({
        where: {
          assessmentId_questionId: {
            assessmentId,
            questionId: response.questionId
          }
        },
        update: {
          answer: JSON.stringify(response.answer),
          score: await this.calculateResponseScore(question, response.answer),
          timeSpent: response.timeSpent,
          sessionId: dto.sessionId
        },
        create: {
          assessmentId,
          questionId: response.questionId,
          answer: JSON.stringify(response.answer),
          score: await this.calculateResponseScore(question, response.answer),
          timeSpent: response.timeSpent,
          sessionId: dto.sessionId
        }
      });
    });

    const responses = await Promise.all(responsePromises);

    return {
      success: true,
      submitted: responses.length,
      assessmentId,
      sessionId: dto.sessionId
    };
  }

  /**
   * Complete anonymous assessment
   */
  async completeAnonymousAssessment(assessmentId: string, dto: CompleteAnonymousAssessmentDto) {
    // Validate session
    const assessment = await this.validateAnonymousSession(assessmentId, dto.sessionId);

    // Ensure assessment is in progress
    if (assessment.status !== AssessmentStatus.IN_PROGRESS) {
      throw new BadRequestException('Assessment must be in progress to complete');
    }

    // Get assessment with responses for scoring
    const fullAssessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        responses: {
          include: {
            question: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    // Calculate final score and complete assessment
    const result = await this.calculateAssessmentResult(fullAssessment);

    // Update assessment with results
    const completedAssessment = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: AssessmentStatus.COMPLETED,
        completedAt: new Date(),
        score: result.score,
        maxScore: result.maxScore,
        riskTier: result.riskTier
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    return {
      assessmentId: completedAssessment.id,
      score: completedAssessment.score,
      tier: completedAssessment.riskTier,
      completedAt: completedAssessment.completedAt,
      responses: completedAssessment.responses.length,
      questionsCount: completedAssessment.responses.length,
      isAnonymous: true
    };
  }

  /**
   * Transfer anonymous assessment to authenticated user
   */
  async transferAnonymousAssessment(userId: string, dto: TransferAnonymousAssessmentDto) {
    // Find the anonymous assessment
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        sessionId: dto.sessionId,
        isAnonymous: true,
        transferredToUserId: null, // Not already transferred
        status: AssessmentStatus.COMPLETED
      }
    });

    if (!assessment) {
      throw new NotFoundException('Anonymous assessment not found or already transferred');
    }

    // Check if assessment has expired
    if (assessment.expiresAt && new Date() > assessment.expiresAt) {
      throw new BadRequestException('Assessment session has expired');
    }

    // Get user and their organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine organization ID (use provided or user's organization)
    const organizationId = dto.organizationId || user.organizationId;

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    // Verify user has access to the organization
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId,
        status: 'ACTIVE'
      }
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Transfer the assessment
    const transferredAssessment = await this.prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        userId,
        organizationId,
        isAnonymous: false,
        transferredToUserId: userId,
        expiresAt: null // Remove expiration
      },
      include: {
        organization: true,
        user: true,
        responses: true
      }
    });

    return {
      success: true,
      assessmentId: transferredAssessment.id,
      transferredTo: {
        userId: transferredAssessment.userId,
        organizationId: transferredAssessment.organizationId
      }
    };
  }

  /**
   * Validate session ID format
   */
  private validateSessionId(sessionId: string): boolean {
    return uuidValidate(sessionId);
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return uuidv4();
  }

  /**
   * Check if anonymous session exists
   */
  async checkAnonymousSessionExists(sessionId: string) {
    if (!this.validateSessionId(sessionId)) {
      throw new BadRequestException('Invalid session ID format');
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { sessionId },
      select: {
        id: true,
        sessionId: true,
        status: true,
        isAnonymous: true,
        expiresAt: true,
        createdAt: true
      }
    });

    if (!assessment) {
      return {
        exists: false,
        sessionId,
        message: 'Session ID is available'
      };
    }

    // Check if expired
    const isExpired = assessment.expiresAt && new Date() > assessment.expiresAt;

    return {
      exists: true,
      sessionId,
      assessmentId: assessment.id,
      status: assessment.status,
      isExpired,
      createdAt: assessment.createdAt,
      expiresAt: assessment.expiresAt
    };
  }

  /**
   * Get questions for assessment (public endpoint for anonymous users)
   */
  async getQuestionsForAssessment(categoryId?: string) {
    const where: any = { isActive: true };
    
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const questions = await this.prisma.question.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            order: true
          }
        },
        options: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            value: true,
            order: true,
            // Don't expose isCorrect for security
          }
        }
      },
      orderBy: [
        { category: { order: 'asc' } },
        { order: 'asc' }
      ]
    });

    // Format response to group by category
    const categorizedQuestions = questions.reduce((acc, question) => {
      const categoryName = question.category.name;
      
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: {
            id: question.category.id,
            name: question.category.name,
            description: question.category.description,
            weight: question.category.weight,
            order: question.category.order
          },
          questions: []
        };
      }
      
      acc[categoryName].questions.push({
        id: question.id,
        text: question.text,
        type: question.type,
        description: question.description,
        weight: question.weight,
        order: question.order,
        required: question.isRequired,
        options: question.options
      });
      
      return acc;
    }, {});

    return {
      total: questions.length,
      categories: Object.values(categorizedQuestions)
    };
  }

  /**
   * Get question categories (public endpoint)
   */
  async getQuestionCategories() {
    const categories = await this.prisma.questionCategory.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        weight: true,
        order: true,
        _count: {
          select: {
            questions: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    return {
      total: categories.length,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        weight: cat.weight,
        order: cat.order,
        questionCount: cat._count.questions
      }))
    };
  }

  /**
   * Validate anonymous assessment session
   */
  private async validateAnonymousSession(assessmentId: string, sessionId: string): Promise<any> {
    if (!this.validateSessionId(sessionId)) {
      throw new BadRequestException('Invalid session ID format');
    }

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        sessionId,
        isAnonymous: true
      }
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found or invalid session');
    }

    // Check if assessment has expired
    if (assessment.expiresAt && new Date() > assessment.expiresAt) {
      throw new BadRequestException('Assessment session has expired');
    }

    return assessment;
  }
  private async calculateResponseScore(question: any, answer: any): Promise<number> {
    // This is a simplified scoring logic - you may need to adjust based on your question types
    if (typeof answer === 'string') {
      // For yes/no questions, assume "Yes" = full points
      if (answer.toLowerCase() === 'yes') return question.weight || 1;
      if (answer.toLowerCase() === 'no') return 0;
    }
    if (typeof answer === 'number') {
      // For rating questions, return the rating value
      return answer;
    }
    return 0;
  }

  /**
   * Calculate assessment result (helper method)
   */
  private async calculateAssessmentResult(assessment: any) {
    let totalScore = 0;
    let maxScore = 0;

    assessment.responses.forEach((response: any) => {
      totalScore += response.score || 0;
      maxScore += response.question.weight || 1;
    });

    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    // Determine risk tier based on score
    let riskTier: RiskTier;
    if (percentage >= 81) riskTier = RiskTier.VERY_LOW;
    else if (percentage >= 61) riskTier = RiskTier.LOW;
    else if (percentage >= 41) riskTier = RiskTier.MEDIUM;
    else if (percentage >= 21) riskTier = RiskTier.HIGH;
    else riskTier = RiskTier.VERY_HIGH;

    return {
      score: percentage,
      maxScore: 100,
      riskTier
    };
  }
}