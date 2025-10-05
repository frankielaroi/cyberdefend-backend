import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create subscription plans
  const defendCore = await prisma.subscriptionPlan.upsert({
    where: { name: 'DefendCore' },
    update: {},
    create: {
      name: 'DefendCore',
      description: 'Basic cybersecurity assessment and CSI scoring',
      features: JSON.stringify([
        'CSI Assessment',
        'Basic Reporting',
        'Email Support',
        'Up to 50 users'
      ]),
      price: 99.00,
      type: 'DEFEND_CORE',
      maxUsers: 50,
      maxAssessments: 12,
      trialDays: 14,
    },
  });

  const defendVault = await prisma.subscriptionPlan.upsert({
    where: { name: 'DefendVault' },
    update: {},
    create: {
      name: 'DefendVault',
      description: 'DefendCore + Phishing simulation and training',
      features: JSON.stringify([
        'Everything in DefendCore',
        'Phishing Campaigns',
        'Email Security Training',
        'Advanced Reporting',
        'Up to 200 users'
      ]),
      price: 199.00,
      type: 'DEFEND_VAULT',
      maxUsers: 200,
      trialDays: 14,
    },
  });

  const defendClick = await prisma.subscriptionPlan.upsert({
    where: { name: 'DefendClick' },
    update: {},
    create: {
      name: 'DefendClick',
      description: 'Full platform access with monitoring and compliance',
      features: JSON.stringify([
        'Everything in DefendVault',
        'Real-time Monitoring',
        'SIEM Integration',
        'Compliance Reporting',
        'Priority Support',
        'Unlimited users'
      ]),
      price: 399.00,
      type: 'DEFEND_CLICK',
      trialDays: 14,
    },
  });

  // Create question categories
  const categories = [
    {
      name: 'Access Control',
      description: 'User authentication and authorization policies',
      weight: 1.2,
      order: 1,
    },
    {
      name: 'Data Protection',
      description: 'Data encryption, backup, and privacy measures',
      weight: 1.3,
      order: 2,
    },
    {
      name: 'Network Security',
      description: 'Firewall, VPN, and network monitoring',
      weight: 1.1,
      order: 3,
    },
    {
      name: 'Incident Response',
      description: 'Security incident handling and recovery procedures',
      weight: 1.4,
      order: 4,
    },
    {
      name: 'Employee Training',
      description: 'Security awareness and training programs',
      weight: 1.0,
      order: 5,
    },
    {
      name: 'Compliance',
      description: 'Regulatory compliance and audit procedures',
      weight: 1.2,
      order: 6,
    },
  ];

  for (const category of categories) {
    await prisma.questionCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create sample questions
  const accessControlCategory = await prisma.questionCategory.findUnique({
    where: { name: 'Access Control' }
  });

  if (accessControlCategory) {
    const questions = [
      {
        text: 'Does your organization enforce multi-factor authentication (MFA) for all user accounts?',
        type: 'YES_NO',
        weight: 1.5,
        categoryId: accessControlCategory.id,
        options: [
          { text: 'Yes, for all accounts', value: 'yes', score: 10, isCorrect: true },
          { text: 'Only for admin accounts', value: 'partial', score: 5, isCorrect: false },
          { text: 'No', value: 'no', score: 0, isCorrect: false },
        ]
      },
      {
        text: 'How often do you review and update user access permissions?',
        type: 'SINGLE_CHOICE',
        weight: 1.0,
        categoryId: accessControlCategory.id,
        options: [
          { text: 'Monthly', value: 'monthly', score: 10, isCorrect: true },
          { text: 'Quarterly', value: 'quarterly', score: 8, isCorrect: false },
          { text: 'Annually', value: 'annually', score: 5, isCorrect: false },
          { text: 'Never', value: 'never', score: 0, isCorrect: false },
        ]
      }
    ];

    for (const questionData of questions) {
      const { options, ...question } = questionData;
      const createdQuestion = await prisma.question.create({
        data: question,
      });

      for (const option of options) {
        await prisma.questionOption.create({
          data: {
            ...option,
            questionId: createdQuestion.id,
          },
        });
      }
    }
  }

  // Create super admin user
  const hashedPassword = await bcrypt.hash('admin123!', 12);
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@cyberdefend360.com' },
    update: {},
    create: {
      email: 'admin@cyberdefend360.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
  });

  // Create CSA admin user
  const csaAdmin = await prisma.user.upsert({
    where: { email: 'csa@cyberdefend360.com' },
    update: {},
    create: {
      email: 'csa@cyberdefend360.com',
      password: hashedPassword,
      firstName: 'CSA',
      lastName: 'Administrator',
      role: 'CSA_ADMIN',
      emailVerified: true,
    },
  });

  // Create sample organization
  const sampleOrg = await prisma.organization.upsert({
    where: { email: 'demo@samplecompany.com' },
    update: {},
    create: {
      name: 'Sample Technology Company',
      email: 'demo@samplecompany.com',
      phone: '+233501234567',
      website: 'https://samplecompany.com',
      description: 'A technology company for demonstration purposes',
      address: '123 Tech Street, East Legon',
      city: 'Accra',
      region: 'Greater Accra',
      gpsAddress: 'GA-123-4567',
      size: 'MEDIUM',
      sector: 'TECHNOLOGY',
      isPublic: true,
    },
  });

  // Create org admin for sample organization
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@samplecompany.com' },
    update: {},
    create: {
      email: 'admin@samplecompany.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Manager',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: sampleOrg.id,
    },
  });

  // Create sample subscription
  await prisma.subscription.create({
    data: {
      organizationId: sampleOrg.id,
      planId: defendVault.id,
      status: 'TRIAL',
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
    },
  });

  // Create some benchmark data
  const regions = ['Greater Accra', 'Ashanti', 'Western', 'Central', 'Northern'];
  const sectors = ['BANKING', 'TELECOMMUNICATIONS', 'GOVERNMENT', 'EDUCATION', 'TECHNOLOGY'];
  const sizes = ['SMALL', 'MEDIUM', 'LARGE'];

  for (const region of regions) {
    for (const sector of sectors) {
      for (const size of sizes) {
        await prisma.benchmarkData.upsert({
          where: {
            region_sector_size_period: {
              region,
              sector: sector as any,
              size: size as any,
              period: '2024-Q4',
            },
          },
          update: {},
          create: {
            region,
            sector: sector as any,
            size: size as any,
            avgScore: 45 + Math.random() * 40, // Random score between 45-85
            totalOrgs: Math.floor(Math.random() * 50) + 10, // Random count 10-60
            period: '2024-Q4',
          },
        });
      }
    }
  }

  console.log('✅ Database seeded successfully!');
  console.log('👤 Super Admin: admin@cyberdefend360.com / admin123!');
  console.log('👤 CSA Admin: csa@cyberdefend360.com / admin123!');
  console.log('👤 Org Admin: admin@samplecompany.com / admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });