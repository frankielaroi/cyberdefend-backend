import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AgentService {
  constructor(private prisma: PrismaService) {}

  async registerAgent(userId: string, organizationId: string, registerAgentDto: any) {
    const apiKey = this.generateApiKey();
    
    const agent = await this.prisma.agent.create({
      data: {
        name: registerAgentDto.name,
        version: registerAgentDto.version,
        osType: registerAgentDto.osType,
        osVersion: registerAgentDto.osVersion,
        hostname: registerAgentDto.hostname,
        ipAddress: registerAgentDto.ipAddress,
        macAddress: registerAgentDto.macAddress,
        organizationId,
        apiKey,
      },
    });

    return {
      message: 'Agent registered successfully',
      agentId: agent.id,
      apiKey: agent.apiKey,
      config: {
        samplingRate: 100, // Default 100%
        reportingInterval: 60, // 60 seconds
        rules: [], // Default empty rules
        endpoints: {
          telemetry: '/defendxplus/telemetry',
          heartbeat: `/defendxplus/agents/${agent.id}/heartbeat`,
        },
      },
      data: {
        id: agent.id,
        name: agent.name,
        hostname: agent.hostname,
        createdAt: agent.createdAt,
      },
    };
  }

  async getAgentConfig(organizationId: string, agentId: string) {
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId,
      },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    // TODO: Implement dynamic configuration based on organization rules
    return {
      agentId: agent.id,
      config: {
        samplingRate: 100,
        reportingInterval: 60,
        rules: [
          {
            id: 'suspicious-process',
            type: 'process',
            pattern: '*.exe',
            action: 'report',
          },
          {
            id: 'network-scan',
            type: 'network',
            pattern: 'port-scan',
            action: 'alert',
          },
        ],
        endpoints: {
          telemetry: '/defendxplus/telemetry',
          heartbeat: `/defendxplus/agents/${agent.id}/heartbeat`,
        },
      },
      lastUpdated: new Date(),
    };
  }

  async getAgents(organizationId: string) {
    const agents = await this.prisma.agent.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        version: true,
        osType: true,
        osVersion: true,
        hostname: true,
        ipAddress: true,
        isActive: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: {
        lastSeen: 'desc',
      },
    });

    return {
      data: agents.map(agent => ({
        ...agent,
        status: this.getAgentStatus(agent.lastSeen),
      })),
      total: agents.length,
    };
  }

  async updateHeartbeat(agentId: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    await this.prisma.agent.update({
      where: { id: agentId },
      data: {
        lastSeen: new Date(),
        isActive: true,
      },
    });

    return {
      message: 'Heartbeat recorded successfully',
      timestamp: new Date(),
    };
  }

  private generateApiKey(): string {
    return randomBytes(32).toString('hex');
  }

  private getAgentStatus(lastSeen: Date): string {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'warning';
    return 'offline';
  }
}