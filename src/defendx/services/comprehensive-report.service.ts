import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// Enhanced interfaces for comprehensive report structure
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimatedImpact: number; // Percentage improvement expected
  implementationComplexity: 'low' | 'medium' | 'high';
  timeframe: string; // e.g., "30-60 days"
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  affectedSystems: string[];
  remediationSteps: string[];
}

export interface ComplianceFramework {
  coverage: number; // Percentage
  gaps: string[]; // Specific control IDs that are missing
  recommendations: string[]; // Reference to recommendation IDs
}

@Injectable()
export class ComprehensiveReportService {
  constructor(private prisma: PrismaService) {}

  async generateAssessmentReport(assessmentId: string) {
    try {
      // Fetch comprehensive assessment data
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
        }
      });

      if (!assessment) {
        return { success: false, message: 'Assessment not found' };
      }

      // Generate detailed scores and analysis
      const categoryBreakdown = this.calculateCategoryBreakdown(assessment.responses);
      const recommendations = await this.generateDetailedRecommendations(assessment);
      const vulnerabilities = this.identifyVulnerabilities(assessment.responses);
      const benchmarkData = await this.getBenchmarkingData(assessment.organizationId);
      const complianceMapping = this.mapComplianceFrameworks(assessment.responses);

      // Comprehensive report structure
      const reportData = {
        // Core Assessment Results
        assessment: {
          id: assessment.id,
          title: assessment.title,
          status: assessment.status,
          score: assessment.score,
          riskTier: assessment.riskTier,
          completedAt: assessment.completedAt,
          totalQuestions: assessment.responses.length,
          answeredQuestions: assessment.responses.filter(r => r.score !== null).length
        },

        // Detailed Category Analysis
        categoryAnalysis: {
          breakdown: categoryBreakdown,
          strengths: categoryBreakdown.filter((cat: any) => cat.percentage >= 80).map((cat: any) => cat.name),
          weaknesses: categoryBreakdown.filter((cat: any) => cat.percentage < 60).map((cat: any) => cat.name),
          improvementAreas: categoryBreakdown.filter((cat: any) => cat.percentage >= 60 && cat.percentage < 80).map((cat: any) => cat.name)
        },

        // Personalized Recommendations
        recommendations: {
          total: recommendations.length,
          byPriority: {
            high: recommendations.filter(r => r.priority === 'high').length,
            medium: recommendations.filter(r => r.priority === 'medium').length,
            low: recommendations.filter(r => r.priority === 'low').length
          },
          items: recommendations
        },

        // Vulnerability Assessment
        vulnerabilities: {
          total: vulnerabilities.length,
          bySeverity: {
            critical: vulnerabilities.filter(v => v.severity === 'critical').length,
            high: vulnerabilities.filter(v => v.severity === 'high').length,
            medium: vulnerabilities.filter(v => v.severity === 'medium').length,
            low: vulnerabilities.filter(v => v.severity === 'low').length
          },
          items: vulnerabilities
        },

        // Industry Benchmarking
        benchmarking: benchmarkData ? {
          regional: benchmarkData.regional,
          sectoral: benchmarkData.sectoral,
          sizeCategory: benchmarkData.sizeCategory,
          performanceInsights: {
            aboveAverage: assessment.score > (benchmarkData.regional.average || 0),
            percentileRank: benchmarkData.regional.position,
            improvementPotential: Math.max(0, 100 - assessment.score)
          }
        } : null,

        // Compliance Framework Mapping
        compliance: {
          frameworks: complianceMapping,
          overallCompliance: Math.round(
            Object.values(complianceMapping).reduce((acc: number, framework: any) => acc + framework.coverage, 0) / 
            Object.keys(complianceMapping).length
          )
        },

        // Executive Summary
        executiveSummary: {
          overallRating: this.getOverallRating(assessment.score),
          keyFindings: this.generateKeyFindings(assessment.score, categoryBreakdown, vulnerabilities),
          immediateActions: recommendations.filter(r => r.priority === 'high').slice(0, 3).map(r => r.title),
          strategicRecommendations: recommendations.filter(r => r.priority === 'medium').slice(0, 3).map(r => r.title)
        },

        // Trend Analysis (if previous assessments exist)
        trends: {
          previousScore: null, // Would be populated from previous assessments
          scoreImprovement: null,
          categoryTrends: null,
          progressionPath: this.getProgressionPath(assessment.score)
        },

        // Action Plan with Timeline
        actionPlan: {
          phase1: recommendations.filter(r => r.timeframe.includes('30')).map(r => ({
            action: r.title,
            priority: r.priority,
            impact: r.estimatedImpact
          })),
          phase2: recommendations.filter(r => r.timeframe.includes('60')).map(r => ({
            action: r.title,
            priority: r.priority,
            impact: r.estimatedImpact
          })),
          phase3: recommendations.filter(r => r.timeframe.includes('90')).map(r => ({
            action: r.title,
            priority: r.priority,
            impact: r.estimatedImpact
          }))
        },

        // Resource Requirements
        resources: {
          budgetEstimate: this.calculateBudgetEstimate(recommendations),
          humanResources: this.calculateHumanResourceNeeds(recommendations),
          timeline: this.calculateOverallTimeline(recommendations),
          trainingNeeds: this.identifyTrainingNeeds(categoryBreakdown)
        },

        // Organization Context
        organization: {
          id: assessment.organization.id,
          name: assessment.organization.name,
          sector: assessment.organization.sector,
          size: assessment.organization.size,
          country: assessment.organization.country,
          region: assessment.organization.region || 'Unknown'
        },

        // Report Metadata
        reportGenerated: new Date().toISOString(),
        reportVersion: "2.1",
        nextAssessmentRecommended: this.calculateNextAssessmentDate(assessment.completedAt)
      };

      return {
        success: true,
        data: reportData,
        message: "Assessment report generated successfully"
      };

    } catch (error) {
      console.error('Error generating assessment report:', error);
      return {
        success: false,
        message: 'Failed to generate assessment report'
      };
    }
  }

  // Enhanced Category Breakdown with proper scoring
  private calculateCategoryBreakdown(responses: any[]) {
    const categoryScores: { [key: string]: number } = {};
    const categoryTotals: { [key: string]: number } = {};
    const categoryMaxScores: { [key: string]: number } = {};

    responses.forEach(response => {
      const categoryName = response.question.category.name;
      const score = response.score || 0;
      const maxScore = response.question.weight || 1;

      if (!categoryScores[categoryName]) {
        categoryScores[categoryName] = 0;
        categoryTotals[categoryName] = 0;
        categoryMaxScores[categoryName] = 0;
      }

      categoryScores[categoryName] += score;
      categoryMaxScores[categoryName] += maxScore;
      categoryTotals[categoryName]++;
    });

    // Convert to detailed category objects with percentage scores
    const result = Object.keys(categoryScores).map(category => ({
      name: category,
      totalScore: categoryScores[category],
      maxScore: categoryMaxScores[category],
      percentage: categoryMaxScores[category] > 0 
        ? Math.round((categoryScores[category] / categoryMaxScores[category]) * 100 * 10) / 10
        : 0,
      questionCount: categoryTotals[category]
    }));

    return result;
  }

  // Detailed Recommendations Generation
  private async generateDetailedRecommendations(assessment: any): Promise<Recommendation[]> {
    const score = assessment.score || 0;
    const categoryScores = this.calculateCategoryBreakdown(assessment.responses);
    const recommendations: Recommendation[] = [];

    // Generate recommendations based on low-scoring categories
    categoryScores.forEach((category, index) => {
      if (category.percentage < 70) {
        recommendations.push({
          id: `rec-${index + 1}`,
          title: this.getRecommendationTitle(category.name, category.percentage),
          description: this.getRecommendationDescription(category.name, category.percentage),
          priority: category.percentage < 50 ? 'high' : category.percentage < 70 ? 'medium' : 'low',
          category: category.name.toLowerCase().replace(/\s+/g, '_'),
          estimatedImpact: Math.min(30, Math.round((70 - category.percentage) * 0.5)),
          implementationComplexity: this.getImplementationComplexity(category.name),
          timeframe: this.getTimeframe(category.name, category.percentage)
        });
      }
    });

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  // Vulnerability Identification
  private identifyVulnerabilities(responses: any[]): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    let vulnIndex = 1;

    responses.forEach(response => {
      if (response.score === 0 || (response.score / (response.question.weight || 1)) < 0.5) {
        const vulnerability = this.mapResponseToVulnerability(response, vulnIndex);
        if (vulnerability) {
          vulnerabilities.push(vulnerability);
          vulnIndex++;
        }
      }
    });

    return vulnerabilities.slice(0, 15); // Limit to top 15 vulnerabilities
  }

  // Benchmarking Data
  private async getBenchmarkingData(organizationId: string) {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId }
      });

      if (!org || !org.region) return null;

      const period = new Date().getFullYear() + '-Q' + Math.ceil((new Date().getMonth() + 1) / 3);

      // Get actual benchmark data from the database
      const [regionalBenchmark, sectoralBenchmark, sizeBenchmark] = await Promise.all([
        // Regional benchmark
        this.prisma.benchmarkData.findFirst({
          where: { region: org.region, period }
        }),
        // Sectoral benchmark
        this.prisma.benchmarkData.findFirst({
          where: { sector: org.sector, period }
        }),
        // Size benchmark
        this.prisma.benchmarkData.findFirst({
          where: { size: org.size, period }
        })
      ]);

      // Calculate actual percentiles from organization data
      const [regionalPercentile, sectoralPercentile, sizePercentile] = await Promise.all([
        this.calculatePercentilePosition(org.csiScore, { region: org.region }),
        this.calculatePercentilePosition(org.csiScore, { sector: org.sector }),
        this.calculatePercentilePosition(org.csiScore, { size: org.size })
      ]);

      return {
        regional: {
          average: regionalBenchmark?.avgScore || 0,
          position: regionalPercentile ? `${regionalPercentile}th percentile` : 'N/A',
          totalOrganizations: regionalBenchmark?.totalOrgs || 0
        },
        sectoral: {
          average: sectoralBenchmark?.avgScore || 0,
          position: sectoralPercentile ? `${sectoralPercentile}th percentile` : 'N/A',
          totalOrganizations: sectoralBenchmark?.totalOrgs || 0
        },
        sizeCategory: {
          average: sizeBenchmark?.avgScore || 0,
          position: sizePercentile ? `${sizePercentile}th percentile` : 'N/A',
          totalOrganizations: sizeBenchmark?.totalOrgs || 0
        }
      };
    } catch (error) {
      console.error('Error getting benchmarking data:', error);
      return null;
    }
  }

  // Calculate percentile position based on actual organization data
  private async calculatePercentilePosition(
    score: number | null,
    filter: { region?: string; sector?: string; size?: string }
  ): Promise<number | null> {
    if (!score) return null;

    const where: any = {
      csiScore: { not: null },
      isActive: true,
    };

    if (filter.region) where.region = filter.region;
    if (filter.sector) where.sector = filter.sector;
    if (filter.size) where.size = filter.size;

    // Get all scores in this category
    const organizations = await this.prisma.organization.findMany({
      where,
      select: { csiScore: true },
      orderBy: { csiScore: 'asc' },
    });

    if (organizations.length === 0) return null;

    // Count how many organizations have a lower score
    const lowerCount = organizations.filter(
      (o) => o.csiScore !== null && o.csiScore < score
    ).length;

    // Calculate percentile
    const percentile = Math.round((lowerCount / organizations.length) * 100);

    return percentile;
  }

  // Compliance Framework Mapping
  private mapComplianceFrameworks(responses: any[]): { [key: string]: ComplianceFramework } {
    const totalQuestions = responses.length;
    const answeredCorrectly = responses.filter(r => (r.score / (r.question.weight || 1)) > 0.7).length;
    
    const coverage = Math.round((answeredCorrectly / totalQuestions) * 100);

    return {
      iso27001: {
        coverage: coverage,
        gaps: this.getISO27001Gaps(responses),
        recommendations: ["rec-1", "rec-2"]
      },
      nist: {
        coverage: Math.max(0, coverage - 5),
        gaps: this.getNISTGaps(responses),
        recommendations: ["rec-1"]
      }
    };
  }

  // Helper Methods for Report Enhancement
  private getOverallRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Satisfactory';
    if (score >= 60) return 'Needs Improvement';
    return 'Critical';
  }

  private generateKeyFindings(score: number, categories: any[], vulnerabilities: Vulnerability[]): string[] {
    const findings = [];
    
    if (score < 60) {
      findings.push('Overall cybersecurity posture requires immediate attention');
    }
    
    const weakCategories = categories.filter(c => c.percentage < 60);
    if (weakCategories.length > 0) {
      findings.push(`${weakCategories.length} categories identified as high-risk areas`);
    }
    
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      findings.push(`${criticalVulns.length} critical vulnerabilities require immediate remediation`);
    }
    
    return findings;
  }

  private getProgressionPath(score: number): string[] {
    const path = [];
    
    if (score < 40) {
      path.push('Foundation Building', 'Basic Controls', 'Risk Management', 'Advanced Security');
    } else if (score < 60) {
      path.push('Control Enhancement', 'Risk Management', 'Advanced Security', 'Security Excellence');
    } else if (score < 80) {
      path.push('Advanced Security', 'Security Excellence', 'Industry Leadership');
    } else {
      path.push('Security Excellence', 'Industry Leadership', 'Innovation Leadership');
    }
    
    return path;
  }

  private calculateBudgetEstimate(recommendations: Recommendation[]): string {
    const baseCosts = {
      high: 50000,
      medium: 25000,
      low: 10000
    };
    
    const total = recommendations.reduce((sum, rec) => {
      return sum + baseCosts[rec.priority];
    }, 0);
    
    return `$${(total / 1000).toFixed(0)}K - $${((total * 1.5) / 1000).toFixed(0)}K`;
  }

  private calculateHumanResourceNeeds(recommendations: Recommendation[]): string[] {
    const resources = new Set<string>();
    
    recommendations.forEach(rec => {
      if (rec.category.includes('governance')) resources.add('Security Manager');
      if (rec.category.includes('network')) resources.add('Network Security Specialist');
      if (rec.category.includes('training')) resources.add('Security Awareness Coordinator');
      if (rec.category.includes('incident')) resources.add('Incident Response Team Lead');
    });
    
    return Array.from(resources);
  }

  private calculateOverallTimeline(recommendations: Recommendation[]): string {
    const maxTimeframes = recommendations.map(r => parseInt(r.timeframe.split('-')[1] || '30'));
    const maxDays = Math.max(...maxTimeframes);
    
    if (maxDays <= 60) return '2-3 months';
    if (maxDays <= 90) return '3-4 months';
    return '4-6 months';
  }

  private identifyTrainingNeeds(categories: any[]): string[] {
    const needs = [];
    
    categories.forEach(cat => {
      if (cat.percentage < 60) {
        if (cat.name.includes('Staff')) needs.push('Security Awareness Training');
        if (cat.name.includes('Incident')) needs.push('Incident Response Training');
        if (cat.name.includes('Access')) needs.push('Identity Management Training');
      }
    });
    
    return [...new Set(needs)];
  }

  private calculateNextAssessmentDate(completedAt: Date | null): string {
    if (!completedAt) return new Date().toISOString();
    
    const nextDate = new Date(completedAt);
    nextDate.setMonth(nextDate.getMonth() + 6); // Recommend 6 months later
    return nextDate.toISOString();
  }

  // Detailed Helper Methods
  private getRecommendationTitle(category: string, score: number): string {
    const titleMap: { [key: string]: string } = {
      'Governance & Policy': 'Strengthen Cybersecurity Governance Framework',
      'Access & Authentication': 'Implement Multi-Factor Authentication',
      'Data Protection': 'Enhance Data Classification Program',
      'Staff Awareness & Training': 'Expand Security Awareness Training',
      'Incident Response & Recovery': 'Improve Incident Response Procedures',
      'Network & System Security': 'Strengthen Network Security Controls',
      'Physical & Environmental Security': 'Enhance Physical Security Measures',
      'Vendor & Third-Party Security': 'Improve Third-Party Risk Management',
      'Compliance & Audit': 'Strengthen Compliance Monitoring',
      'Technology & Innovation Readiness': 'Modernize Security Technology Stack'
    };
    
    return titleMap[category] || `Improve ${category} Controls`;
  }

  private getRecommendationDescription(category: string, score: number): string {
    const descMap: { [key: string]: string } = {
      'Governance & Policy': 'Establish comprehensive cybersecurity policies and governance structures to guide organizational security efforts',
      'Access & Authentication': 'Deploy multi-factor authentication across all critical systems to enhance access security',
      'Data Protection': 'Establish formal data classification and handling procedures to protect sensitive information',
      'Staff Awareness & Training': 'Implement regular security awareness training programs to educate employees about cyber threats',
      'Incident Response & Recovery': 'Develop and test incident response procedures to ensure rapid threat containment',
      'Network & System Security': 'Implement network segmentation and advanced monitoring to detect and prevent intrusions',
      'Physical & Environmental Security': 'Strengthen physical access controls and environmental monitoring systems',
      'Vendor & Third-Party Security': 'Establish vendor risk assessment and monitoring programs for third-party relationships',
      'Compliance & Audit': 'Implement regular compliance monitoring and audit procedures to ensure regulatory adherence',
      'Technology & Innovation Readiness': 'Modernize security infrastructure to support current and emerging threats'
    };
    
    return descMap[category] || `Address security gaps in ${category} to improve overall security posture`;
  }

  private getImplementationComplexity(category: string): 'low' | 'medium' | 'high' {
    const complexityMap: { [key: string]: 'low' | 'medium' | 'high' } = {
      'Governance & Policy': 'medium',
      'Access & Authentication': 'medium',
      'Data Protection': 'high',
      'Staff Awareness & Training': 'low',
      'Incident Response & Recovery': 'medium',
      'Network & System Security': 'high',
      'Physical & Environmental Security': 'medium',
      'Vendor & Third-Party Security': 'high',
      'Compliance & Audit': 'medium',
      'Technology & Innovation Readiness': 'high'
    };
    
    return complexityMap[category] || 'medium';
  }

  private getTimeframe(category: string, score: number): string {
    if (score < 40) return '30-60 days';
    if (score < 60) return '60-90 days';
    return '90-120 days';
  }

  private mapResponseToVulnerability(response: any, index: number): Vulnerability | null {
    if (!response.question) return null;

    const severityMap = {
      'Access & Authentication': 'high',
      'Data Protection': 'high', 
      'Network & System Security': 'critical',
      'Incident Response & Recovery': 'high',
      'Governance & Policy': 'medium'
    };

    const category = response.question.category.name;
    const severity = severityMap[category as keyof typeof severityMap] || 'medium';

    return {
      id: `vuln-${index}`,
      title: this.getVulnerabilityTitle(response.question.text),
      description: `Security gap identified: ${response.question.text}`,
      severity: severity as 'critical' | 'high' | 'medium' | 'low',
      category: category.toLowerCase().replace(/\s+/g, '_'),
      affectedSystems: this.getAffectedSystems(category),
      remediationSteps: this.getRemediationSteps(category)
    };
  }

  private getVulnerabilityTitle(questionText: string): string {
    if (questionText.toLowerCase().includes('password')) return 'Weak Password Policies';
    if (questionText.toLowerCase().includes('access')) return 'Inadequate Access Controls';
    if (questionText.toLowerCase().includes('backup')) return 'Insufficient Backup Procedures';
    if (questionText.toLowerCase().includes('encryption')) return 'Missing Encryption Controls';
    if (questionText.toLowerCase().includes('monitoring')) return 'Inadequate Security Monitoring';
    return 'Security Control Gap';
  }

  private getAffectedSystems(category: string): string[] {
    const systemMap: { [key: string]: string[] } = {
      'Access & Authentication': ['Active Directory', 'Web Applications', 'Database Systems'],
      'Data Protection': ['File Servers', 'Databases', 'Cloud Storage'],
      'Network & System Security': ['Firewalls', 'Routers', 'Servers'],
      'Incident Response & Recovery': ['All Systems', 'Monitoring Tools'],
      'Governance & Policy': ['Organization-wide']
    };
    
    return systemMap[category] || ['General Systems'];
  }

  private getRemediationSteps(category: string): string[] {
    const stepsMap: { [key: string]: string[] } = {
      'Access & Authentication': [
        'Implement multi-factor authentication',
        'Review and update access permissions',
        'Enable account lockout policies'
      ],
      'Data Protection': [
        'Implement data classification scheme',
        'Deploy encryption for sensitive data',
        'Establish data handling procedures'
      ],
      'Network & System Security': [
        'Update firewall rules',
        'Deploy network monitoring tools',
        'Implement network segmentation'
      ]
    };
    
    return stepsMap[category] || ['Review and update security controls', 'Implement monitoring', 'Train staff'];
  }

  private getISO27001Gaps(responses: any[]): string[] {
    // Simplified gap analysis
    const gaps = [];
    const lowScoreCategories = responses
      .filter(r => (r.score / (r.question.weight || 1)) < 0.5)
      .map(r => r.question.category.name);
    
    if (lowScoreCategories.includes('Access & Authentication')) gaps.push('A.9.1.2');
    if (lowScoreCategories.includes('Data Protection')) gaps.push('A.12.1.2');
    if (lowScoreCategories.includes('Incident Response & Recovery')) gaps.push('A.16.1.1');
    
    return gaps;
  }

  private getNISTGaps(responses: any[]): string[] {
    // Simplified NIST gap analysis
    const gaps = [];
    const lowScoreCategories = responses
      .filter(r => (r.score / (r.question.weight || 1)) < 0.5)
      .map(r => r.question.category.name);
    
    if (lowScoreCategories.includes('Access & Authentication')) gaps.push('PR.AC-4');
    if (lowScoreCategories.includes('Network & System Security')) gaps.push('DE.CM-1');
    
    return gaps;
  }
}