import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ 
    summary: 'Get available subscription plans',
    description: 'Returns available DefendX subscription plans. If CSI score is provided, plans will include recommendations based on risk level.'
  })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  @ApiQuery({ 
    name: 'csiScore', 
    required: false, 
    description: 'Current CSI score (0-100) for personalized recommendations',
    type: Number 
  })
  async getPlans(@Query('csiScore') csiScore?: number) {
    return this.billingService.getPlans(csiScore);
  }

  @UseGuards(JwtAuthGuard)
  @Get('plans/recommendations')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get personalized plan recommendations',
    description: 'Returns plan recommendations based on the users organization latest CSI assessment'
  })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No CSI assessment found for organization' })
  async getPersonalizedRecommendations() {
    // This would fetch the user's organization CSI score and return recommendations
    // For now, returning general recommendations
    return this.billingService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current subscription details',
    description: 'Returns the current users organization subscription information'
  })
  @ApiResponse({ status: 200, description: 'Subscription details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async getCurrentSubscription(@GetUser() user: any) {
    const organizationId = user.organizationId;
    
    if (!organizationId) {
      throw new Error('User must belong to an organization');
    }
    
    // Mock subscription data for now
    return {
      id: 'sub_123456',
      organizationId,
      planName: 'DefendX Pro',
      status: 'active',
      currentPeriodStart: new Date('2025-01-01'),
      currentPeriodEnd: new Date('2025-12-31'),
      features: [
        'Unlimited CSI Assessments',
        'DefendX+ Monitoring',
        'Phishing Simulations',
        'Advanced Analytics',
        'Priority Support'
      ],
      billing: {
        amount: 9900, // $99.00 in cents
        currency: 'USD',
        interval: 'month'
      }
    };
  }
}