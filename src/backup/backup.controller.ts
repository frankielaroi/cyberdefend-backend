import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  Body,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { BackupService } from './backup.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateBackupAgentDto } from './dto/agent.dto';
import { CreateBackupJobDto, UpdateBackupJobStatusDto } from './dto/backup-job.dto';

@ApiTags('Backup')
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('organization')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ summary: 'Get all backups for the authenticated user\'s organization' })
  @ApiResponse({ status: 200, description: 'List of organization backups' })
  async getOrganizationBackups(@GetUser('organizationId') organizationId: string) {
    return this.backupService.getOrganizationBackups(organizationId);
  }

  @Get('organization/:backupId/download')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ summary: 'Get a pre-signed download URL for a backup' })
  @ApiResponse({ status: 200, description: 'Pre-signed download URL' })
  async getBackupDownloadUrl(
    @Param('backupId') backupId: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.backupService.getBackupDownloadUrl(backupId, organizationId);
  }

  @Delete('organization/:backupId')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ summary: 'Delete a backup' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  async deleteBackup(
    @Param('backupId') backupId: string,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.backupService.deleteBackup(backupId, organizationId);
  }

  @Get('agents')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ summary: 'List all backup agents for the authenticated user\'s organization' })
  @ApiResponse({ status: 200, description: 'List of backup agents' })
  async getOrganizationAgents(@GetUser('organizationId') organizationId: string) {
    return this.backupService.getOrganizationAgents(organizationId);
  }

  @Post('agents')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ summary: 'Create a new backup agent for the authenticated user\'s organization' })
  @ApiResponse({ status: 201, description: 'Agent created successfully' })
  async createAgent(
    @Body() dto: CreateBackupAgentDto,
    @GetUser('organizationId') organizationId: string,
  ) {
    return this.backupService.createBackupAgent(dto, organizationId);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create a new backup job' })
  @ApiResponse({ status: 201, description: 'Backup job created successfully' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  @Public()
  async createJob(
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string,
    @Body() dto: CreateBackupJobDto
  ) {
    // Remove organizationId and agentId from DTO since we're getting them from headers
    const { organizationId: _, agentId: __, ...cleanDto } = dto;
    return this.backupService.createBackupJob(cleanDto as CreateBackupJobDto, organizationId, agentId, agentJwt);
  }

  @Get('jobs')
  @Public()
  @ApiOperation({ summary: 'Get all backup jobs for an organization' })
  @ApiResponse({ status: 200, description: 'List of backup jobs' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  async getJobs(
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string
  ) {
    return this.backupService.getBackupJobs(organizationId, agentId, agentJwt);
  }

  @Get('backups')
  @Public()
  @ApiOperation({ summary: 'Get all backups for an organization' })
  @ApiResponse({ status: 200, description: 'List of backups' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  async getBackups(
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string
  ) {
    return this.backupService.getBackupsByOrganization(organizationId, agentId, agentJwt);
  }

  @Get('jobs/pending')
  @Public()
  @ApiOperation({ summary: 'Get pending backup jobs for an agent' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  @ApiResponse({ status: 200, description: 'Next pending job or empty if none' })
  async getPendingJobs(
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string
  ) {
    return this.backupService.getPendingJobs(organizationId, agentId, agentJwt);
  }

  @Post('jobs/:jobId/upload')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a backup file for a job' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadFile(
    @UploadedFile() file: any,
    @Param('jobId') jobId: string,
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.backupService.uploadFile(file, jobId, organizationId, agentId, agentJwt);
  }

  @Post('jobs/:jobId/status')
  @Public()
  @ApiOperation({ summary: 'Update backup job status' })
  @ApiHeader({ name: 'Organization-Id', description: 'Organization ID' })
  @ApiHeader({ name: 'Agent-Id', description: 'Agent ID' })
  @ApiHeader({ name: 'Agent-JWT', description: 'Agent JWT Token' })
  async updateJobStatus(
    @Param('jobId') jobId: string,
    @Headers('organization-id') organizationId: string,
    @Headers('agent-id') agentId: string,
    @Headers('agent-jwt') agentJwt: string,
    @Body() dto: UpdateBackupJobStatusDto,
  ) {
    return this.backupService.updateJobStatus(jobId, organizationId, agentId, agentJwt, dto);
  }
}
