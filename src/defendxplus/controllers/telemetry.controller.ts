import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';

import { TelemetryService } from '../services/telemetry.service';
import { ApiKeyGuard } from '../guards/api-key.guard';

@ApiTags('defendxplus-telemetry')
@Controller('defendx-plus/telemetry')
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
    @Headers('x-api-key') apiKey: string,
    @Body() telemetryDto: any, // TODO: Create proper DTO
  ) {
    return this.telemetryService.processTelemetry(apiKey, telemetryDto);
  }
}