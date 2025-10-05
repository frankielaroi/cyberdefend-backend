import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { IncidentService } from '../services/incident.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('defendxplus-incidents')
@Controller('defendxplus/report')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncidentController {
  constructor(private incidentService: IncidentService) {}

  @Post('incident')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a user-reported phishing attempt or incident' })
  @ApiResponse({ status: 200, description: 'Incident reported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid incident data' })
  async reportIncident(
    @GetUser('userId') userId: string,
    @GetUser('organizationId') organizationId: string,
    @Body() reportIncidentDto: any, // TODO: Create proper DTO
  ) {
    return this.incidentService.reportIncident(userId, organizationId, reportIncidentDto);
  }
}