import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendEmailDto,
  SendSmsDto,
  ScheduleEmailDto,
  ScheduleSmsDto,
  NotificationStatusDto,
  BulkEmailDto,
} from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private notificationService: NotificationService,
    private emailService: EmailService,
  ) {}

  @Post('email/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send immediate email' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    this.logger.log(`Sending immediate email to ${sendEmailDto.to}`);
    
    const result = await this.notificationService.sendEmail(sendEmailDto);
    
    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
      error: result.error,
    };
  }

  @Post('sms/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send immediate SMS' })
  @ApiResponse({ status: 200, description: 'SMS sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    this.logger.log(`Sending immediate SMS to ${sendSmsDto.to}`);
    
    const result = await this.notificationService.sendSms(sendSmsDto);
    
    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
      error: result.error,
    };
  }

  @Post('email/bulk-send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send bulk email to multiple recipients' })
  @ApiResponse({ status: 200, description: 'Bulk email sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendBulkEmail(@Body() bulkEmailDto: BulkEmailDto) {
    this.logger.log(`Sending bulk email to ${bulkEmailDto.recipients.length} recipients`);
    
    const result = await this.emailService.sendBulkEmail(
      bulkEmailDto.subject,
      bulkEmailDto.content,
      bulkEmailDto.recipients,
      bulkEmailDto.isHtml,
      bulkEmailDto.category,
      bulkEmailDto.fromEmail,
      bulkEmailDto.fromName
    );
    
    return {
      success: result.success,
      messageId: result.messageId,
      timestamp: result.timestamp,
      recipientCount: bulkEmailDto.recipients.length,
      error: result.error,
    };
  }

  @Post('email/schedule')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule email notification' })
  @ApiResponse({ status: 201, description: 'Email scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scheduleEmail(@Body() scheduleEmailDto: ScheduleEmailDto) {
    this.logger.log(`Scheduling email to ${scheduleEmailDto.to}`);
    
    const result = await this.notificationService.scheduleEmail(scheduleEmailDto);
    
    return {
      jobId: result.jobId,
      notificationId: result.notificationId,
      message: 'Email scheduled successfully',
    };
  }

  @Post('sms/schedule')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule SMS notification' })
  @ApiResponse({ status: 201, description: 'SMS scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scheduleSms(@Body() scheduleSmsDto: ScheduleSmsDto) {
    this.logger.log(`Scheduling SMS to ${scheduleSmsDto.to}`);
    
    const result = await this.notificationService.scheduleSms(scheduleSmsDto);
    
    return {
      jobId: result.jobId,
      notificationId: result.notificationId,
      message: 'SMS scheduled successfully',
    };
  }

  @Post('email/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule bulk email notifications' })
  @ApiResponse({ status: 201, description: 'Bulk emails scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scheduleBulkEmails(@Body() emails: ScheduleEmailDto[]) {
    this.logger.log(`Scheduling bulk email with ${emails.length} emails`);
    
    const result = await this.notificationService.scheduleBulkEmails(emails);
    
    return {
      jobId: result.jobId,
      notificationIds: result.notificationIds,
      count: result.notificationIds.length,
      message: 'Bulk emails scheduled successfully',
    };
  }

  @Post('sms/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Schedule bulk SMS notifications' })
  @ApiResponse({ status: 201, description: 'Bulk SMS scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async scheduleBulkSms(@Body() smsMessages: ScheduleSmsDto[]) {
    this.logger.log(`Scheduling bulk SMS with ${smsMessages.length} messages`);
    
    const result = await this.notificationService.scheduleBulkSms(smsMessages);
    
    return {
      jobId: result.jobId,
      notificationIds: result.notificationIds,
      count: result.notificationIds.length,
      message: 'Bulk SMS scheduled successfully',
    };
  }

  @Delete('cancel/:type/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel scheduled notification' })
  @ApiParam({ name: 'type', enum: ['email', 'sms'], description: 'Notification type' })
  @ApiParam({ name: 'jobId', description: 'Job ID to cancel' })
  @ApiResponse({ status: 200, description: 'Notification cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelNotification(
    @Param('type') type: 'email' | 'sms',
    @Param('jobId') jobId: string,
  ) {
    this.logger.log(`Cancelling ${type} job ${jobId}`);
    
    const success = await this.notificationService.cancelNotification(jobId, type);
    
    return {
      success,
      message: success ? 'Notification cancelled successfully' : 'Job not found or already processed',
    };
  }

  @Get('status/:notificationId')
  @ApiOperation({ summary: 'Get notification status' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification status retrieved', type: NotificationStatusDto })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationStatus(@Param('notificationId') notificationId: string) {
    this.logger.log(`Getting status for notification ${notificationId}`);
    
    const status = await this.notificationService.getNotificationStatus(notificationId);
    
    return status;
  }

  @Get('job/:type/:jobId')
  @ApiOperation({ summary: 'Get job status' })
  @ApiParam({ name: 'type', enum: ['email', 'sms'], description: 'Notification type' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job status retrieved' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getJobStatus(
    @Param('type') type: 'email' | 'sms',
    @Param('jobId') jobId: string,
  ) {
    this.logger.log(`Getting status for ${type} job ${jobId}`);
    
    const status = await this.notificationService.getJobStatus(jobId, type);
    
    if (!status) {
      return { message: 'Job not found' };
    }
    
    return status;
  }

  @Get('test-services')
  @ApiOperation({ summary: 'Test email and SMS services connectivity' })
  @ApiResponse({ status: 200, description: 'Service test results' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testServices() {
    this.logger.log('Testing notification services');
    
    const results = await this.notificationService.testServices();
    
    return {
      services: results,
      message: 'Service connectivity test completed',
    };
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available email templates' })
  @ApiResponse({ status: 200, description: 'Available templates list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTemplates() {
    return {
      message: 'Template system has been removed. Use direct HTML/text content instead.',
      example: {
        htmlContent: '<h1>Hello {{name}}</h1><p>Welcome to CyberDefend!</p>',
        textContent: 'Hello {{name}}, Welcome to CyberDefend!'
      }
    };
  }

  @Get('character-count')
  @ApiOperation({ summary: 'Get SMS character count and parts' })
  @ApiResponse({ status: 200, description: 'Character count information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSmsCharacterCount(@Query('message') message: string) {
    if (!message) {
      return { error: 'Message parameter is required' };
    }

    // This would normally use the SMS service method
    // For now, return a basic calculation
    const count = message.length;
    const parts = count <= 160 ? 1 : Math.ceil(count / 153);
    
    return {
      message,
      count,
      parts,
      encoding: 'GSM', // Simplified for now
      maxLength: parts === 1 ? 160 : 153,
    };
  }
}