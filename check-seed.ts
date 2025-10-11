import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function checkSeedData() {
  console.log('📊 Checking seeded data...\n');

  // Check question categories
  const categories = await prisma.questionCategory.findMany({
    include: {
      _count: {
        select: { questions: true }
      }
    }
  });

  console.log('📋 Assessment Categories:');
  categories.forEach(category => {
    console.log(`  • ${category.name}: ${category._count.questions} questions`);
  });

  // Check total questions
  const totalQuestions = await prisma.question.count();
  console.log(`\n📊 Total Questions: ${totalQuestions}`);

  // Check sample questions from first category
  if (categories.length > 0) {
    const sampleQuestions = await prisma.question.findMany({
      where: { categoryId: categories[0].id },
      take: 3,
      include: { options: true }
    });

    console.log(`\n📝 Sample questions from "${categories[0].name}":`);
    sampleQuestions.forEach((q, index) => {
      console.log(`  ${index + 1}. ${q.text}`);
      q.options.forEach(opt => {
        console.log(`     console.log(`     ${opt.text} (Score: ${opt.score})`);
      });
    });
  }

  await prisma.$disconnect();
}

checkSeedData().catch(console.error);`);
      });
    });
    });
  }

  await prisma.$disconnect();
}

checkSeedData().catch(console.error);