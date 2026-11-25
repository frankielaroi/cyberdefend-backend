import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashToken } from '../../common/utils/token.util';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      throw new UnauthorizedException('API key required');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { apiKey: hashToken(apiKey) },
      select: { id: true, organizationId: true, isActive: true },
    });

    if (!agent || !agent.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    // Attach agent info to request for later use
    request.agent = agent;
    
    return true;
  }
}