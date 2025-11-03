import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

const csiPlusQuestions = [
  {
    text: "When a staff member resigns or is dismissed, do you immediately disable all their email, MoMo, and system logins — including WhatsApp or shared business accounts?",
    description: "Staff Account Access & Offboarding - Hidden Risk: 40% of Ghanaian data leaks come from ex-staff retaining unauthorized access.",
    category: "ACCESS_CONTROL",
    order: 1,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Has your business domain been verified with SPF/DKIM records to stop fake emails being sent using your name (e.g., \"info@yourcompany.com\")?",
    description: "Business Email & Impersonation - Hidden Risk: 1 in 5 SMEs in Ghana fall for domain impersonation scams annually.",
    category: "EMAIL_SECURITY",
    order: 2,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Do you independently verify payment account changes from vendors or suppliers via phone before sending large MoMo or bank transfers?",
    description: "Vendor & Supplier Payments - Hidden Risk: Many scams exploit fake \"vendor update\" emails or WhatsApp requests.",
    category: "PAYMENT_SECURITY",
    order: 3,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Do all your staff know how and to whom to report a suspicious email, message, or transaction — and is this procedure documented?",
    description: "Incident Reporting Confidence - Hidden Risk: Quick detection determines loss prevention; most SMEs rely on \"informal alerts\" via chat.",
    category: "INCIDENT_RESPONSE",
    order: 4,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Does your business keep digital logs of system activities (logins, transactions, data access) that can be reviewed during investigations?",
    description: "System Monitoring & Logs - Hidden Risk: Without logs, attacks cannot be traced or proven to insurers/police.",
    category: "MONITORING",
    order: 5,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Are your files stored in secured cloud storage (with encryption and password policies) instead of open Google Drives or shared laptops?",
    description: "Cloud vs. Local Storage - Hidden Risk: Unsecured file-sharing tools are the #1 cause of unintentional leaks among Ghanaian SMEs.",
    category: "DATA_STORAGE",
    order: 6,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Have you audited which third-party apps or freelancers have ongoing access to your systems, data, or customer records?",
    description: "Third-Party Access - Hidden Risk: SMEs often forget contractors with \"permanent\" admin rights to systems like bookkeeping or websites.",
    category: "ACCESS_CONTROL",
    order: 7,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "If you had a data breach today, could you prove compliance with Ghana's Data Protection Act (Act 843) or your insurer's cyber policy requirements?",
    description: "Insurance & Compliance Readiness - Hidden Risk: Lack of audit trails = automatic insurance rejection and MoE/CSA fines.",
    category: "COMPLIANCE",
    order: 8,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Are employees' personal devices protected by anti-malware and auto-lock before connecting to your office Wi-Fi or data systems?",
    description: "Employee Devices - Hidden Risk: Bring-Your-Own-Device (BYOD) is the biggest silent attack vector for small businesses.",
    category: "DEVICE_SECURITY",
    order: 9,
    weight: 1,
    options: [
      { text: "Yes", value: "1", score: 1, isCorrect: true, order: 1 },
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "No", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  },
  {
    text: "Has your business experienced a fraud, MoMo loss, data breach, or suspicious message incident in the past 12 months — even if it was resolved?",
    description: "Cyber Incident History - Hidden Risk: Recurrent incidents indicate unaddressed systemic vulnerabilities.",
    category: "INCIDENT_HISTORY",
    order: 10,
    weight: 1,
    options: [
      { text: "No", value: "1", score: 1, isCorrect: true, order: 1 }, // For this question, "No" is the secure answer
      { text: "Partial / Not Sure", value: "0.5", score: 0.5, isCorrect: false, order: 2 },
      { text: "Yes", value: "0", score: 0, isCorrect: false, order: 3 }
    ]
  }
];

async function seedCSIPlusQuestions() {
  try {
    console.log('🚀 Starting CSI+ Assessment Questions seeding...');

    // First, let's create the question categories
    const categories = [
      { name: "ACCESS_CONTROL", description: "Access Control and User Management", order: 1 },
      { name: "EMAIL_SECURITY", description: "Email Security and Domain Protection", order: 2 },
      { name: "PAYMENT_SECURITY", description: "Payment and Financial Security", order: 3 },
      { name: "INCIDENT_RESPONSE", description: "Incident Response and Reporting", order: 4 },
      { name: "MONITORING", description: "System Monitoring and Logging", order: 5 },
      { name: "DATA_STORAGE", description: "Data Storage and Protection", order: 6 },
      { name: "COMPLIANCE", description: "Compliance and Legal Requirements", order: 7 },
      { name: "DEVICE_SECURITY", description: "Device and Endpoint Security", order: 8 },
      { name: "INCIDENT_HISTORY", description: "Incident History and Risk Assessment", order: 9 }
    ];

    const createdCategories = new Map();
    
    for (const categoryData of categories) {
      const category = await prisma.questionCategory.upsert({
        where: { name: categoryData.name },
        update: categoryData,
        create: categoryData
      });
      createdCategories.set(categoryData.name, category);
      console.log(`✅ Created/Updated category: ${category.name}`);
    }

    // Create questions with their options
    for (const questionData of csiPlusQuestions) {
      const categoryId = createdCategories.get(questionData.category).id;
      
      const question = await prisma.question.create({
        data: {
          text: questionData.text,
          description: questionData.description,
          type: "MULTIPLE_CHOICE",
          weight: questionData.weight,
          order: questionData.order,
          isActive: true,
          categoryId: categoryId,
          options: {
            create: questionData.options
          }
        }
      });

      console.log(`✅ Created question ${questionData.order}: ${question.text.substring(0, 50)}...`);
    }

    console.log('🎉 CSI+ Assessment Questions seeded successfully!');
    console.log(`� Total Questions: ${csiPlusQuestions.length}`);
    console.log(`� Total Categories: ${categories.length}`);
    console.log('🔗 Questions are now available for assessments');

  } catch (error) {
    console.error('❌ Error seeding CSI+ questions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedCSIPlusQuestions()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
  