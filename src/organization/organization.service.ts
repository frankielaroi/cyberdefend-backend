import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateMemberRoleDto, InviteMemberDto } from './dto/member.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

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
    const organization = await this.findOne(id, true);
    
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
        _count: {
          select: {
            assessments: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return members;
  }

  async updateMemberRole(organizationId: string, memberId: string, userId: string, updateMemberRoleDto: UpdateMemberRoleDto) {
    // Check if user is authorized to update member roles
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new ForbiddenException('Not authorized to update member roles');
    }

    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can update member roles');
    }

    // Check if member exists and belongs to the organization
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent self-demotion if they're the only admin
    if (userId === memberId && member.role === 'ORG_ADMIN' && updateMemberRoleDto.role !== 'ORG_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId,
          role: 'ORG_ADMIN',
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException('Cannot demote the only organization admin');
      }
    }

    return this.prisma.user.update({
      where: { id: memberId },
      data: { role: updateMemberRoleDto.role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
      },
    });
  }

  async removeMember(organizationId: string, memberId: string, userId: string) {
    // Check if user is authorized to remove members
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId) {
      throw new ForbiddenException('Not authorized to remove members');
    }

    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can remove members');
    }

    // Check if member exists and belongs to the organization
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member || member.organizationId !== organizationId) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Prevent removing the only admin
    if (member.role === 'ORG_ADMIN') {
      const adminCount = await this.prisma.user.count({
        where: {
          organizationId,
          role: 'ORG_ADMIN',
        },
      });

      if (adminCount === 1) {
        throw new BadRequestException('Cannot remove the only organization admin');
      }
    }

    // Remove member from organization
    await this.prisma.user.update({
      where: { id: memberId },
      data: {
        organizationId: null,
        role: 'END_USER',
      },
    });

    return { message: 'Member removed successfully' };
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
}