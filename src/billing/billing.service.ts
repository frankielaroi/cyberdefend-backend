import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getPlans(csiScore?: number) {
    // This is a simplified implementation - in a real scenario,
    // you'd have a plans table in your database
    const basePlans = [
      {
        id: 'basic',
        name: 'DefendX Basic',
        description: 'Essential cybersecurity monitoring',
        price: 99,
        currency: 'USD',
        billing: 'monthly',
        features: [
          'Basic vulnerability scanning',
          'Email alerts',
          'Monthly reports',
          'Standard support',
        ],
        recommended: false,
      },
      {
        id: 'professional',
        name: 'DefendX Professional',
        description: 'Advanced security with threat intelligence',
        price: 299,
        currency: 'USD',
        billing: 'monthly',
        features: [
          'Advanced vulnerability scanning',
          'Real-time monitoring',
          'Threat intelligence feeds',
          'Weekly reports',
          'Priority support',
          'Compliance templates',
        ],
        recommended: false,
      },
      {
        id: 'enterprise',
        name: 'DefendX Enterprise',
        description: 'Complete cybersecurity solution',
        price: 599,
        currency: 'USD',
        billing: 'monthly',
        features: [
          'Full security suite',
          '24/7 monitoring',
          'Advanced threat hunting',
          'Custom reporting',
          'Dedicated support',
          'API access',
          'Custom integrations',
        ],
        recommended: false,
      },
    ];

    // Recommend plans based on CSI score
    if (csiScore !== undefined) {
      if (csiScore < 40) {
        // High/Very High risk - recommend Enterprise
        basePlans.find(p => p.id === 'enterprise')!.recommended = true;
      } else if (csiScore < 70) {
        // Medium risk - recommend Professional
        basePlans.find(p => p.id === 'professional')!.recommended = true;
      } else {
        // Low risk - recommend Basic
        basePlans.find(p => p.id === 'basic')!.recommended = true;
      }
    }

    return {
      plans: basePlans,
      recommendations: this.generateRecommendations(csiScore),
    };
  }

  private generateRecommendations(csiScore?: number) {
    if (csiScore === undefined) {
      return {
        message: 'Complete a CSI assessment to get personalized plan recommendations',
        urgency: 'info',
      };
    }

    if (csiScore < 40) {
      return {
        message: 'Your organization is at high risk. We strongly recommend our Enterprise plan for comprehensive protection.',
        urgency: 'high',
        benefits: [
          '24/7 monitoring will detect threats immediately',
          'Advanced threat hunting will proactively identify risks',
          'Dedicated support will help improve your security posture',
        ],
      };
    } else if (csiScore < 70) {
      return {
        message: 'Your security posture needs improvement. Our Professional plan offers enhanced protection.',
        urgency: 'medium',
        benefits: [
          'Real-time monitoring will catch threats faster',
          'Threat intelligence will keep you ahead of emerging risks',
          'Compliance templates will help meet regulatory requirements',
        ],
      };
    } else {
      return {
        message: 'Great security posture! Our Basic plan will help maintain your current level.',
        urgency: 'low',
        benefits: [
          'Regular scanning will maintain your security baseline',
          'Monthly reports will track your progress',
          'Email alerts will notify you of any changes',
        ],
      };
    }
  }
}