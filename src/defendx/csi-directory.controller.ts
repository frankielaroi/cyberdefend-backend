import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { DefendxService } from './defendx.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('csi-directory')
@Controller('csi-directory')
export class CSIDirectoryController {
  constructor(private defendxService: DefendxService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public endpoint listing all published Cyber Safety Index (CSI) entries' })
  @ApiResponse({ status: 200, description: 'CSI directory retrieved successfully' })
  @ApiQuery({ name: 'region', required: false, description: 'Filter by region' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', type: Number })
  async getPublicCSIDirectory(
    @Query('region') region?: string,
    @Query('sector') sector?: string,
    @Query('size') size?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.defendxService.getPublicDirectory(region, sector, size, page, limit);
  }

  @Public()
  @Get('leaderboard')
  @ApiOperation({ summary: 'Returns top-performing organizations (optionally filtered by sector)' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top organizations to return', type: Number })
  async getCSILeaderboard(
    @Query('sector') sector?: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.defendxService.getCSILeaderboard(sector, limit);
  }

  @Public()
  @Get('heatmap')
  @ApiOperation({ summary: 'Returns average cyber readiness scores by region (used for map visualizations)' })
  @ApiResponse({ status: 200, description: 'Regional heatmap data retrieved successfully' })
  async getCSIHeatmap() {
    return this.defendxService.getCSIHeatmap();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CSA_ADMIN', 'SUPER_ADMIN')
  @Get('admin/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin-only endpoint providing aggregate national/sector statistics for CSA' })
  @ApiResponse({ status: 200, description: 'Admin statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied - admin only' })
  async getCSIAdminStats() {
    return this.defendxService.getCSIAdminStats();
  }
}