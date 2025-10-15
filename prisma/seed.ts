import { PrismaClient } from '../generated/prisma';
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

  // Create question category for Shield 360 Assessment
  const categories = [
    {
      name: 'CyberDefend Shield 360 - SME Cyber Safety Assessment',
      description: 'Advanced SME Cyber Safety (CSI+) Assessment to measure true cyber maturity and expose unseen vulnerabilities',
      weight: 1.0,
      order: 1,
    },
  ];

  for (const category of categories) {
    await prisma.questionCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create Shield 360 assessment questions
  const allQuestions = [
    {
      categoryName: 'CyberDefend Shield 360 - SME Cyber Safety Assessment',
      questions: [
        {
          text: 'When a staff member resigns or is dismissed, do you immediately disable all their email, MoMo, and system logins — including WhatsApp or shared business accounts?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Has your business domain been verified with SPF/DKIM records to stop fake emails being sent using your name (e.g., "info@yourcompany.com")?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you independently verify payment account changes from vendors or suppliers via phone before sending large MoMo or bank transfers?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do all your staff know how and to whom to report a suspicious email, message, or transaction — and is this procedure documented?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Does your business keep digital logs of system activities (logins, transactions, data access) that can be reviewed during investigations?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are your files stored in secured cloud storage (with encryption and password policies) instead of open Google Drives or shared laptops?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Have you audited which third-party apps or freelancers have ongoing access to your systems, data, or customer records?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'If you had a data breach today, could you prove compliance with Ghana\'s Data Protection Act (Act 843) or your insurer\'s cyber policy requirements?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are employees\' personal devices protected by anti-malware and auto-lock before connecting to your office Wi-Fi or data systems?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 1, isCorrect: true },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Has your business experienced a fraud, MoMo loss, data breach, or suspicious message incident in the past 12 months — even if it was resolved?',
          type: 'SINGLE_CHOICE',
          weight: 1.0,
          options: [
            { text: 'Yes', value: 'yes', score: 0, isCorrect: false },
            { text: 'Partial / Not Sure', value: 'partial', score: 0.5, isCorrect: false },
            { text: 'No', value: 'no', score: 1, isCorrect: true },
          ]
        }
      ]
    }
  ];

  // Create all questions
  for (const categoryData of allQuestions) {
    const category = await prisma.questionCategory.findUnique({
      where: { name: categoryData.categoryName }
    });

    if (category) {
      for (const questionData of categoryData.questions) {
        const { options, ...questionFields } = questionData;
        const createdQuestion = await prisma.question.create({
          data: {
            text: questionFields.text,
            type: questionFields.type as any,
            weight: questionFields.weight,
            categoryId: category.id,
          },
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