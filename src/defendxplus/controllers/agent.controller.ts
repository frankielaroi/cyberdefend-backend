import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { AgentService } from '../services/agent.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('defendxplus-agents')
@Controller('defendxplus/agents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('register')
  @ApiOperation({ summary: 'Register a new endpoint agent; returns authentication token and config' })
  @ApiResponse({ status: 201, description: 'Agent registered successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async registerAgent(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() registerAgentDto: any, // TODO: Create proper DTO
  ) {
    return this.agentService.registerAgent(userId, organizationId, registerAgentDto);
  }

  @Get(':id/config')
  @ApiOperation({ summary: 'Retrieve current agent configuration (sampling rate, rule set, etc.)' })
  @ApiResponse({ status: 200, description: 'Agent configuration retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  async getAgentConfig(
    @GetUser('organizationId') organizationId: string,
    @Param('id') agentId: string,
  ) {
    return this.agentService.getAgentConfig(organizationId, agentId);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents for the organization' })
  @ApiResponse({ status: 200, description: 'Agents retrieved successfully' })
  async getAgents(
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.agentService.getAgents(organizationId);
  }

  @Post(':id/heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update agent last seen timestamp' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded successfully' })
  @ApiParam({ name: 'id', description: 'Agent ID' })
  async agentHeartbeat(
    @Param('id') agentId: string,
  ) {
    return this.agentService.updateHeartbeat(agentId);
  }
}