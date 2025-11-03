import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BackupAgentGuard implements CanActivate {
  private readonly logger = new Logger(BackupAgentGuard.name);

  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Log header keys (not values) to help diagnose header name mismatches
    try {
      const headerKeys = Object.keys(request.headers || {}).join(', ');
      this.logger.log(`Incoming header keys: ${headerKeys}`);
    } catch (e) {
      // ignore logging failures
    }
    const token = this.extractTokenFromHeader(request);
    // accept a few common header name variants (express lowercases headers by default)
    const organizationId =
      request.headers['organization-id'] || request.headers['organizationid'] || request.headers['organization'];

    if (!token || !organizationId) {
      // Avoid logging raw tokens — log which piece is missing for debugging
      const missing = [] as string[];
      if (!token) missing.push('Authorization');
      if (!organizationId) missing.push('organization-id');
      this.logger.debug(`Agent auth failed - missing: ${missing.join(', ')}`);
      throw new UnauthorizedException('Missing token or organization-id');
    }

    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        token,
        organizationId,
      },
    });

    if (!agent) {
      this.logger.debug(`Agent auth failed - no agent found for organizationId=${organizationId}`);
      throw new UnauthorizedException('Invalid agent credentials');
    }

    // Attach minimal agent info to request for later use
    request.agent = { id: agent.id, name: agent.name };
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers['Authorization'] || request.headers['Authorization'];
    if (!authHeader) return undefined;

    // Convert to string in case it's an array
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : String(authHeader);
    
    // Remove 'Bearer ' prefix if it exists, case insensitive
    const token = headerValue.replace(/^bearer\s+/i, '').trim();
    
    return token || undefined;
  }
}