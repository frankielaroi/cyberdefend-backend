import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.question.findMany({
    include: {
      category: true,
      options: true,
    },
  });

  console.log(`\n✅ Total questions: ${questions.length}\n`);
  
  questions.forEach((q, i) => {
    console.log(`${i + 1}. ${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}`);
    console.log(`   Category: ${q.category.name}`);
    console.log(`   Type: ${q.type}`);
    console.log(`   Options: ${q.options.length}`);
    q.options.forEach((opt) => {
      console.log(`     - ${opt.text}: ${opt.score} point(s)`);
    });
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
