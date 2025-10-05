import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService) {}

  async getActiveQuestions() {
    return this.prisma.question.findMany({
      where: { isActive: true },
      include: {
        category: true,
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [
        { category: { order: 'asc' } },
        { order: 'asc' },
      ],
    });
  }

  async getQuestionById(id: string) {
    return this.prisma.question.findUnique({
      where: { id },
      include: {
        category: true,
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async getQuestionsByCategory(categoryId: string) {
    return this.prisma.question.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getCategories() {
    return this.prisma.questionCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });
  }
}