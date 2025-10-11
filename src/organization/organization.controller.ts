import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
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
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { CreateInviteCodeDto } from './dto/invite-code.dto';
import { UpdateMemberRoleDto, InviteMemberDto } from './dto/member.dto';
import { 
  UpdateOrganizationSettingsDto, 
  InviteMemberDto as InviteDto, 
  UpdateMemberRoleDto as UpdateRoleDto,
  RemoveMemberDto,
  ResendInvitationDto,
  OrganizationSettingsResponseDto,
  OrganizationMemberResponseDto
} from './dto/organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Public()
  @Get()
  @ApiOperation({ 
    summary: 'Browse public organizations',
    description: 'Get a paginated list of public organizations with optional filtering'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Organizations retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            name: 'Acme Corporation',
            email: 'contact@acme.com',
            website: 'https://acme.com',
            description: 'Leading technology company',
            logo: 'https://acme.com/logo.png',
            city: 'Accra',
            region: 'Greater Accra',
            country: 'Ghana',
            size: 'MEDIUM',
            sector: 'TECHNOLOGY',
            csiScore: 85.5,
            riskTier: 'MEDIUM',
            createdAt: '2024-01-01T00:00:00Z',
            _count: {
              users: 25
            }
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5
        }
      }
    }
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for organization name' })
  @ApiQuery({ name: 'sector', required: false, description: 'Filter by sector' })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by organization size' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  findAll(@Query() query: QueryOrganizationsDto) {
    return this.organizationService.findAll(query);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create new organization',
    description: 'Create a new organization. User becomes the organization admin.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Organization created successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        size: 'MEDIUM',
        sector: 'TECHNOLOGY',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 409, description: 'Organization email already exists or user already belongs to an organization' })
  create(@Body() createOrganizationDto: CreateOrganizationDto, @GetUser('id') userId: string) {
    return this.organizationService.create(userId, createOrganizationDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user\'s organization',
    description: 'Get the organization that the current user belongs to'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        website: 'https://acme.com',
        size: 'MEDIUM',
        sector: 'TECHNOLOGY',
        isActive: true,
        _count: {
          users: 25,
          assessments: 10,
          phishingCampaigns: 5
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found or not part of any organization' })
  getUserOrganization(@GetUser('id') userId: string) {
    return this.organizationService.getUserOrganization(userId);
  }

  @Post('leave')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Leave current organization',
    description: 'Remove current user from their organization'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully left organization',
    schema: {
      example: {
        message: 'Successfully left organization'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'User not part of any organization or cannot leave as only admin' })
  leaveOrganization(@GetUser('id') userId: string) {
    // Get user's organization ID first
    return this.organizationService.leaveOrganization(userId);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get organization details',
    description: 'Get detailed information about a specific organization'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization details retrieved successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        website: 'https://acme.com',
        description: 'Leading technology company',
        size: 'MEDIUM',
        sector: 'TECHNOLOGY',
        csiScore: 85.5,
        riskTier: 'MEDIUM',
        isActive: true,
        _count: {
          users: 25,
          assessments: 10,
          phishingCampaigns: 5
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findOne(@Param('id') id: string, @GetUser('organizationId') userOrgId?: string) {
    // If user belongs to this organization, show private details
    const includePrivate = userOrgId === id;
    return this.organizationService.findOne(id, includePrivate);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('ORG_ADMIN')
  @ApiOperation({ 
    summary: 'Update organization',
    description: 'Update organization details. Only available to organization admins.'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization updated successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Updated Acme Corporation',
        email: 'new-contact@acme.com',
        website: 'https://new-acme.com',
        size: 'LARGE',
        sector: 'TECHNOLOGY',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Not authorized to update this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Organization email already exists' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.update(id, userId, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('ORG_ADMIN')
  @ApiOperation({ 
    summary: 'Delete organization',
    description: 'Deactivate organization. Only available to organization admins. Cannot delete if other members exist.'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization deleted successfully',
    schema: {
      example: {
        id: 'uuid',
        name: 'Acme Corporation',
        isActive: false,
        updatedAt: '2024-01-02T00:00:00Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Cannot delete organization with other members' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  remove(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.organizationService.remove(id, userId);
  }

  @Post('join')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Join organization via invite code',
    description: 'Join an organization using an invite code or organization ID'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully joined organization',
    schema: {
      example: {
        success: true,
        message: 'Successfully joined organization',
        data: {
          organization: {
            id: 'org_12345',
            name: 'ACME Corporation',
            sector: 'TECHNOLOGY',
            size: 'MEDIUM',
            memberCount: 126
          },
          userRole: 'END_USER',
          joinedAt: '2024-01-01T12:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid invite code or already a member' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  joinOrganizationByCode(
    @Body() joinDto: JoinOrganizationDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.joinOrganizationByInviteCode(joinDto, userId);
  }

  @Post(':id/join')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Join organization',
    description: 'Join an active organization. User will be assigned END_USER role.'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully joined organization',
    schema: {
      example: {
        message: 'Successfully joined organization'
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Organization not found or inactive' })
  @ApiResponse({ status: 409, description: 'User already belongs to an organization' })
  joinOrganization(
    @Body() joinDto: JoinOrganizationDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.joinOrganizationByInviteCode(joinDto, userId);
  }

  @Get(':id/members')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get organization members',
    description: 'Get list of organization members. Only available to organization members.'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Organization members retrieved successfully',
    schema: {
      example: [
        {
          id: 'uuid',
          email: 'admin@acme.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'ORG_ADMIN',
          avatar: 'https://example.com/avatar.png',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          _count: {
            assessments: 5
          }
        },
        {
          id: 'uuid',
          email: 'user@acme.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'END_USER',
          avatar: null,
          isActive: true,
          createdAt: '2024-01-02T00:00:00Z',
          _count: {
            assessments: 2
          }
        }
      ]
    }
  })
  @ApiResponse({ status: 403, description: 'Not authorized to view organization members' })
  getMembers(@Param('id') id: string, @GetUser('id') userId: string) {
    return this.organizationService.getMembers(id, userId);
  }

  @Patch(':id/members/:memberId')
  @ApiBearerAuth()
  @Roles('ORG_ADMIN')
  @ApiOperation({ 
    summary: 'Update member role',
    description: 'Update the role of an organization member. Only available to organization admins.'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Member role updated successfully',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@acme.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'ORG_MANAGER',
        avatar: null,
        isActive: true
      }
    }
  })
  @Post(':id/invite-codes')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({ 
    summary: 'Create invite code',
    description: 'Generate an invite code for the organization'
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ 
    status: 201, 
    description: 'Invite code created successfully',
    schema: {
      example: {
        success: true,
        data: {
          inviteCode: 'INV-ABC123XYZ',
          expiresAt: '2024-01-08T12:00:00Z',
          usageLimit: 10,
          usedCount: 0,
          createdBy: 'user_123',
          createdAt: '2024-01-01T12:00:00Z'
        }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  createInviteCode(
    @Param('id') orgId: string,
    @Body() createInviteDto: CreateInviteCodeDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.createInviteCode(orgId, createInviteDto, userId);
  }

  // Organization Settings Endpoints
  @Get(':id/settings')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({
    summary: 'Get organization settings',
    description: 'Retrieve detailed organization settings and configuration'
  })
  @ApiResponse({
    status: 200,
    description: 'Organization settings retrieved successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBearerAuth()
  getOrganizationSettings(
    @Param('id') orgId: string,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.getOrganizationSettings(orgId, userId);
  }

  @Patch(':id/settings')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update organization settings',
    description: 'Update organization details and configuration (Admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'Organization settings updated successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid organization data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBearerAuth()
  updateOrganizationSettings(
    @Param('id') orgId: string,
    @Body() updateDto: UpdateOrganizationSettingsDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.updateOrganizationSettings(orgId, updateDto, userId);
  }

  @Get(':id/members')
  @Roles('ORG_ADMIN', 'ORG_MANAGER', 'END_USER')
  @ApiOperation({
    summary: 'Get organization members',
    description: 'Retrieve list of all organization members with their roles'
  })
  @ApiResponse({
    status: 200,
    description: 'Organization members retrieved successfully',
    type: [OrganizationMemberResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBearerAuth()
  getOrganizationMembers(
    @Param('id') orgId: string,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.getOrganizationMembers(orgId, userId);
  }

  @Post(':id/members/invite')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({
    summary: 'Invite new member to organization',
    description: 'Send email invitation to a new member to join the organization'
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Invitation sent to john.doe@example.com',
        invitationId: 'uuid-invitation-id'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid invitation data or user already exists' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiBearerAuth()
  inviteMember(
    @Param('id') orgId: string,
    @Body() inviteDto: InviteDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.inviteMember(orgId, inviteDto, userId);
  }

  @Patch(':id/members/:memberId/role')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Update member role',
    description: 'Update the role of an organization member (Admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'Member role updated successfully',
    schema: {
      example: {
        success: true,
        message: 'Member role updated to ORG_MANAGER',
        member: {
          id: 'member-id',
          role: 'ORG_MANAGER'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid role or member data' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiBearerAuth()
  updateMemberRole(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateRoleDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.updateMemberRole(orgId, memberId, updateDto, userId);
  }

  @Delete(':id/members/:memberId')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Remove member from organization',
    description: 'Remove a member from the organization (Admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Member removed from organization'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or member not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiBearerAuth()
  removeMember(
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
    @Body() removeDto: RemoveMemberDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.removeMember(orgId, memberId, removeDto, userId);
  }

  @Post(':id/invitations/:invitationId/resend')
  @Roles('ORG_ADMIN', 'ORG_MANAGER')
  @ApiOperation({
    summary: 'Resend invitation',
    description: 'Resend an existing invitation to a pending member'
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
    schema: {
      example: {
        success: true,
        message: 'Invitation resent to john.doe@example.com'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or invitation not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiBearerAuth()
  resendInvitation(
    @Param('id') orgId: string,
    @Param('invitationId') invitationId: string,
    @Body() resendDto: ResendInvitationDto,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.resendInvitation(orgId, invitationId, resendDto, userId);
  }

  @Delete(':id/invitations/:invitationId')
  @Roles('ORG_ADMIN')
  @ApiOperation({
    summary: 'Cancel invitation',
    description: 'Cancel a pending invitation (Admin only)'
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation cancelled successfully',
    schema: {
      example: {
        success: true,
        message: 'Invitation cancelled'
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Organization or invitation not found' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiParam({ name: 'invitationId', description: 'Invitation ID' })
  @ApiBearerAuth()
  cancelInvitation(
    @Param('id') orgId: string,
    @Param('invitationId') invitationId: string,
    @GetUser('id') userId: string,
  ) {
    return this.organizationService.cancelInvitation(orgId, invitationId, userId);
  }
}