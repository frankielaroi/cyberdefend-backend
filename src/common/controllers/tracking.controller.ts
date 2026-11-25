import { Controller, Get, Param, Req, Res, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { EmailTrackingService } from '../services/email-tracking.service';
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('Tracking')
@Controller('track')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(private emailTrackingService: EmailTrackingService) {}

  @Get('open/:trackingId')
  @Public() // Loaded by mail clients, which carry no credentials
  @ApiOperation({ 
    summary: 'Email tracking pixel endpoint',
    description: 'Records email open event when the tracking pixel is loaded. Returns a 1x1 transparent GIF.'
  })
  @ApiParam({ name: 'trackingId', description: 'Unique tracking ID for the email' })
  async trackEmailOpen(
    @Param('trackingId') trackingId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Extract tracking information
      const ipAddress = this.getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const deviceType = this.detectDeviceType(userAgent);

      // Record the email open event
      await this.emailTrackingService.recordOpen(trackingId, {
        ipAddress,
        userAgent,
        deviceType,
      });

      this.logger.log(
        `Email open tracked: ${trackingId} from ${ipAddress} (${deviceType})`
      );
    } catch (error) {
      this.logger.error(`Failed to track email open for ${trackingId}:`, error);
    }

    // Always return a 1x1 transparent GIF, even if tracking fails
    const transparentGif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': transparentGif.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    res.end(transparentGif);
  }

  /**
   * Client IP as resolved by Express (honours X-Forwarded-For only via the trusted proxy setting in main.ts)
   */
  private getClientIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'Unknown';
  }

  /**
   * Detect device type from user agent string
   */
  private detectDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    return 'desktop';
  }

  @Get('stats/:recipientEmail')
  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get email tracking statistics',
    description: 'Retrieve tracking statistics for a specific recipient email'
  })
  @ApiParam({ name: 'recipientEmail', description: 'Email address of the recipient' })
  async getTrackingStats(@Param('recipientEmail') recipientEmail: string) {
    try {
      return await this.emailTrackingService.getTrackingStats(recipientEmail);
    } catch (error) {
      this.logger.error(`Failed to get tracking stats for ${recipientEmail}:`, error);
      return {
        error: 'Failed to retrieve tracking statistics',
        recipientEmail,
      };
    }
  }

  @Get('details/:trackingId')
  @Roles('SUPER_ADMIN', 'CSA_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get tracking details',
    description: 'Retrieve detailed tracking information for a specific tracking ID'
  })
  @ApiParam({ name: 'trackingId', description: 'Unique tracking ID' })
  async getTrackingDetails(@Param('trackingId') trackingId: string) {
    try {
      return await this.emailTrackingService.getTrackingById(trackingId);
    } catch (error) {
      this.logger.error(`Failed to get tracking details for ${trackingId}:`, error);
      return {
        error: 'Failed to retrieve tracking details',
        trackingId,
      };
    }
  }
}
