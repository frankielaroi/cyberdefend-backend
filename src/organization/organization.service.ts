import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationService } from '../notification/services/notification.service';
import { SendEmailDto } from '../notification/dto/notification.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { CreateInviteCodeDto } from './dto/invite-code.dto';
import { 
  UpdateOrganizationSettingsDto, 
  InviteMemberDto as InviteDto, 
  UpdateMemberRoleDto as UpdateRoleDto,
  RemoveMemberDto,
  ResendInvitationDto,
  OrganizationSettingsResponseDto,
  OrganizationMemberResponseDto
} from './dto/organization.dto';
import { generateCode } from '../common/utils/token.util';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async findAll(query: QueryOrganizationsDto) {
    const { search, sector, size, page = 1, limit = 10 } = query;
    
    const where: any = {
      isActive: true,
      isPublic: true, // Only show public organizations
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sector) {
      where.sector = sector;
    }

    if (size) {
      where.size = size;
    }

    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          website: true,
          description: true,
          logo: true,
          city: true,
          region: true,
          country: true,
          size: true,
          sector: true,
          csiScore: true,
          riskTier: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          { csiScore: 'desc' },
          { name: 'asc' },
        ],
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, includePrivate: boolean = false) {
    const where: any = { id };
    
    if (!includePrivate) {
      where.isPublic = true;
      where.isActive = true;
    }

    const organization = await this.prisma.organization.findUnique({
      where,
      include: {
        _count: {
          select: {
            users: true,
            assessments: true,
            phishingCampaigns: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async create(userId: string, createOrganizationDto: CreateOrganizationDto) {
    // Check if user already belongs to an organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.organizationId) {
      throw new ConflictException('User already belongs to an organization');
    }

    // Check if organization email is already taken (only if email is provided)
    if (createOrganizationDto.email) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { email: createOrganizationDto.email },
      });

      if (existingOrg) {
        throw new ConflictException('Organization email already exists');
      }
    }

    // Create organization and update user
    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: createOrganizationDto.name,
          email: createOrganizationDto.email || null,
          phone: createOrganizationDto.phone,
          website: createOrganizationDto.website,
          description: createOrganizationDto.description,
          logo: createOrganizationDto.logo,
          address: createOrganizationDto.address,
          city: createOrganizationDto.city,
          region: createOrganizationDto.region,
          country: createOrganizationDto.country || 'Ghana',
          gpsAddress: createOrganizationDto.gpsAddress,
          size: createOrganizationDto.size as any,
          sector: createOrganizationDto.sector as any,
          isPublic: createOrganizationDto.isPublic || false,
        },
      });

      // Make the creator an ORG_ADMIN
      await tx.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          role: 'ORG_ADMIN',
        },
      });

      return organization;
    });

    return result;
  }

  async update(id: string, userId: string, updateOrganizationDto: UpdateOrganizationDto) {
    const organization = await this.findOne(id, true);
    
    // Check if user is authorized to update this organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== id) {
      throw new ForbiddenException('Not authorized to update this organization');
    }

    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can update organization details');
    }

    // Check if email is being changed and if it's already taken (only if email is provided)
    if (updateOrganizationDto.email && updateOrganizationDto.email !== organization.email) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { email: updateOrganizationDto.email },
      });

      if (existingOrg) {
        throw new ConflictException('Organization email already exists');
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        ...updateOrganizationDto,
        ...(updateOrganizationDto.size && { size: updateOrganizationDto.size as any }),
        ...(updateOrganizationDto.sector && { sector: updateOrganizationDto.sector as any }),
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, true);
    
    // Check if user is authorized to delete this organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== id) {
      throw new ForbiddenException('Not authorized to delete this organization');
    }

    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can delete the organization');
    }

    // Check if there are other users in the organization
    const memberCount = await this.prisma.user.count({
      where: { organizationId: id },
    });

    if (memberCount > 1) {
      throw new BadRequestException('Cannot delete organization with other members. Remove all members first.');
    }

    // Soft delete by deactivating
    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async joinOrganization(organizationId: string, userId: string) {
    // Check if organization exists and is active
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId, isActive: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found or inactive');
    }

    // Check if user already belongs to an organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.organizationId) {
      throw new ConflictException('User already belongs to an organization');
    }

    // Add user to organization with END_USER role
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role: 'END_USER',
      },
    });

    return { message: 'Successfully joined organization' };
  }

  async leaveOrganization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user || !user.organizationId) {
      throw new BadRequestException('User is not part of any organization');
    }

    // Check if user is the only ORG_ADMIN
    if (user.role === 'ORG_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId: user.organizationId,
          role: 'ORG_ADMIN',
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException('Cannot leave organization as the only admin. Transfer admin role first or delete the organization.');
      }
    }

    // Remove user from organization
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: null,
        role: 'END_USER',
      },
    });

    return { message: 'Successfully left organization' };
  }

  async getMembers(organizationId: string, userId: string) {
    // Check if user belongs to this organization
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new ForbiddenException('Not authorized to view organization members');
    }

    const members = await this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return members;
  }

  async getUserOrganization(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                users: true,
                assessments: true,
                phishingCampaigns: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.organization;
  }

  // Invite Code Management
  async createInviteCode(orgId: string, createInviteDto: CreateInviteCodeDto, userId: string) {
    // Check if user has permission to create invite codes
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    });

    if (!membership || !['ORG_ADMIN', 'ORG_MANAGER'].includes(membership.role)) {
      throw new UnauthorizedException('Insufficient permissions to create invite codes');
    }

    const expirationDays = createInviteDto.expirationDays || 7;
    const usageLimit = createInviteDto.usageLimit || 10;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Generate unique invite code
    let inviteCode: string;
    let isUnique = false;
    let attempts = 0;

    do {
      inviteCode = `INV-${generateCode(10)}`;
      const existing = await this.prisma.inviteCode.findUnique({
        where: { code: inviteCode },
      });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      throw new BadRequestException('Failed to generate unique invite code');
    }

    const createdInviteCode = await this.prisma.inviteCode.create({
      data: {
        code: inviteCode,
        organizationId: orgId,
        createdBy: userId,
        expiresAt,
        usageLimit,
      },
    });

    return {
      success: true,
      data: {
        inviteCode: createdInviteCode.code,
        expiresAt: createdInviteCode.expiresAt,
        usageLimit: createdInviteCode.usageLimit,
        usedCount: createdInviteCode.usedCount,
        createdBy: userId,
        createdAt: createdInviteCode.createdAt,
      },
    };
  }

  async joinOrganizationByInviteCode(joinDto: JoinOrganizationDto, userId: string) {
    let organizationId: string;

    // Check if user is already a member of any organization
    const existingMembership = await this.prisma.organizationMember.findFirst({
      where: { userId },
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of an organization');
    }

    if (joinDto.inviteCode) {
      // Join via invite code
      const inviteCode = await this.prisma.inviteCode.findUnique({
        where: { code: joinDto.inviteCode },
        include: { organization: true },
      });

      if (!inviteCode || !inviteCode.isActive || inviteCode.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired invite code');
      }

      if (inviteCode.usedCount >= inviteCode.usageLimit) {
        throw new BadRequestException('Invite code has reached its usage limit');
      }

      organizationId = inviteCode.organizationId;

      // Update invite code usage
      await this.prisma.inviteCode.update({
        where: { id: inviteCode.id },
        data: { usedCount: inviteCode.usedCount + 1 },
      });
    } else if (joinDto.organizationId) {
      // Join via organization ID
      const organization = await this.prisma.organization.findUnique({
        where: { id: joinDto.organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      if (!organization.isPublic) {
        throw new UnauthorizedException('This organization is not open for public joining');
      }

      organizationId = organization.id;
    } else {
      throw new BadRequestException('Either invite code or organization ID is required');
    }

    // Create membership
    await this.prisma.organizationMember.create({
      data: {
        userId,
        organizationId,
        role: 'END_USER',
        status: 'ACTIVE',
        inviteCode: joinDto.inviteCode,
      },
    });

    // Update user's organizationId
    await this.prisma.user.update({
      where: { id: userId },
      data: { organizationId },
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return {
      success: true,
      message: 'Successfully joined organization',
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          sector: organization.sector,
          size: organization.size,
          memberCount: organization._count.users,
        },
        userRole: 'END_USER',
        joinedAt: new Date().toISOString(),
      },
    };
  }

  // Organization Settings Methods
  async getOrganizationSettings(orgId: string, userId: string): Promise<OrganizationSettingsResponseDto> {
    // Verify user has access to organization
    await this.verifyUserInOrganization(userId, orgId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: organization.id,
      name: organization.name,
      email: organization.email,
      phone: organization.phone,
      website: organization.website,
      description: organization.description,
      logo: organization.logo,
      address: organization.address,
      city: organization.city,
      region: organization.region,
      gpsAddress: organization.gpsAddress,
      size: organization.size as any,
      sector: organization.sector as any,
      isPublic: organization.isPublic,
      isActive: organization.isActive,
      memberCount: organization._count.users,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  async updateOrganizationSettings(
    orgId: string, 
    updateDto: UpdateOrganizationSettingsDto, 
    userId: string
  ): Promise<OrganizationSettingsResponseDto> {
    // Verify user is admin of organization
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN']);

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if email is already in use by another organization
    if (updateDto.email && updateDto.email !== organization.email) {
      const existingOrg = await this.prisma.organization.findUnique({
        where: { email: updateDto.email },
      });
      if (existingOrg) {
        throw new ConflictException('Email is already in use by another organization');
      }
    }

    const updatedOrganization = await this.prisma.organization.update({
      where: { id: orgId },
      data: updateDto,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return {
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      email: updatedOrganization.email,
      phone: updatedOrganization.phone,
      website: updatedOrganization.website,
      description: updatedOrganization.description,
      logo: updatedOrganization.logo,
      address: updatedOrganization.address,
      city: updatedOrganization.city,
      region: updatedOrganization.region,
      gpsAddress: updatedOrganization.gpsAddress,
      size: updatedOrganization.size as any,
      sector: updatedOrganization.sector as any,
      isPublic: updatedOrganization.isPublic,
      isActive: updatedOrganization.isActive,
      memberCount: updatedOrganization._count.users,
      createdAt: updatedOrganization.createdAt,
      updatedAt: updatedOrganization.updatedAt,
    };
  }

  async getOrganizationMembers(orgId: string, userId: string): Promise<OrganizationMemberResponseDto[]> {
    // Verify user has access to organization
    await this.verifyUserInOrganization(userId, orgId);

    const members = await this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map(member => ({
      id: member.id,
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
      role: member.role,
      status: member.isActive ? 'ACTIVE' : 'INACTIVE',
      joinedAt: member.createdAt,
      lastActiveAt: member.updatedAt,
      isActive: member.isActive,
    }));
  }

  async inviteMember(orgId: string, inviteDto: InviteDto, userId: string) {
    // Verify user has permission to invite
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN', 'ORG_MANAGER']);

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: inviteDto.email },
    });

    if (existingUser) {
      if (existingUser.organizationId === orgId) {
        throw new ConflictException('User is already a member of this organization');
      }
      if (existingUser.organizationId) {
        throw new ConflictException('User is already a member of another organization');
      }
    }

    // For now, we'll create a simple invitation record using InviteCode
    // In a real implementation, you'd want a separate invitations table
    const inviteCode = await this.prisma.inviteCode.create({
      data: {
        code: `INV-${generateCode(10)}`,
        email: inviteDto.email,
        organizationId: orgId,
        createdBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        usageLimit: 1,
      },
    });

    // Send invitation email
    const invitationEmail: SendEmailDto = {
      to: [inviteDto.email],
      subject: `You're invited to join ${organization.name}`,
      htmlContent: this.generateInvitationEmailHtml(organization.name, inviteCode.code, inviteDto.message),
      textContent: this.generateInvitationEmailText(organization.name, inviteCode.code, inviteDto.message),
      category: 'organization-invitation',
    };

    try {
      await this.notificationService.sendEmail(invitationEmail);
    } catch (error) {
      // Log the error but don't fail the invitation creation
      console.error('Failed to send invitation email:', error);
    }

    return {
      success: true,
      message: `Invitation sent to ${inviteDto.email}`,
      invitationId: inviteCode.id,
    };
  }

  async updateMemberRole(
    orgId: string, 
    memberId: string, 
    updateDto: UpdateRoleDto, 
    userId: string
  ) {
    // Verify user is admin
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN']);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent admin from changing their own role if they're the only admin
    if (member.id === userId && updateDto.role !== 'ORG_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId: orgId,
          role: 'ORG_ADMIN',
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot change role: You are the only admin in this organization');
      }
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { role: updateDto.role as any },
    });

    return {
      success: true,
      message: `Member role updated to ${updateDto.role}`,
      member: {
        id: memberId,
        role: updateDto.role,
      },
    };
  }

  async removeMember(
    orgId: string, 
    memberId: string, 
    removeDto: RemoveMemberDto, 
    userId: string
  ) {
    // Verify user is admin
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN']);

    const member = await this.prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent admin from removing themselves if they're the only admin
    if (member.id === userId) {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId: orgId,
          role: 'ORG_ADMIN',
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('Cannot remove yourself: You are the only admin in this organization');
      }
    }

    // Remove user from organization (set organizationId to null instead of deleting)
    await this.prisma.user.update({
      where: { id: memberId },
      data: { 
        organizationId: null,
        role: 'END_USER', // Reset to default role
      },
    });

    // TODO: Log the removal action
    // await this.auditService.log({
    //   action: 'MEMBER_REMOVED',
    //   userId,
    //   organizationId: orgId,
    //   targetUserId: memberId,
    //   details: { reason: removeDto.reason },
    // });

    return {
      success: true,
      message: 'Member removed from organization',
    };
  }

  async resendInvitation(
    orgId: string, 
    invitationId: string, 
    resendDto: ResendInvitationDto, 
    userId: string
  ) {
    // Verify user has permission
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN', 'ORG_MANAGER']);

    const invitation = await this.prisma.inviteCode.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        organization: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already expired');
    }

    // Update invitation expiry
    await this.prisma.inviteCode.update({
      where: { id: invitationId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Reset to 7 days
      },
    });

    // Resend invitation email
    if (invitation.email) {
      const resendEmail: SendEmailDto = {
        to: [invitation.email],
        subject: `Reminder: You're invited to join ${invitation.organization.name}`,
        htmlContent: this.generateInvitationEmailHtml(invitation.organization.name, invitation.code, resendDto.message),
        textContent: this.generateInvitationEmailText(invitation.organization.name, invitation.code, resendDto.message),
        category: 'organization-invitation-resend',
      };

      try {
        await this.notificationService.sendEmail(resendEmail);
      } catch (error) {
        // Log the error but don't fail the resend
        console.error('Failed to resend invitation email:', error);
      }
    }

    return {
      success: true,
      message: `Invitation resent`,
    };
  }

  async cancelInvitation(orgId: string, invitationId: string, userId: string) {
    // Verify user is admin
    await this.verifyUserRole(userId, orgId, ['ORG_ADMIN']);

    const invitation = await this.prisma.inviteCode.findFirst({
      where: {
        id: invitationId,
        organizationId: orgId,
        isActive: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.inviteCode.update({
      where: { id: invitationId },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Invitation cancelled',
    };
  }

  // Helper methods
  private async verifyUserInOrganization(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== orgId) {
      throw new ForbiddenException('Access denied: User not in organization');
    }

    return user;
  }

  private async verifyUserRole(userId: string, orgId: string, allowedRoles: string[]) {
    const user = await this.verifyUserInOrganization(userId, orgId);

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied: Insufficient permissions');
    }

    return user;
  }

  private generateInvitationEmailHtml(organizationName: string, inviteCode: string, customMessage?: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.cyberdefend.tech';
    const joinUrl = `${baseUrl}/join-organization?code=${inviteCode}`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>You're invited to join ${organizationName}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1a365d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f8f9fa; }
            .button { display: inline-block; background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #666; text-align: center; padding: 20px; }
            .code { background-color: #e2e8f0; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited!</h1>
            </div>
            <div class="content">
              <h2>Welcome to ${organizationName}</h2>
              <p>You've been invited to join <strong>${organizationName}</strong> on CyberDefend, our cybersecurity assessment platform.</p>
              
              ${customMessage ? `<p><em>"${customMessage}"</em></p>` : ''}
              
              <p>To accept this invitation, please use the following invite code:</p>
              <div class="code">${inviteCode}</div>
              
              <p>Or click the button below to join directly:</p>
              <a href="${joinUrl}" class="button">Join ${organizationName}</a>
              
              <p><strong>Important:</strong> This invitation will expire in 7 days. If you have any questions, please contact your organization administrator.</p>
            </div>
            <div class="footer">
              <p>This email was sent by CyberDefend. If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateInvitationEmailText(organizationName: string, inviteCode: string, customMessage?: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.cyberdefend.tech';
    const joinUrl = `${baseUrl}/join-organization?code=${inviteCode}`;

    return `
You're invited to join ${organizationName}!

You've been invited to join ${organizationName} on CyberDefend, our cybersecurity assessment platform.

${customMessage ? `"${customMessage}"` : ''}

To accept this invitation, use this invite code: ${inviteCode}

Or visit: ${joinUrl}

Important: This invitation will expire in 7 days.

This email was sent by CyberDefend. If you didn't expect this invitation, you can safely ignore this email.
    `.trim();
  }

}