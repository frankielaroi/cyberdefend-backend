import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

import { TelemetryService } from '../services/telemetry.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { TelemetryBatchDto } from '../dto/telemetry.dto';

@ApiTags('defendxplus-telemetry')
@Controller('defendx-plus/telemetry')
@Public() // Agents authenticate with X-API-Key, not a user JWT
@UseGuards(ApiKeyGuard)
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive batch telemetry payloads from endpoint agents' })
  @ApiResponse({ status: 200, description: 'Telemetry data processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 400, description: 'Invalid telemetry data' })
  @ApiHeader({ name: 'X-API-Key', description: 'Agent API Key', required: true })
  async receiveTelemetry(
    @Req() req: { agent: { id: string; organizationId: string } },
    @Body() telemetryDto: TelemetryBatchDto,
  ) {
    return this.telemetryService.processTelemetry(req.agent, telemetryDto);
  }
}