import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';
import { hashToken } from '../src/common/utils/token.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed...');

  // Hash password function
  const hashPassword = async (password: string) => await bcrypt.hash(password, 12);

  // ============================================================================
  // SUBSCRIPTION PLANS
  // ============================================================================
  console.log('📋 Creating subscription plans...');

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

  // ============================================================================
  // QUESTION CATEGORIES AND QUESTIONS
  // ============================================================================
  console.log('❓ Creating question categories and questions...');

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

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================
  console.log('🏢 Creating organizations...');

  const organizationsData = [
    {
      name: 'Ghana Commercial Bank',
      email: 'admin@gcb.com',
      phone: '+233302611111',
      website: 'https://gcb.com',
      description: 'Leading commercial bank in Ghana',
      address: '1 Thorpe Road, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      size: 'ENTERPRISE',
      sector: 'BANKING',
      isPublic: true,
    },
    {
      name: 'MTN Ghana',
      email: 'admin@mtn.com.gh',
      phone: '+233243000000',
      website: 'https://mtn.com.gh',
      description: 'Leading telecommunications provider',
      address: 'MTN Towers, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      size: 'ENTERPRISE',
      sector: 'TELECOMMUNICATIONS',
      isPublic: true,
    },
    {
      name: 'University of Ghana',
      email: 'admin@ug.edu.gh',
      phone: '+233302500000',
      website: 'https://ug.edu.gh',
      description: 'Premier university in Ghana',
      address: 'Legon, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      size: 'LARGE',
      sector: 'EDUCATION',
      isPublic: true,
    },
    {
      name: 'Tema Oil Refinery',
      email: 'admin@tor.com',
      phone: '+233303211111',
      website: 'https://tor.com',
      description: 'Major oil refinery in Ghana',
      address: 'Tema',
      city: 'Tema',
      region: 'Greater Accra',
      size: 'LARGE',
      sector: 'ENERGY',
      isPublic: true,
    },
    {
      name: 'Software Development Company Ltd',
      email: 'admin@softdev.com',
      phone: '+233501234567',
      website: 'https://softdev.com',
      description: 'Leading software development company',
      address: 'East Legon, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      size: 'MEDIUM',
      sector: 'TECHNOLOGY',
      isPublic: false,
    },
    {
      name: 'Kumasi Technical Institute',
      email: 'admin@kti.edu.gh',
      phone: '+233322012345',
      website: 'https://kti.edu.gh',
      description: 'Technical education institute',
      address: 'Kumasi',
      city: 'Kumasi',
      region: 'Ashanti',
      size: 'MEDIUM',
      sector: 'EDUCATION',
      isPublic: true,
    },
    {
      name: 'Northern Regional Hospital',
      email: 'admin@nrh.gov.gh',
      phone: '+233372012345',
      website: 'https://nrh.gov.gh',
      description: 'Regional hospital serving Northern Ghana',
      address: 'Tamale',
      city: 'Tamale',
      region: 'Northern',
      size: 'MEDIUM',
      sector: 'HEALTHCARE',
      isPublic: true,
    },
    {
      name: 'TechStart Solutions',
      email: 'admin@techstart.com',
      phone: '+233241234567',
      website: 'https://techstart.com',
      description: 'Startup technology solutions provider',
      address: 'Cantonments, Accra',
      city: 'Accra',
      region: 'Greater Accra',
      size: 'SMALL',
      sector: 'TECHNOLOGY',
      isPublic: false,
    },
    {
      name: 'West Coast Logistics',
      email: 'admin@wcl.com',
      phone: '+233312345678',
      website: 'https://wcl.com',
      description: 'Logistics and supply chain company',
      address: 'Takoradi',
      city: 'Takoradi',
      region: 'Western',
      size: 'MEDIUM',
      sector: 'LOGISTICS',
      isPublic: false,
    },
    {
      name: 'Green Valley Farms',
      email: 'admin@gvf.com',
      phone: '+233332012345',
      website: 'https://gvf.com',
      description: 'Agricultural products company',
      address: 'Cape Coast',
      city: 'Cape Coast',
      region: 'Central',
      size: 'SMALL',
      sector: 'OTHER',
      isPublic: false,
    },
  ];

  const organizations = [];
  for (const orgData of organizationsData) {
    const org = await prisma.organization.upsert({
      where: { email: orgData.email },
      update: {},
      create: {
        ...orgData,
        size: orgData.size as any,
        sector: orgData.sector as any,
      },
    });
    organizations.push(org);
  }

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('👥 Creating users...');

  const usersData = [
    // Super Admin
    {
      email: 'superadmin@cyberdefend360.com',
      password: 'superadmin@cyberdefend360.com',
      firstName: 'Super',
      lastName: 'Administrator',
      role: 'SUPER_ADMIN',
      emailVerified: true,
    },
    // CSA Admins
    {
      email: 'csa1@cyberdefend360.com',
      password: 'csa1@cyberdefend360.com',
      firstName: 'CSA',
      lastName: 'Admin One',
      role: 'CSA_ADMIN',
      emailVerified: true,
    },
    {
      email: 'csa2@cyberdefend360.com',
      password: 'csa2@cyberdefend360.com',
      firstName: 'CSA',
      lastName: 'Admin Two',
      role: 'CSA_ADMIN',
      emailVerified: true,
    },
    // GCB Users
    {
      email: 'admin@gcb.com',
      password: 'admin@gcb.com',
      firstName: 'Bank',
      lastName: 'Administrator',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: organizations[0].id,
    },
    {
      email: 'manager@gcb.com',
      password: 'manager@gcb.com',
      firstName: 'Bank',
      lastName: 'Manager',
      role: 'ORG_MANAGER',
      emailVerified: true,
      organizationId: organizations[0].id,
    },
    {
      email: 'user1@gcb.com',
      password: 'user1@gcb.com',
      firstName: 'Bank',
      lastName: 'User One',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[0].id,
    },
    {
      email: 'user2@gcb.com',
      password: 'user2@gcb.com',
      firstName: 'Bank',
      lastName: 'User Two',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[0].id,
    },
    // MTN Users
    {
      email: 'admin@mtn.com.gh',
      password: 'admin@mtn.com.gh',
      firstName: 'Telecom',
      lastName: 'Administrator',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: organizations[1].id,
    },
    {
      email: 'manager@mtn.com.gh',
      password: 'manager@mtn.com.gh',
      firstName: 'Telecom',
      lastName: 'Manager',
      role: 'ORG_MANAGER',
      emailVerified: true,
      organizationId: organizations[1].id,
    },
    {
      email: 'user1@mtn.com.gh',
      password: 'user1@mtn.com.gh',
      firstName: 'Telecom',
      lastName: 'User One',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[1].id,
    },
    // University Users
    {
      email: 'admin@ug.edu.gh',
      password: 'admin@ug.edu.gh',
      firstName: 'University',
      lastName: 'Administrator',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: organizations[2].id,
    },
    {
      email: 'manager@ug.edu.gh',
      password: 'manager@ug.edu.gh',
      firstName: 'University',
      lastName: 'Manager',
      role: 'ORG_MANAGER',
      emailVerified: true,
      organizationId: organizations[2].id,
    },
    {
      email: 'user1@ug.edu.gh',
      password: 'user1@ug.edu.gh',
      firstName: 'University',
      lastName: 'User One',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[2].id,
    },
    // Software Company Users
    {
      email: 'admin@softdev.com',
      password: 'admin@softdev.com',
      firstName: 'Software',
      lastName: 'Administrator',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: organizations[4].id,
    },
    {
      email: 'manager@softdev.com',
      password: 'manager@softdev.com',
      firstName: 'Software',
      lastName: 'Manager',
      role: 'ORG_MANAGER',
      emailVerified: true,
      organizationId: organizations[4].id,
    },
    {
      email: 'dev1@softdev.com',
      password: 'dev1@softdev.com',
      firstName: 'Developer',
      lastName: 'One',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[4].id,
    },
    {
      email: 'dev2@softdev.com',
      password: 'dev2@softdev.com',
      firstName: 'Developer',
      lastName: 'Two',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[4].id,
    },
    {
      email: 'dev3@softdev.com',
      password: 'dev3@softdev.com',
      firstName: 'Developer',
      lastName: 'Three',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[4].id,
    },
    // TechStart Users
    {
      email: 'admin@techstart.com',
      password: 'admin@techstart.com',
      firstName: 'Startup',
      lastName: 'Administrator',
      role: 'ORG_ADMIN',
      emailVerified: true,
      organizationId: organizations[7].id,
    },
    {
      email: 'founder@techstart.com',
      password: 'founder@techstart.com',
      firstName: 'Startup',
      lastName: 'Founder',
      role: 'ORG_MANAGER',
      emailVerified: true,
      organizationId: organizations[7].id,
    },
    {
      email: 'employee1@techstart.com',
      password: 'employee1@techstart.com',
      firstName: 'Startup',
      lastName: 'Employee One',
      role: 'END_USER',
      emailVerified: true,
      organizationId: organizations[7].id,
    },
  ];

  const users = [];
  for (const userData of usersData) {
    const hashedPassword = await hashPassword(userData.password);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role as any,
        emailVerified: userData.emailVerified,
        ...(userData.organizationId && { organizationId: userData.organizationId }),
      },
    });
    users.push(user);
  }

  // ============================================================================
  // ASSESSMENTS
  // ============================================================================
  console.log('📊 Creating assessments...');

  const questions = await prisma.question.findMany({
    include: { options: true }
  });

  const assessmentsData = [
    {
      title: 'GCB Cybersecurity Assessment 2024',
      description: 'Annual cybersecurity assessment for Ghana Commercial Bank',
      type: 'CSI_ASSESSMENT',
      status: 'COMPLETED',
      score: 85.5,
      maxScore: 100,
      riskTier: 'LOW',
      startedAt: new Date('2024-01-15'),
      completedAt: new Date('2024-01-20'),
      organizationId: organizations[0].id,
      userId: users[3].id, // GCB admin
    },
    {
      title: 'MTN Security Audit 2024',
      description: 'Comprehensive security audit for MTN Ghana',
      type: 'SECURITY_AUDIT',
      status: 'COMPLETED',
      score: 78.2,
      maxScore: 100,
      riskTier: 'MEDIUM',
      startedAt: new Date('2024-02-01'),
      completedAt: new Date('2024-02-15'),
      organizationId: organizations[1].id,
      userId: users[7].id, // MTN admin
    },
    {
      title: 'University of Ghana CSI Assessment',
      description: 'Cybersecurity maturity assessment for the university',
      type: 'CSI_ASSESSMENT',
      status: 'COMPLETED',
      score: 65.8,
      maxScore: 100,
      riskTier: 'HIGH',
      startedAt: new Date('2024-03-01'),
      completedAt: new Date('2024-03-10'),
      organizationId: organizations[2].id,
      userId: users[11].id, // UG admin
    },
    {
      title: 'Software Development Company Assessment',
      description: 'Technology company cybersecurity evaluation',
      type: 'CSI_ASSESSMENT',
      status: 'IN_PROGRESS',
      score: null,
      maxScore: 100,
      riskTier: null,
      startedAt: new Date('2024-10-01'),
      completedAt: null,
      organizationId: organizations[4].id,
      userId: users[14].id, // Software admin
    },
    {
      title: 'TechStart Startup Assessment',
      description: 'Cybersecurity assessment for tech startup',
      type: 'CSI_ASSESSMENT',
      status: 'DRAFT',
      score: null,
      maxScore: 100,
      riskTier: null,
      startedAt: null,
      completedAt: null,
      organizationId: organizations[7].id,
      userId: users[18].id, // TechStart admin
    },
  ];

  const assessments = [];
  for (const assessmentData of assessmentsData) {
    const assessment = await prisma.assessment.create({
      data: {
        title: assessmentData.title,
        description: assessmentData.description,
        type: assessmentData.type as any,
        status: assessmentData.status as any,
        score: assessmentData.score,
        maxScore: assessmentData.maxScore,
        riskTier: assessmentData.riskTier as any,
        startedAt: assessmentData.startedAt,
        completedAt: assessmentData.completedAt,
        organizationId: assessmentData.organizationId,
        userId: assessmentData.userId,
      },
    });
    assessments.push(assessment);

    // Create responses for completed assessments
    if (assessment.status === 'COMPLETED') {
      let totalScore = 0;
      let totalMaxScore = 0;

      for (const question of questions) {
        const randomOption = question.options[Math.floor(Math.random() * question.options.length)];
        const score = randomOption.score;

        await prisma.assessmentResponse.create({
          data: {
            answer: randomOption.value,
            score: score,
            timeSpent: Math.floor(Math.random() * 300) + 30, // 30-330 seconds
            assessmentId: assessment.id,
            questionId: question.id,
          },
        });

        totalScore += score;
        totalMaxScore += 1; // Assuming max score per question is 1
      }

      // Create assessment result
      const overallScore = (totalScore / totalMaxScore) * 5; // Convert to 0-5 scale
      const overallPercentage = (totalScore / totalMaxScore) * 100;

      let tier: any = 'BASIC';
      if (overallPercentage >= 80) tier = 'INNOVATIVE';
      else if (overallPercentage >= 60) tier = 'ADVANCED';
      else if (overallPercentage >= 40) tier = 'ORGANIZATIONAL';
      else if (overallPercentage >= 20) tier = 'FOUNDATIONAL';

      await prisma.assessmentResult.create({
        data: {
          overallScore,
          overallPercentage,
          tier,
          categoryScores: JSON.stringify({ total: totalScore }),
          sectionScores: JSON.stringify({ main: totalScore }),
          questionsAnswered: questions.length,
          totalQuestions: questions.length,
          completionRate: 100,
          totalTimeMinutes: Math.floor(Math.random() * 60) + 15,
          assessmentId: assessment.id,
        },
      });
    }
  }

  // ============================================================================
  // PHISHING TEMPLATES
  // ============================================================================
  console.log('🎣 Creating phishing templates...');

  const templatesData = [
    {
      name: 'Bank Account Verification',
      description: 'Urgent bank account verification phishing template',
      category: 'FINANCE',
      riskLevel: 'HIGH',
      defaultSubject: 'URGENT: Bank Account Verification Required',
      defaultSenderName: 'Bank Security Team',
      emailBodyHtml: '<h1>Account Verification Required</h1><p>Your account needs immediate verification. Click the link below to secure your account.</p><a href="#">Verify Account</a>',
      emailBodyText: 'Account Verification Required\n\nYour account needs immediate verification. Click the link below to secure your account.\n\nVerify Account: [LINK]',
      captureCredentials: true,
      previewContent: 'Bank account verification scam',
      tags: ['bank', 'verification', 'urgent'],
    },
    {
      name: 'IT Support Request',
      description: 'Fake IT support request template',
      category: 'IT',
      riskLevel: 'MEDIUM',
      defaultSubject: 'IT Support: System Update Required',
      defaultSenderName: 'IT Support Team',
      emailBodyHtml: '<h1>System Update Required</h1><p>Your system requires an immediate update. Please click the link to install the update.</p><a href="#">Install Update</a>',
      emailBodyText: 'System Update Required\n\nYour system requires an immediate update. Please click the link to install the update.\n\nInstall Update: [LINK]',
      captureCredentials: false,
      previewContent: 'IT system update request',
      tags: ['it', 'support', 'update'],
    },
    {
      name: 'HR Policy Update',
      description: 'Fake HR policy update template',
      category: 'HR',
      riskLevel: 'MEDIUM',
      defaultSubject: 'Important: HR Policy Update',
      defaultSenderName: 'Human Resources',
      emailBodyHtml: '<h1>HR Policy Update</h1><p>Please review the updated company policies. Your acknowledgment is required.</p><a href="#">Review Policies</a>',
      emailBodyText: 'HR Policy Update\n\nPlease review the updated company policies. Your acknowledgment is required.\n\nReview Policies: [LINK]',
      captureCredentials: false,
      previewContent: 'HR policy update notification',
      tags: ['hr', 'policy', 'update'],
    },
    {
      name: 'Executive Communication',
      description: 'Fake executive communication template',
      category: 'EXECUTIVE',
      riskLevel: 'HIGH',
      defaultSubject: 'Confidential: Executive Directive',
      defaultSenderName: 'CEO Office',
      emailBodyHtml: '<h1>Confidential Executive Directive</h1><p>This is a confidential communication from the CEO. Please review immediately.</p><a href="#">Open Document</a>',
      emailBodyText: 'Confidential Executive Directive\n\nThis is a confidential communication from the CEO. Please review immediately.\n\nOpen Document: [LINK]',
      captureCredentials: false,
      previewContent: 'Confidential executive communication',
      tags: ['executive', 'confidential', 'ceo'],
    },
  ];

  const templates = [];
  for (const templateData of templatesData) {
    const template = await prisma.phishingTemplate.upsert({
      where: { name: templateData.name },
      update: {},
      create: {
        ...templateData,
        category: templateData.category as any,
        riskLevel: templateData.riskLevel as any,
      },
    });
    templates.push(template);
  }

  // ============================================================================
  // PHISHING CAMPAIGNS
  // ============================================================================
  console.log('📧 Creating phishing campaigns...');

  const campaignsData = [
    {
      name: 'GCB Security Awareness Campaign',
      description: 'Monthly security awareness training for bank employees',
      templateId: templates[0].id,
      subject: 'URGENT: Bank Account Security Alert',
      senderName: 'GCB Security Team',
      senderEmail: 'security@gcb.com',
      landingPageUrl: 'https://phishing-test.com/bank-verification',
      status: 'COMPLETED',
      scheduledAt: new Date('2024-09-01'),
      launchedAt: new Date('2024-09-01'),
      completedAt: new Date('2024-09-15'),
      targetCount: 150,
      emailsSent: 150,
      emailsDelivered: 145,
      emailsOpened: 89,
      linksClicked: 34,
      credentialsEntered: 12,
      phishingReported: 8,
      emailsBounced: 5,
      createdBy: users[3].id, // GCB admin
      organizationId: organizations[0].id,
    },
    {
      name: 'MTN IT Update Campaign',
      description: 'IT system update awareness campaign',
      templateId: templates[1].id,
      subject: 'IT Support: Critical System Update',
      senderName: 'MTN IT Support',
      senderEmail: 'it@mtn.com.gh',
      landingPageUrl: 'https://phishing-test.com/it-update',
      status: 'RUNNING',
      scheduledAt: new Date('2024-10-01'),
      launchedAt: new Date('2024-10-01'),
      completedAt: null,
      targetCount: 200,
      emailsSent: 200,
      emailsDelivered: 195,
      emailsOpened: 67,
      linksClicked: 23,
      credentialsEntered: 0,
      phishingReported: 15,
      emailsBounced: 5,
      createdBy: users[7].id, // MTN admin
      organizationId: organizations[1].id,
    },
    {
      name: 'Software Dev HR Campaign',
      description: 'HR policy awareness for tech company',
      templateId: templates[2].id,
      subject: 'HR: Updated Remote Work Policy',
      senderName: 'HR Department',
      senderEmail: 'hr@softdev.com',
      landingPageUrl: 'https://phishing-test.com/hr-policy',
      status: 'DRAFT',
      scheduledAt: new Date('2024-11-01'),
      launchedAt: null,
      completedAt: null,
      targetCount: 0,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsOpened: 0,
      linksClicked: 0,
      credentialsEntered: 0,
      phishingReported: 0,
      emailsBounced: 0,
      createdBy: users[14].id, // Software admin
      organizationId: organizations[4].id,
    },
  ];

  const campaigns = [];
  for (const campaignData of campaignsData) {
    // Get the template content
    const template = templates.find(t => t.id === campaignData.templateId);
    if (!template) continue;

    const campaign = await prisma.phishingCampaign.create({
      data: {
        name: campaignData.name,
        description: campaignData.description,
        templateId: campaignData.templateId,
        template: template.emailBodyHtml, // Cached template content
        subject: campaignData.subject,
        senderName: campaignData.senderName,
        senderEmail: campaignData.senderEmail,
        landingPageUrl: campaignData.landingPageUrl,
        status: campaignData.status as any,
        scheduledAt: campaignData.scheduledAt,
        launchedAt: campaignData.launchedAt,
        completedAt: campaignData.completedAt,
        targetCount: campaignData.targetCount,
        emailsSent: campaignData.emailsSent,
        emailsDelivered: campaignData.emailsDelivered,
        emailsOpened: campaignData.emailsOpened,
        linksClicked: campaignData.linksClicked,
        credentialsEntered: campaignData.credentialsEntered,
        phishingReported: campaignData.phishingReported,
        emailsBounced: campaignData.emailsBounced,
        createdBy: campaignData.createdBy,
        organizationId: campaignData.organizationId,
      } as any,
    });
    campaigns.push(campaign);
  }

  // ============================================================================
  // PHISHING TARGETS
  // ============================================================================
  console.log('🎯 Creating phishing targets...');

  // Create targets for GCB campaign
  const gcbUsers = users.filter(u => u.organizationId === organizations[0].id);
  for (const user of gcbUsers) {
    await prisma.phishingTarget.create({
      data: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        department: 'Various',
        emailSent: true,
        emailDelivered: Math.random() > 0.03, // 97% delivery rate
        emailOpened: Math.random() > 0.4, // 60% open rate
        linkClicked: Math.random() > 0.7, // 30% click rate
        credentialsEntered: Math.random() > 0.9, // 10% credential rate
        reportedPhishing: Math.random() > 0.85, // 15% report rate
        emailBounced: Math.random() > 0.97, // 3% bounce rate
        sentAt: new Date('2024-09-01'),
        deliveredAt: Math.random() > 0.03 ? new Date('2024-09-01') : null,
        openedAt: Math.random() > 0.4 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        clickedAt: Math.random() > 0.7 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        credentialsAt: Math.random() > 0.9 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        reportedAt: Math.random() > 0.85 ? new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        bouncedAt: Math.random() > 0.97 ? new Date('2024-09-01') : null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        clickCount: Math.floor(Math.random() * 5),
        riskScore: Math.floor(Math.random() * 10),
        campaignId: campaigns[0].id,
        userId: user.id,
      },
    });
  }

  // ============================================================================
  // AGENTS
  // ============================================================================
  console.log('🤖 Creating agents...');

  const agentsData = [
    {
      name: 'GCB-Windows-Server-01',
      version: '1.2.3',
      osType: 'Windows',
      osVersion: 'Windows Server 2019',
      hostname: 'gcb-server-01',
      ipAddress: '10.0.1.100',
      macAddress: '00:1B:44:11:3A:B7',
      isActive: true,
      lastSeen: new Date(),
      apiKey: hashToken('gcb-agent-key-001'),
      organizationId: organizations[0].id,
    },
    {
      name: 'MTN-Linux-Workstation-01',
      version: '1.2.3',
      osType: 'Linux',
      osVersion: 'Ubuntu 20.04 LTS',
      hostname: 'mtn-workstation-01',
      ipAddress: '10.0.2.150',
      macAddress: '00:1B:44:11:3A:B8',
      isActive: true,
      lastSeen: new Date(),
      apiKey: hashToken('mtn-agent-key-001'),
      organizationId: organizations[1].id,
    },
    {
      name: 'UG-Windows-Laptop-01',
      version: '1.2.3',
      osType: 'Windows',
      osVersion: 'Windows 11 Pro',
      hostname: 'ug-laptop-01',
      ipAddress: '10.0.3.200',
      macAddress: '00:1B:44:11:3A:B9',
      isActive: true,
      lastSeen: new Date(),
      apiKey: hashToken('ug-agent-key-001'),
      organizationId: organizations[2].id,
    },
    {
      name: 'SoftDev-macOS-Workstation-01',
      version: '1.2.3',
      osType: 'macOS',
      osVersion: 'macOS Monterey 12.6',
      hostname: 'softdev-mac-01',
      ipAddress: '192.168.1.100',
      macAddress: '00:1B:44:11:3A:BA',
      isActive: true,
      lastSeen: new Date(),
      apiKey: 'softdev-agent-key-001',
      organizationId: organizations[4].id,
    },
  ];

  const agents = [];
  for (const agentData of agentsData) {
    const agent = await prisma.agent.create({
      data: agentData,
    });
    agents.push(agent);
  }

  // ============================================================================
  // TELEMETRY EVENTS
  // ============================================================================
  console.log('📊 Creating telemetry events...');

  const eventTypes = ['LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'FILE_ACCESS', 'PROCESS_START', 'NETWORK_CONNECTION'];
  const severities = ['LOW', 'INFO', 'MEDIUM', 'HIGH'];

  for (let i = 0; i < 50; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const user = users.find(u => u.organizationId === agent.organizationId);

    await prisma.telemetryEvent.create({
      data: {
        type: eventTypes[Math.floor(Math.random() * eventTypes.length)] as any,
        source: 'CyberDefend Agent',
        data: JSON.stringify({
          action: 'system_activity',
          details: `Activity ${i + 1}`,
          timestamp: new Date().toISOString(),
        }),
        severity: severities[Math.floor(Math.random() * severities.length)] as any,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
        agentId: agent.id,
        userId: user?.id,
      },
    });
  }

  // ============================================================================
  // DETECTION RULES AND ALERTS
  // ============================================================================
  console.log('🚨 Creating detection rules and alerts...');

  const rulesData = [
    {
      name: 'Suspicious Login Attempts',
      description: 'Detect multiple failed login attempts',
      condition: 'failed_logins > 5',
      action: 'ALERT',
      severity: 'HIGH',
      isActive: true,
    },
    {
      name: 'Unusual Network Traffic',
      description: 'Detect unusual outbound network connections',
      condition: 'outbound_connections > 1000',
      action: 'ALERT',
      severity: 'MEDIUM',
      isActive: true,
    },
    {
      name: 'File System Changes',
      description: 'Monitor critical file system changes',
      condition: 'file_modifications in critical_paths',
      action: 'LOG',
      severity: 'LOW',
      isActive: true,
    },
  ];

  const rules = [];
  for (const ruleData of rulesData) {
    const rule = await prisma.detectionRule.create({
      data: {
        ...ruleData,
        action: ruleData.action as any,
        severity: ruleData.severity as any,
      },
    });
    rules.push(rule);
  }

  // Create alerts
  for (let i = 0; i < 20; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const rule = rules[Math.floor(Math.random() * rules.length)];

    await prisma.alert.create({
      data: {
        title: `Security Alert ${i + 1}`,
        description: `Automated security alert triggered by rule: ${rule.name}`,
        severity: rule.severity as any,
        status: i % 5 === 0 ? 'RESOLVED' : 'OPEN',
        data: JSON.stringify({
          triggered_at: new Date().toISOString(),
          details: `Alert details for event ${i + 1}`,
        }),
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
        ruleId: rule.id,
        agentId: agent.id,
      },
    });
  }

  // ============================================================================
  // SCAN RESULTS
  // ============================================================================
  console.log('🔍 Creating scan results...');

  const scanTypes = ['VULNERABILITY_SCAN', 'MALWARE_SCAN', 'COMPLIANCE_SCAN'];
  const scanStatuses = ['COMPLETED', 'COMPLETED', 'COMPLETED'];
  const grades = ['A', 'B', 'C', 'D', 'F'];

  for (const agent of agents) {
    for (let i = 0; i < 3; i++) {
      await prisma.scanResult.create({
        data: {
          type: scanTypes[i] as any,
          status: 'COMPLETED',
          score: grades[Math.floor(Math.random() * grades.length)],
          findings: JSON.stringify({
            vulnerabilities: Math.floor(Math.random() * 10),
            malware: Math.floor(Math.random() * 5),
            compliance_issues: Math.floor(Math.random() * 8),
          }),
          recommendations: JSON.stringify([
            'Update system patches',
            'Install antivirus software',
            'Review access controls',
          ]),
          startedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          completedAt: new Date(),
          agentId: agent.id,
        },
      });
    }
  }

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================
  console.log('💳 Creating subscriptions...');

  const subscriptionsData = [
    {
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      autoRenew: true,
      organizationId: organizations[0].id, // GCB
      planId: defendClick.id,
    },
    {
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2025-02-01'),
      autoRenew: true,
      organizationId: organizations[1].id, // MTN
      planId: defendVault.id,
    },
    {
      status: 'TRIAL',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-16'),
      trialEndDate: new Date('2024-10-16'),
      autoRenew: true,
      organizationId: organizations[4].id, // Software Dev
      planId: defendCore.id,
    },
    {
      status: 'ACTIVE',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2025-03-01'),
      autoRenew: true,
      organizationId: organizations[7].id, // TechStart
      planId: defendCore.id,
    },
  ];

  const subscriptions = [];
  for (const subscriptionData of subscriptionsData) {
    const subscription = await prisma.subscription.create({
      data: {
        status: subscriptionData.status as any,
        startDate: subscriptionData.startDate,
        endDate: subscriptionData.endDate,
        trialEndDate: subscriptionData.trialEndDate,
        autoRenew: subscriptionData.autoRenew,
        organizationId: subscriptionData.organizationId,
        planId: subscriptionData.planId,
      },
    });
    subscriptions.push(subscription);
  }

  // ============================================================================
  // INVOICES AND PAYMENTS
  // ============================================================================
  console.log('🧾 Creating invoices and payments...');

  for (const subscription of subscriptions) {
    if (subscription.status === 'ACTIVE' || subscription.status === 'TRIAL') {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscription.planId }
      });

      if (plan) {
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${subscription.id.slice(-8).toUpperCase()}`,
            amount: plan.price,
            currency: 'GHS',
            status: subscription.status === 'TRIAL' ? 'PENDING' : 'PAID',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            paidAt: subscription.status === 'ACTIVE' ? new Date(subscription.startDate) : null,
            description: `${plan.name} subscription`,
            organizationId: subscription.organizationId,
            subscriptionId: subscription.id,
          },
        });

        if (subscription.status === 'ACTIVE') {
          await prisma.payment.create({
            data: {
              amount: plan.price,
              currency: 'GHS',
              method: 'CARD',
              provider: 'PAYSTACK',
              providerRef: `PAY-${invoice.id.slice(-8).toUpperCase()}`,
              status: 'SUCCESS',
              paidAt: new Date(subscription.startDate),
              invoiceId: invoice.id,
            },
          });
        }
      }
    }
  }

  // ============================================================================
  // NOTIFICATION HISTORY AND EMAIL TRACKING
  // ============================================================================
  console.log('📧 Creating notification history and email tracking...');

  const notificationTypes = ['EMAIL', 'SMS'];
  const notificationStatuses = ['SENT', 'SENT', 'SENT', 'FAILED'];

  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const type = notificationTypes[Math.floor(Math.random() * notificationTypes.length)] as any;
    const status = notificationStatuses[Math.floor(Math.random() * notificationStatuses.length)] as any;

    const notification = await prisma.notificationHistory.create({
      data: {
        type,
        recipient: type === 'EMAIL' ? user.email : user.phone || '+233501234567',
        subject: type === 'EMAIL' ? 'Security Alert' : null,
        content: type === 'EMAIL'
          ? 'Your account security has been updated. Please review your settings.'
          : 'Security alert: Unusual activity detected on your account.',
        status,
        attempts: status === 'FAILED' ? Math.floor(Math.random() * 3) + 1 : 1,
        sentAt: status !== 'PENDING' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
        error: status === 'FAILED' ? 'Delivery failed' : null,
        messageId: status !== 'PENDING' ? `MSG-${i + 1}` : null,
        metadata: JSON.stringify({ campaign_id: `campaign-${Math.floor(Math.random() * 5) + 1}` }),
        userId: user.id,
      },
    });

    // Create email tracking for email notifications
    if (type === 'EMAIL' && status === 'SENT') {
      await prisma.emailTracking.create({
        data: {
          trackingId: `track-${notification.id.slice(-8)}`,
          recipientEmail: user.email,
          emailSubject: notification.subject,
          emailType: 'notification',
          sentAt: notification.sentAt!,
          openedAt: Math.random() > 0.6 ? new Date(notification.sentAt!.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
          openCount: Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 1 : 0,
          userAgent: Math.random() > 0.6 ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' : null,
          ipAddress: Math.random() > 0.6 ? `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` : null,
          deviceType: Math.random() > 0.6 ? ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)] : null,
          userId: user.id,
          notificationHistoryId: notification.id,
        },
      });
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================
  console.log('📝 Creating email templates...');

  const emailTemplatesData = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to CyberDefend 360',
      htmlContent: '<h1>Welcome!</h1><p>Thank you for joining CyberDefend 360. Your cybersecurity journey starts here.</p>',
      textContent: 'Welcome!\n\nThank you for joining CyberDefend 360. Your cybersecurity journey starts here.',
      variables: JSON.stringify(['firstName', 'lastName', 'organizationName']),
      description: 'Welcome email for new users',
    },
    {
      name: 'Assessment Complete',
      subject: 'Your Cybersecurity Assessment is Complete',
      htmlContent: '<h1>Assessment Complete</h1><p>Your cybersecurity assessment has been completed. View your results below.</p>',
      textContent: 'Assessment Complete\n\nYour cybersecurity assessment has been completed. View your results below.',
      variables: JSON.stringify(['assessmentScore', 'riskTier', 'completionDate']),
      description: 'Notification when assessment is completed',
    },
    {
      name: 'Security Alert',
      subject: 'Security Alert: Action Required',
      htmlContent: '<h1>Security Alert</h1><p>A security issue has been detected. Please review immediately.</p>',
      textContent: 'Security Alert\n\nA security issue has been detected. Please review immediately.',
      variables: JSON.stringify(['alertType', 'severity', 'description']),
      description: 'Security alert notifications',
    },
  ];

  for (const templateData of emailTemplatesData) {
    await prisma.emailTemplate.create({
      data: templateData,
    });
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================
  console.log('⚙️ Creating notification preferences...');

  for (const user of users) {
    await prisma.notificationPreference.create({
      data: {
        emailEnabled: Math.random() > 0.1, // 90% have email enabled
        smsEnabled: Math.random() > 0.7, // 30% have SMS enabled
        pushEnabled: Math.random() > 0.2, // 80% have push enabled
        securityAlerts: true, // All have security alerts enabled
        assessmentUpdates: Math.random() > 0.1, // 90% want assessment updates
        systemUpdates: Math.random() > 0.5, // 50% want system updates
        marketingEmails: Math.random() > 0.8, // 20% want marketing emails
        userId: user.id,
      },
    });
  }

  // ============================================================================
  // BENCHMARK DATA
  // ============================================================================
  console.log('📈 Creating benchmark data...');

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

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  console.log('📋 Creating audit logs...');

  const actions = ['LOGIN', 'LOGOUT', 'CREATE_ASSESSMENT', 'UPDATE_USER', 'DELETE_FILE', 'CHANGE_PASSWORD'];
  const entities = ['User', 'Assessment', 'Organization', 'PhishingCampaign', 'Agent'];

  for (let i = 0; i < 200; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entity = entities[Math.floor(Math.random() * entities.length)];

    await prisma.auditLog.create({
      data: {
        action: `${action}_${entity.toUpperCase()}`,
        entity,
        entityId: `${entity.toLowerCase()}-${Math.floor(Math.random() * 100) + 1}`,
        oldValues: Math.random() > 0.7 ? JSON.stringify({ old_field: 'old_value' }) : null,
        newValues: Math.random() > 0.7 ? JSON.stringify({ new_field: 'new_value' }) : null,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Last 90 days
        userId: user.id,
      },
    });
  }

  console.log('✅ Comprehensive database seeded successfully!');
  console.log('👥 Created users with email/password combinations');
  console.log('🏢 Created organizations across different sectors');
  console.log('📊 Created assessments with responses and results');
  console.log('🎣 Created phishing campaigns and templates');
  console.log('🤖 Created agents with telemetry and alerts');
  console.log('💳 Created subscriptions, invoices, and payments');
  console.log('📧 Created notifications and email tracking');
  console.log('📈 Created benchmark data and audit logs');
  console.log('');
  console.log('🔑 Super Admin: superadmin@cyberdefend360.com / superadmin@cyberdefend360.com');
  console.log('🔑 CSA Admin 1: csa1@cyberdefend360.com / csa1@cyberdefend360.com');
  console.log('🔑 CSA Admin 2: csa2@cyberdefend360.com / csa2@cyberdefend360.com');
  console.log('🔑 GCB Admin: admin@gcb.com / admin@gcb.com');
  console.log('🔑 MTN Admin: admin@mtn.com.gh / admin@mtn.com.gh');
  console.log('🔑 And many more users...');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });