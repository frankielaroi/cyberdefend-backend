import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { SubmitResponseDto } from '../dto/submit-response.dto';
import { BulkSubmitResponseDto } from '../dto/bulk-submit-response.dto';
import { QuestionService } from './question.service';
import { BenchmarkService } from './benchmark.service';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private questionService: QuestionService,
    private benchmarkService: BenchmarkService,
  ) {}

  async startAssessment(userId: string, organizationId: string, createAssessmentDto: CreateAssessmentDto) {
    // Verify user belongs to organization
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
        isActive: true,
      },
    });

    if (!user) {
      throw new ForbiddenException('Access denied to this organization');
    }

    // Check if there's an active assessment
    const activeAssessment = await this.prisma.assessment.findFirst({
      where: {
        organizationId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
    });

    if (activeAssessment) {
      throw new ForbiddenException('An assessment is already in progress');
    }

    // Create new assessment
    const assessment = await this.prisma.assessment.create({
      data: {
        title: createAssessmentDto.title,
        description: createAssessmentDto.description,
        type: (createAssessmentDto.type as any) || 'CSI_ASSESSMENT',
        status: 'IN_PROGRESS',
        organizationId,
        userId,
        startedAt: new Date(),
      },
    });

    // Get questions for the assessment
    const questions = await this.questionService.getActiveQuestions();

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status,
        startedAt: assessment.startedAt,
      },
      questions: questions.map(q => ({
        id: q.id,
        text: q.text,
        description: q.description,
        type: q.type,
        isRequired: q.isRequired,
        options: q.options?.map(o => ({
          id: o.id,
          text: o.text,
          value: o.value,
        })),
      })),
    };
  }

  async submitResponse(userId: string, assessmentId: string, submitResponseDto: SubmitResponseDto) {
    // Verify assessment belongs to user's organization
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        status: 'IN_PROGRESS',
        user: {
          id: userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found or not accessible');
    }

    // Get question details for scoring
    const question = await this.prisma.question.findUnique({
      where: { id: submitResponseDto.questionId },
      include: { options: true },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Calculate score for the response
    let score = 0;
    if (question.type === 'YES_NO' || question.type === 'SINGLE_CHOICE') {
      const selectedOption = question.options.find(
        option => option.value === submitResponseDto.answer
      );
      score = selectedOption?.score || 0;
    } else if (question.type === 'MULTIPLE_CHOICE') {
      const answers = Array.isArray(submitResponseDto.answer) 
        ? submitResponseDto.answer 
        : [submitResponseDto.answer];
      
      score = answers.reduce((total, answer) => {
        const option = question.options.find(opt => opt.value === answer);
        return total + (option?.score || 0);
      }, 0);
    }

    // Apply question weight
    score = score * question.weight;

    // Upsert response
    await this.prisma.assessmentResponse.upsert({
      where: {
        assessmentId_questionId: {
          assessmentId,
          questionId: submitResponseDto.questionId,
        },
      },
      update: {
        answer: JSON.stringify(submitResponseDto.answer),
        score,
        timeSpent: submitResponseDto.timeSpent,
      },
      create: {
        assessmentId,
        questionId: submitResponseDto.questionId,
        answer: JSON.stringify(submitResponseDto.answer),
        score,
        timeSpent: submitResponseDto.timeSpent,
      },
    });

    return { message: 'Response saved successfully' };
  }

  async submitBulkResponse(userId: string, bulkSubmitDto: BulkSubmitResponseDto) {
    const { assessmentId, responses } = bulkSubmitDto;

    // Verify assessment belongs to user's organization
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        status: 'IN_PROGRESS',
        user: {
          id: userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found or not accessible');
    }

    // Get all questions for validation and scoring
    const questionIds = responses.map(r => r.questionId);
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { options: true },
    });

    if (questions.length !== questionIds.length) {
      throw new NotFoundException('One or more questions not found');
    }

    // Process each response
    const processedResponses = [];
    for (const responseDto of responses) {
      const question = questions.find(q => q.id === responseDto.questionId);
      if (!question) continue;

      // Calculate score for the response
      let score = 0;
      if (question.type === 'YES_NO' || question.type === 'SINGLE_CHOICE') {
        const selectedOption = question.options.find(
          option => option.value === responseDto.answer
        );
        score = selectedOption?.score || 0;
      } else if (question.type === 'MULTIPLE_CHOICE') {
        const answers = Array.isArray(responseDto.answer) 
          ? responseDto.answer 
          : [responseDto.answer];
        
        score = answers.reduce((total, answer) => {
          const option = question.options.find(opt => opt.value === answer);
          return total + (option?.score || 0);
        }, 0);
      }

      // Apply question weight
      score = score * question.weight;

      processedResponses.push({
        assessmentId,
        questionId: responseDto.questionId,
        answer: JSON.stringify(responseDto.answer),
        score,
        timeSpent: responseDto.timeSpent,
      });
    }

    // Bulk upsert responses using transaction
    await this.prisma.$transaction(async (tx) => {
      for (const response of processedResponses) {
        await tx.assessmentResponse.upsert({
          where: {
            assessmentId_questionId: {
              assessmentId: response.assessmentId,
              questionId: response.questionId,
            },
          },
          update: {
            answer: response.answer,
            score: response.score,
            timeSpent: response.timeSpent,
          },
          create: response,
        });
      }
    });

    return { 
      message: 'All responses saved successfully',
      processedCount: processedResponses.length,
      assessmentId 
    };
  }

  async completeAssessment(userId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        user: { id: userId },
        status: 'IN_PROGRESS',
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                category: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found or not accessible');
    }

    // Calculate total score
    const totalScore = assessment.responses.reduce((sum, response) => sum + (response.score || 0), 0);
    const maxPossibleScore = assessment.responses.reduce((sum, response) => {
      return sum + (response.question.weight * 10); // Assuming max score per question is 10
    }, 0);

    const finalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    const riskTier = this.calculateRiskTier(finalScore);

    // Get benchmarks
    const benchmarks = await this.benchmarkService.getBenchmarks(
      assessment.organization.region,
      assessment.organization.sector,
      assessment.organization.size,
    );

    // Update assessment
    const completedAssessment = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        score: finalScore,
        maxScore: maxPossibleScore,
        riskTier: riskTier as any,
        benchmarkRegion: benchmarks.regional,
        benchmarkSector: benchmarks.sectoral,
        benchmarkSize: benchmarks.sizeBased,
        completedAt: new Date(),
      },
    });

    // Update organization CSI score
    await this.prisma.organization.update({
      where: { id: assessment.organizationId },
      data: {
        csiScore: finalScore,
        riskTier: riskTier as any,
      },
    });

    return {
      assessment: {
        id: completedAssessment.id,
        score: finalScore,
        riskTier,
        benchmarks,
        completedAt: completedAssessment.completedAt,
      },
    };
  }

  async getAssessmentResult(userId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        user: { organizationId: { not: null } },
      },
      include: {
        responses: {
          include: {
            question: {
              include: {
                category: true,
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            sector: true,
            size: true,
            region: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Check if user has access to this assessment
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.organizationId !== assessment.organizationId) {
      throw new ForbiddenException('Access denied to this assessment');
    }

    // Group responses by category
    const categoryScores = {};
    assessment.responses.forEach(response => {
      const categoryName = response.question.category.name;
      if (!categoryScores[categoryName]) {
        categoryScores[categoryName] = {
          name: categoryName,
          weight: response.question.category.weight,
          totalScore: 0,
          maxScore: 0,
          responses: 0,
        };
      }
      categoryScores[categoryName].totalScore += response.score || 0;
      categoryScores[categoryName].maxScore += response.question.weight * 10;
      categoryScores[categoryName].responses += 1;
    });

    return {
      assessment: {
        id: assessment.id,
        title: assessment.title,
        score: assessment.score,
        riskTier: assessment.riskTier,
        benchmarkRegion: assessment.benchmarkRegion,
        benchmarkSector: assessment.benchmarkSector,
        benchmarkSize: assessment.benchmarkSize,
        completedAt: assessment.completedAt,
      },
      organization: assessment.organization,
      categoryBreakdown: Object.values(categoryScores),
      recommendations: this.generateRecommendations(assessment.riskTier, categoryScores),
    };
  }

  async getOrganizationAssessments(userId: string, organizationId: string, page: number = 1, limit: number = 10) {
    // Verify user has access to this organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    const skip = (page - 1) * limit;
    const take = limit;

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where: {
          organizationId,
        },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          score: true,
          riskTier: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.assessment.count({
        where: { organizationId },
      }),
    ]);

    return {
      data: assessments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getDashboardStats(userId: string, organizationId: string) {
    // Verify user has access to this organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.organizationId !== organizationId) {
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
        where: { organizationId, status: 'COMPLETED' },
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
        where: { organizationId, status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        select: { score: true, completedAt: true },
      }),
      this.prisma.assessment.findMany({
        where: { organizationId, status: 'COMPLETED' },
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

  private calculateRiskTier(score: number): string {
    if (score >= 81) return 'VERY_LOW';
    if (score >= 61) return 'LOW';
    if (score >= 41) return 'MEDIUM';
    if (score >= 21) return 'HIGH';
    return 'VERY_HIGH';
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
}