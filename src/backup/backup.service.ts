import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateBackupJobDto, UpdateBackupJobStatusDto, BackupJobStatus } from './dto/backup-job.dto';
import { CreateBackupAgentDto } from './dto/agent.dto';
import * as fs from 'fs';
import * as path from 'path';
import { generateToken, hashToken } from '../common/utils/token.util';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private s3Client: S3Client;

  async getOrganizationAgents(organizationId: string) {
    this.requireOrganization(organizationId);
    const agents = await this.prisma.backupAgent.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        name: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude token from response
        token: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return agents;
  }

  async getOrganizationBackups(organizationId: string) {
    this.requireOrganization(organizationId);
    return this.prisma.backup.findMany({
      where: { organizationId },
      include: {
        job: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBackupDownloadUrl(backupId: string, organizationId: string) {
    this.requireOrganization(organizationId);
    const backup = await this.prisma.backup.findFirst({
      where: { id: backupId, organizationId },
    });

    if (!backup) {
      throw new NotFoundException(`Backup with ID ${backupId} not found`);
    }

    const command = new GetObjectCommand({
      Bucket: backup.s3Bucket,
      Key: backup.s3Key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return { downloadUrl: url };
  }

  async deleteBackup(backupId: string, organizationId: string) {
    this.requireOrganization(organizationId);
    const backup = await this.prisma.backup.findFirst({
      where: { 
        id: backupId,
        organizationId: organizationId
      },
      include: { job: true },
    });

    if (!backup) {
      throw new NotFoundException(`Backup with ID ${backupId} not found`);
    }

    try {
      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: backup.s3Bucket,
        Key: backup.s3Key,
      });
      await this.s3Client.send(deleteCommand);

      // Delete from database
      await this.prisma.backup.delete({
        where: { id: backupId },
      });

      return { message: 'Backup deleted successfully' };
    } catch (error) {
      throw new BadRequestException(`Failed to delete backup: ${error.message}`);
    }
  }

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const awsConfig = {
      region: this.configService.get('aws.region'),
      accessKeyId: this.configService.get('aws.accessKeyId'),
      secretAccessKey: this.configService.get('aws.secretAccessKey'),
    };

    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
  }

  async createBackupAgent(dto: CreateBackupAgentDto, organizationId: string): Promise<any> {
    this.requireOrganization(organizationId);
    const token = generateToken();

    const agent = await this.prisma.backupAgent.create({
      data: {
        name: dto.name,
        token: hashToken(token),
        organizationId,
      },
    });

    return {
      ...agent,
      token, // Plaintext returned only on creation; only the hash is stored
    };
  }

  /** Verifies agent headers; the stored token is a SHA-256 hash of the secret the agent holds. */
  private async authenticateAgent(organizationId: string, agentId: string, agentToken: string) {
    if (!organizationId || !agentId || !agentToken) {
      throw new BadRequestException('Invalid agent credentials');
    }

    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId,
        token: hashToken(agentToken),
      },
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

    return agent;
  }

  private requireOrganization(organizationId: string) {
    if (!organizationId) {
      throw new ForbiddenException('User is not a member of an organization');
    }
  }

  async createBackupJob(
    dto: CreateBackupJobDto,
    organizationId: string,
    agentId: string,
    agentJwt: string
  ): Promise<any> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    return this.prisma.backupJob.create({
      data: {
        sourcePath: dto.sourcePath,
        backupType: dto.backupType,
        organizationId: organizationId,
        agentId: agentId,
      },
      include: {
        organization: true,
        agent: { select: { id: true, name: true } },
      },
    });
  }

  async getPendingJobs(organizationId: string, agentId: string, agentJwt: string): Promise<any> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    const jobs = await this.prisma.backupJob.findMany({
      where: {
        organizationId,
        status: BackupJobStatus.PENDING,
        OR: [
          { agentId: null }, // Unassigned jobs
          { agentId: agentId }, // Jobs assigned to this agent
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 1, // Get only one job at a time
    });

    if (jobs.length === 0) {
      return null;
    }

    // Assign the job to the agent and mark it as running
    const job = jobs[0];
    await this.prisma.backupJob.update({
      where: { id: job.id },
      data: {
        agentId,
        status: BackupJobStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    return {
      job_id: job.id,
      task: {
        source_path: job.sourcePath,
        backup_type: job.backupType,
        upload_path: `backups/${organizationId}/${job.id}/`,
      },
    };
  }

  async uploadFile(
    file: any,
    jobId: string,
    organizationId: string,
    agentId: string,
    agentJwt: string
  ): Promise<any> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    // Verify the job exists and belongs to the organization
    const job = await this.prisma.backupJob.findFirst({
      where: {
        id: jobId,
        organizationId,
      },
    });

    if (!job) {
      throw new NotFoundException(`Backup job with ID ${jobId} not found for organization ${organizationId}`);
    }


    // Verify the job is assigned to this agent
    if (job.agentId !== agentId) {
      throw new BadRequestException(`Job ${jobId} is not assigned to agent ${agentId}`);
    }

    // If the job is PENDING, automatically start it
    if (job.status === BackupJobStatus.PENDING) {
      await this.prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: BackupJobStatus.RUNNING,
          startedAt: new Date(),
        },
      });
      job.status = BackupJobStatus.RUNNING;
      job.startedAt = new Date();
    }

    // Only allow upload if job is RUNNING
    if (job.status !== BackupJobStatus.RUNNING) {
      throw new BadRequestException(`Job ${jobId} is in ${job.status} status. Only RUNNING jobs can accept uploads.`);
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Check if file has buffer (memory storage) or path (disk storage)
    if (!file.buffer && !file.path) {
      throw new BadRequestException('No file data provided - file has neither buffer nor path');
    }

    // For memory storage, check buffer; for disk storage, we'll read the file
    if (file.buffer && file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file buffer is empty');
    }

    if (file.size === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }

    const bucket = this.configService.get('aws.s3Bucket');
    // basename() strips any path segments so a crafted filename cannot escape this job's prefix
    const safeName = path.basename(String(file.originalname || '')).replace(/[^\w.\-]/g, '_') || 'backup';
    const key = `backups/${organizationId}/${jobId}/${safeName}`;

    if (!bucket) {
      throw new BadRequestException('S3 bucket configuration is missing or empty');
    }

    // Determine the file body based on storage type
    let fileBody: Buffer;
    if (file.buffer) {
      // Memory storage - use buffer directly
      fileBody = file.buffer;
    } else if (file.path) {
      // Disk storage - read file from path
      try {
        fileBody = fs.readFileSync(file.path);
      } catch (error) {
        throw new BadRequestException(`Failed to read uploaded file: ${error.message}`);
      }
    } else {
      throw new BadRequestException('File has no buffer or path available');
    }

    const uploadParams = {
      Bucket: bucket,
      Key: key,
      Body: fileBody,
      ContentType: file.mimetype,
      Metadata: {
        jobId,
        organizationId,
        agentId,
        uploadedAt: new Date().toISOString(),
      },
    };

    try {
      await this.s3Client.send(new PutObjectCommand(uploadParams));
      this.logger.log(`Uploaded backup for job ${jobId} (${file.size} bytes)`);
    } catch (s3Error) {
      this.logger.error(`S3 upload failed for job ${jobId}: ${s3Error.name}: ${s3Error.message}`);
      throw new BadRequestException(`Failed to upload file to storage: ${s3Error.message}`);
    } finally {
      // Clean up temporary file if using disk storage
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          // Log but don't throw - upload succeeded, cleanup failed
          this.logger.warn(`Failed to cleanup temporary file ${file.path}: ${error.message}`);
        }
      }
    }

    // Save backup record to database
    const backup = await this.prisma.backup.create({
      data: {
        filename: safeName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        s3Key: key,
        s3Bucket: bucket,
        uploadedBy: job.agentId,
        organizationId,
        jobId,
      },
    });

    return {
      status: 'success',
      message: 'Backup uploaded successfully',
      backup: {
        id: backup.id,
        filename: backup.filename,
        size: backup.size,
        uploadedAt: backup.createdAt,
        s3Key: backup.s3Key,
      },
    };
  }

  async getBackupsByOrganization(organizationId: string, agentId: string, agentJwt: string): Promise<any[]> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    return this.prisma.backup.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
      },
    });
  }

  async getBackupJobs(organizationId: string, agentId: string, agentJwt: string): Promise<any[]> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    return this.prisma.backupJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
        backup: true,
      },
    });
  }

  async updateJobStatus(
    jobId: string,
    organizationId: string,
    agentId: string,
    agentJwt: string,
    dto: UpdateBackupJobStatusDto
  ): Promise<any> {
    await this.authenticateAgent(organizationId, agentId, agentJwt);

    const job = await this.prisma.backupJob.findFirst({
      where: {
        id: jobId,
        organizationId,
      },
    });

    if (!job) {
      throw new NotFoundException(`Backup job with ID ${jobId} not found for organization ${organizationId}`);
    }

    // Verify the job is assigned to this agent
    if (job.agentId !== agentId) {
      throw new BadRequestException(`Job ${jobId} is not assigned to agent ${agentId}`);
    }

    return this.prisma.backupJob.update({
      where: { id: jobId },
      data: {
        status: dto.status,
        message: dto.message,
        finishedAt: dto.status === BackupJobStatus.COMPLETED || dto.status === BackupJobStatus.FAILED
          ? new Date()
          : undefined,
      },
      include: {
        agent: { select: { id: true, name: true } },
        backup: true,
      },
    });
  }

}
