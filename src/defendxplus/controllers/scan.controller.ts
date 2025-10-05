import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger';

import { ScanService } from '../services/scan.service';
import { ScheduleScanDto, RunScanDto, ScanFiltersDto } from '../dto/scan.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('defendxplus-scans')
@Controller('defendxplus/scans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ScanController {
  constructor(private scanService: ScanService) {}

  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('schedule')
  @ApiOperation({ summary: 'Schedule periodic system scans (weekly, monthly, quarterly)' })
  @ApiResponse({ status: 201, description: 'Scan scheduled successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async scheduleScan(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() scheduleScanDto: ScheduleScanDto,
  ) {
    return this.scanService.scheduleScan(userId, organizationId, scheduleScanDto);
  }

  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger a manual on-demand scan' })
  @ApiResponse({ status: 200, description: 'Scan triggered successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async runScan(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() runScanDto: RunScanDto,
  ) {
    return this.scanService.runScan(userId, organizationId, runScanDto);
  }

  @Get()
  @ApiOperation({ summary: 'List existing scan schedules and statuses' })
  @ApiResponse({ status: 200, description: 'Scan schedules retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by scan type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by scan status' })
  async getScans(
    @GetUser('organizationId') organizationId: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.scanService.getScans(organizationId, type, status);
  }

  @Get('results')
  @ApiOperation({ summary: 'Retrieve list of scan reports within a date range' })
  @ApiResponse({ status: 200, description: 'Scan results retrieved successfully' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Filter from date (ISO string)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'Filter to date (ISO string)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by scan type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getScanResults(
    @GetUser('organizationId') organizationId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.scanService.getScanResults(
      organizationId,
      { fromDate, toDate, type },
      page,
      limit,
    );
  }

  @Get('results/:id')
  @ApiOperation({ summary: 'Get detailed scan report with findings and overall grade' })
  @ApiResponse({ status: 200, description: 'Scan result retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Scan result not found' })
  @ApiParam({ name: 'id', description: 'Scan Result ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Response format (json, pdf)', enum: ['json', 'pdf'] })
  async getScanResult(
    @GetUser('organizationId') organizationId: string,
    @Param('id') scanResultId: string,
    @Query('format') format: 'json' | 'pdf' = 'json',
  ) {
    return this.scanService.getScanResult(organizationId, scanResultId, format);
  }
}