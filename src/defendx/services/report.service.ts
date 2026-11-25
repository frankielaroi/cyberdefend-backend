import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BenchmarkService } from './benchmark.service';

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private benchmarkService: BenchmarkService
  ) {}

  async generateAssessmentReport(assessmentId: string, options: {
    includeDetails?: boolean;
    includeRecommendations?: boolean;
    includeBenchmarks?: boolean;
  } = {}) {
    // TODO: honour options (includeDetails, includeRecommendations, includeBenchmarks); currently always included
    void options;

    try {
      const assessment = await this.prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          organization: true,
          responses: {
            include: {
              question: {
                include: {
                  category: true
                }
              }
            }
          }
        },
      });

      if (!assessment) {
        return { success: false, message: 'Assessment not found' };
      }

      const categories = this.calculateCategoryBreakdown(assessment.responses);
      const recommendations = this.generateRecommendations(
        assessment.score,
        assessment.riskTier,
      );

      const reportData = {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          score: assessment.score,
          riskTier: assessment.riskTier,
          completedAt: assessment.completedAt,
        },
        organization: {
          name: assessment.organization.name,
          sector: assessment.organization.sector,
          size: assessment.organization.size,
        },
        categories,
        recommendations,
        generatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        data: reportData,
      };
    } catch (error) {
      console.error('Error generating basic report:', error);
      return {
        success: false,
        message: 'Failed to generate report',
      };
    }
  }

  private calculateCategoryBreakdown(responses: any[]) {
    const categories = {};
    
    responses.forEach(response => {
      const categoryName = response.question.category.name;
      if (!categories[categoryName]) {
        categories[categoryName] = {
          name: categoryName,
          totalScore: 0,
          maxScore: 0,
          percentage: 0,
        };
      }
      categories[categoryName].totalScore += response.score || 0;
      categories[categoryName].maxScore += response.question.weight * 10;
    });

    // Calculate percentages
    Object.values(categories).forEach((category: any) => {
      category.percentage = category.maxScore > 0 
        ? (category.totalScore / category.maxScore) * 100 
        : 0;
    });

    return Object.values(categories);
  }

  private generateRecommendations(score: number, riskTier: string): string[] {
    const recommendations = [];

    switch (riskTier) {
      case 'VERY_HIGH':
        recommendations.push(
          'Implement immediate cybersecurity measures',
          'Conduct emergency security audit',
          'Train all staff on security best practices',
          'Review and update all security policies',
        );
        break;
      case 'HIGH':
        recommendations.push(
          'Strengthen access controls',
          'Implement multi-factor authentication',
          'Regular security training programs',
          'Update incident response procedures',
        );
        break;
      case 'MEDIUM':
        recommendations.push(
          'Continue regular security assessments',
          'Enhance monitoring capabilities',
          'Review security policies quarterly',
        );
        break;
      case 'LOW':
        recommendations.push(
          'Maintain current security posture',
          'Consider advanced security tools',
          'Regular security awareness training',
        );
        break;
      case 'VERY_LOW':
        recommendations.push(
          'Excellent security posture',
          'Consider industry leadership role',
          'Share best practices with peers',
        );
        break;
    }

    return recommendations;
  }
}