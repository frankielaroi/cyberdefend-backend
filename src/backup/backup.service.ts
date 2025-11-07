import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { CreateBackupJobDto, UpdateBackupJobStatusDto, BackupJobStatus } from './dto/backup-job.dto';
import { CreateBackupAgentDto } from './dto/agent.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class BackupService {
  private s3Client: S3Client;

  async getOrganizationAgents(organizationId: string) {
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

  async getOrganizationBackups() {
    return this.prisma.backup.findMany({
      include: {
        job: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBackupDownloadUrl(backupId: string) {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId },
      include: { 
        job: true,
        organization: true 
      },
    });

    if (!backup) {
      throw new NotFoundException(`Backup with ID ${backupId} not found`);
    }

    // Construct the full S3 key including organization and job path
    const s3Key = `backups/${backup.organizationId}/${backup.jobId}/${backup.originalName}`;

    const command = new GetObjectCommand({
      Bucket: this.configService.get('aws.s3Bucket'),
      Key: s3Key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    return { downloadUrl: url };
  }

  async deleteBackup(backupId: string, organizationId: string) {
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

    // Check if backup belongs to the organization
    if (backup.organizationId !== organizationId) {
      throw new BadRequestException('Unauthorized: Backup does not belong to your organization');
    }

    try {
      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.configService.get('aws.s3Bucket'),
        Key: backup.filename,
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
    // Debug logging for AWS configuration
    const awsConfig = {
      region: this.configService.get('aws.region'),
      accessKeyId: this.configService.get('aws.accessKeyId'),
      secretAccessKey: this.configService.get('aws.secretAccessKey'),
      s3Bucket: this.configService.get('aws.s3Bucket'),
    };
    
    console.log('=== AWS Configuration Debug ===');
    console.log('AWS Region:', awsConfig.region);
    console.log('AWS Access Key ID:', awsConfig.accessKeyId ? `${awsConfig.accessKeyId.substring(0, 8)}...` : 'NOT SET');
    console.log('AWS Secret Access Key:', awsConfig.secretAccessKey ? `${awsConfig.secretAccessKey.substring(0, 8)}...` : 'NOT SET');
    console.log('AWS S3 Bucket:', awsConfig.s3Bucket);
    console.log('================================');

    this.s3Client = new S3Client({
      region: awsConfig.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
  }

  async createBackupAgent(dto: CreateBackupAgentDto): Promise<any> {
    const token = crypto.randomBytes(32).toString('hex');

    const agent = await this.prisma.backupAgent.create({
      data: {
        name: dto.name,
        token,
        organizationId: dto.organizationId,
      },
    });

    return {
      ...agent,
      token, // Return token only on creation
    };
  }

  async createBackupJob(
    dto: CreateBackupJobDto,
    organizationId: string,
    agentId: string,
    agentJwt: string
  ): Promise<any> {
    // Verify the agent exists and belongs to the organization
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

    return this.prisma.backupJob.create({
      data: {
        sourcePath: dto.sourcePath,
        backupType: dto.backupType,
        organizationId: organizationId,
        agentId: agentId,
      },
      include: {
        organization: true,
        agent: true,
      },
    });
  }

  async getPendingJobs(organizationId: string, agentId: string, agentJwt: string): Promise<any> {
    // Verify agent credentials
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

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
    // First verify the agent credentials
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

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

    // Debug logging for file object structure
    console.log('File object keys:', Object.keys(file));
    console.log('File properties:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      hasBuffer: !!file.buffer,
      hasPath: !!file.path,
      bufferLength: file.buffer ? file.buffer.length : 'N/A'
    });

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
    const key = `backups/${organizationId}/${jobId}/${file.originalname}`;

    // Debug logging for S3 upload configuration
    console.log('=== S3 Upload Debug ===');
    console.log('S3 Bucket from config:', bucket);
    console.log('S3 Key:', key);
    console.log('Organization ID:', organizationId);
    console.log('Job ID:', jobId);
    console.log('File name:', file.originalname);
    console.log('File size:', file.size);
    console.log('======================');

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

    console.log('=== S3 Upload Parameters ===');
    console.log('Upload Params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      BodyLength: uploadParams.Body ? uploadParams.Body.length : 'N/A',
      ContentType: uploadParams.ContentType,
      Metadata: uploadParams.Metadata
    });
    console.log('=============================');

    try {
      console.log('Attempting S3 upload...');
      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3Client.send(command);
      console.log('S3 upload successful:', result);
    } catch (s3Error) {
      console.error('=== S3 Upload Error ===');
      console.error('Error name:', s3Error.name);
      console.error('Error message:', s3Error.message);
      console.error('Error code:', s3Error.code);
      console.error('Error stack:', s3Error.stack);
      console.error('=======================');
      throw new BadRequestException(`Failed to upload file to storage: ${s3Error.message}`);
    } finally {
      // Clean up temporary file if using disk storage
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          // Log but don't throw - upload succeeded, cleanup failed
          console.warn(`Failed to cleanup temporary file ${file.path}:`, error.message);
        }
      }
    }

    // Save backup record to database
    const backup = await this.prisma.backup.create({
      data: {
        filename: file.originalname,
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

  async generateDownloadUrl(backupId: string): Promise<string> {
    const backup = await this.prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw new Error('Backup not found');
    }

    const command = new GetObjectCommand({
      Bucket: backup.s3Bucket,
      Key: backup.s3Key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
    return signedUrl;
  }

  async getBackupsByOrganization(organizationId: string, agentId: string, agentJwt: string): Promise<any[]> {
    // Verify agent credentials
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

    return this.prisma.backup.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        job: true,
      },
    });
  }

  async getBackupJobs(organizationId: string, agentId: string, agentJwt: string): Promise<any[]> {
    // Verify agent credentials
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

    return this.prisma.backupJob.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: true,
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
    // Verify agent credentials
    const agent = await this.prisma.backupAgent.findFirst({
      where: {
        id: agentId,
        organizationId: organizationId,
        token: agentJwt
      }
    });

    if (!agent) {
      throw new BadRequestException('Invalid agent credentials');
    }

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
        agent: true,
        backup: true,
      },
    });
  }

}
