import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get('DATABASE_URL'),
        },
      },
      log: configService.get('NODE_ENV') === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  async enableShutdownHooks(app: any) {
    // TODO: Fix beforeExit handler type issue
    // this.$on('beforeExit' as any, async () => {
    //   await app.close();
    // });
  }

  // Utility method for soft deletes
  async softDelete(model: string, where: any) {
    return this[model].update({
      where,
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  // Utility method for pagination
  getPaginationParams(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return {
      skip,
      take: limit,
    };
  }

  // Utility method for search and filtering
  buildSearchQuery(searchTerm: string, fields: string[]) {
    if (!searchTerm) return {};
    
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    };
  }
}