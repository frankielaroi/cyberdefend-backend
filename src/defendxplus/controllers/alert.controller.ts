import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { AlertService } from '../services/alert.service';
import { AlertFiltersDto } from '../dto/monitoring.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('defendxplus-alerts')
@Controller('defendxplus/alerts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlertController {
  constructor(private alertService: AlertService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch list of alerts (filterable by severity, status, or date)' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity level' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by alert status' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getAlerts(
    @GetUser('organizationId') organizationId: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.alertService.getAlerts(
      organizationId,
      { severity, status, fromDate, toDate },
      page,
      limit,
    );
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get monitoring dashboard statistics and widget data' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats(@GetUser('organizationId') organizationId: string) {
    return this.alertService.getDashboardStats(organizationId);
  }

  @Post(':id/ack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert as reviewed' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  async acknowledgeAlert(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Param('id') alertId: string,
  ) {
    return this.alertService.acknowledgeAlert(userId, organizationId, alertId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an alert as resolved/closed' })
  @ApiResponse({ status: 200, description: 'Alert closed successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  async closeAlert(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Param('id') alertId: string,
  ) {
    return this.alertService.closeAlert(userId, organizationId, alertId);
  }

  @Sse('live')
  @ApiOperation({ summary: 'Server-Sent Events stream providing real-time alert updates to the dashboard' })
  @ApiResponse({ status: 200, description: 'Real-time alert stream established' })
  alertStream(
    @GetUser('organizationId') organizationId: string,
  ): Observable<MessageEvent> {
    return this.alertService.getAlertStream(organizationId);
  }
}