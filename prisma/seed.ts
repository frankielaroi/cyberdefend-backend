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

  // Create question categories
  const categories = [
    {
      name: 'Governance & Policy',
      description: 'Management commitment, documented policies, oversight structure',
      weight: 1.4,
      order: 1,
    },
    {
      name: 'Access & Authentication',
      description: 'User access management, password controls, MFA',
      weight: 1.3,
      order: 2,
    },
    {
      name: 'Data Protection',
      description: 'Confidentiality, encryption, backup, and privacy compliance',
      weight: 1.3,
      order: 3,
    },
    {
      name: 'Staff Awareness & Training',
      description: 'Human factor resilience and continuous education',
      weight: 1.2,
      order: 4,
    },
    {
      name: 'Incident Response & Recovery',
      description: 'Preparedness, detection, escalation, and post-incident action',
      weight: 1.4,
      order: 5,
    },
    {
      name: 'Network & System Security',
      description: 'Endpoint protection, firewalls, patching, and monitoring',
      weight: 1.3,
      order: 6,
    },
    {
      name: 'Physical & Environmental Security',
      description: 'Protection of IT assets and facilities',
      weight: 1.1,
      order: 7,
    },
    {
      name: 'Vendor & Third-Party Security',
      description: 'Outsourcing, vendor risk, and supply chain security',
      weight: 1.2,
      order: 8,
    },
    {
      name: 'Compliance & Audit',
      description: 'Policy enforcement and continuous improvement',
      weight: 1.3,
      order: 9,
    },
    {
      name: 'Technology & Innovation Readiness',
      description: 'Adoption of modern cyber defense technologies',
      weight: 1.1,
      order: 10,
    },
  ];

  for (const category of categories) {
    await prisma.questionCategory.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }

  // Create comprehensive assessment questions
  const allQuestions = [
    // 1️⃣ Governance & Policy (7 questions)
    {
      categoryName: 'Governance & Policy',
      questions: [
        {
          text: 'Do you have a documented cybersecurity policy approved by management?',
          type: 'YES_NO',
          weight: 1.5,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Is there a designated cybersecurity officer or team responsible for IT security?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Has top management reviewed or updated the cybersecurity policy in the last 12 months?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have a risk management framework for identifying and mitigating cyber threats?',
          type: 'YES_NO',
          weight: 1.4,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you review cybersecurity incidents at management meetings?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are cybersecurity roles and responsibilities clearly defined within your organization?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have a business continuity plan (BCP) or disaster recovery plan that covers cyber incidents?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 2️⃣ Access & Authentication (7 questions)
    {
      categoryName: 'Access & Authentication',
      questions: [
        {
          text: 'Is Multi-Factor Authentication (MFA) enabled for all email and financial systems?',
          type: 'SINGLE_CHOICE',
          weight: 1.5,
          options: [
            { text: 'Yes, for all systems', value: 'all', score: 10, isCorrect: true },
            { text: 'Only for email systems', value: 'email_only', score: 6, isCorrect: false },
            { text: 'Only for financial systems', value: 'financial_only', score: 6, isCorrect: false },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do all user accounts use strong password policies (length, complexity, expiration)?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are user accounts automatically disabled after a set number of failed login attempts?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are privileged accounts (admins) reviewed periodically for necessity and misuse?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Monthly', value: 'monthly', score: 10, isCorrect: true },
            { text: 'Quarterly', value: 'quarterly', score: 8, isCorrect: false },
            { text: 'Annually', value: 'annually', score: 5, isCorrect: false },
            { text: 'Never', value: 'never', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are departed staff accounts immediately deactivated or removed from systems?',
          type: 'YES_NO',
          weight: 1.4,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you use role-based access control (RBAC) for key systems?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are there separate accounts for administrative activities (non-shared logins)?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 3️⃣ Data Protection (7 questions)
    {
      categoryName: 'Data Protection',
      questions: [
        {
          text: 'Do you encrypt customer/patient data at rest and in transit?',
          type: 'SINGLE_CHOICE',
          weight: 1.5,
          options: [
            { text: 'Yes, both at rest and in transit', value: 'both', score: 10, isCorrect: true },
            { text: 'Only at rest', value: 'rest_only', score: 6, isCorrect: false },
            { text: 'Only in transit', value: 'transit_only', score: 6, isCorrect: false },
            { text: 'No encryption', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you regularly back up critical data, and test restoration procedures?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Yes, with tested restoration', value: 'yes_tested', score: 10, isCorrect: true },
            { text: 'Yes, but restoration not tested', value: 'yes_untested', score: 6, isCorrect: false },
            { text: 'Irregular backups', value: 'irregular', score: 3, isCorrect: false },
            { text: 'No backups', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are portable storage devices (USBs, HDDs) restricted or encrypted?',
          type: 'SINGLE_CHOICE',
          weight: 1.2,
          options: [
            { text: 'Restricted and encrypted', value: 'both', score: 10, isCorrect: true },
            { text: 'Only restricted', value: 'restricted', score: 6, isCorrect: false },
            { text: 'Only encrypted', value: 'encrypted', score: 6, isCorrect: false },
            { text: 'No controls', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you comply with the Ghana Data Protection Act (2012) or equivalent regulation?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Is data retention and disposal managed through a clear policy?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are backups stored securely and offsite (physically or in the cloud)?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Yes, both secure and offsite', value: 'both', score: 10, isCorrect: true },
            { text: 'Only secure onsite', value: 'secure_onsite', score: 5, isCorrect: false },
            { text: 'Offsite but not secure', value: 'offsite_unsecure', score: 3, isCorrect: false },
            { text: 'Neither secure nor offsite', value: 'neither', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have controls to prevent unauthorized data sharing or export?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 4️⃣ Staff Awareness & Training (6 questions)
    {
      categoryName: 'Staff Awareness & Training',
      questions: [
        {
          text: 'Have staff completed phishing/cyber safety training in the last 12 months?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Yes, all staff trained', value: 'all', score: 10, isCorrect: true },
            { text: 'Most staff trained (>75%)', value: 'most', score: 7, isCorrect: false },
            { text: 'Some staff trained (<75%)', value: 'some', score: 4, isCorrect: false },
            { text: 'No training provided', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you conduct periodic cybersecurity awareness campaigns or newsletters?',
          type: 'SINGLE_CHOICE',
          weight: 1.1,
          options: [
            { text: 'Monthly', value: 'monthly', score: 10, isCorrect: true },
            { text: 'Quarterly', value: 'quarterly', score: 8, isCorrect: false },
            { text: 'Annually', value: 'annually', score: 5, isCorrect: false },
            { text: 'Never', value: 'never', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are employees tested using phishing simulations or social engineering exercises?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Regularly (monthly/quarterly)', value: 'regular', score: 10, isCorrect: true },
            { text: 'Occasionally (annually)', value: 'occasional', score: 6, isCorrect: false },
            { text: 'Rarely', value: 'rarely', score: 3, isCorrect: false },
            { text: 'Never', value: 'never', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do all staff acknowledge cybersecurity policies during onboarding?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are IT staff given specialized cybersecurity training or certifications?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are contractors or third-party workers included in security training programs?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 5️⃣ Incident Response & Recovery (6 questions)
    {
      categoryName: 'Incident Response & Recovery',
      questions: [
        {
          text: 'Do you have a written incident response plan (IRP) with escalation contacts?',
          type: 'YES_NO',
          weight: 1.5,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Have you tested your incident response plan within the last 12 months?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Yes, with full simulation', value: 'full_test', score: 10, isCorrect: true },
            { text: 'Yes, with tabletop exercise', value: 'tabletop', score: 7, isCorrect: false },
            { text: 'Partial testing only', value: 'partial', score: 4, isCorrect: false },
            { text: 'No testing', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do employees know how to report cybersecurity incidents or suspicious activity?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you maintain a record of past incidents and lessons learned?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have a defined escalation matrix for handling severe incidents?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you coordinate with external partners (e.g., CSA) during incidents?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 6️⃣ Network & System Security (7 questions)
    {
      categoryName: 'Network & System Security',
      questions: [
        {
          text: 'Do you use firewalls or intrusion prevention systems (IPS/IDS) to protect your network?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Both firewalls and IPS/IDS', value: 'both', score: 10, isCorrect: true },
            { text: 'Only firewalls', value: 'firewall_only', score: 6, isCorrect: false },
            { text: 'Only IPS/IDS', value: 'ips_only', score: 6, isCorrect: false },
            { text: 'Neither', value: 'neither', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are software and operating systems regularly patched and updated?',
          type: 'SINGLE_CHOICE',
          weight: 1.5,
          options: [
            { text: 'Automated patching within 24-48 hours', value: 'automated', score: 10, isCorrect: true },
            { text: 'Manual patching within 1 week', value: 'weekly', score: 7, isCorrect: false },
            { text: 'Monthly patching schedule', value: 'monthly', score: 4, isCorrect: false },
            { text: 'Irregular or no patching', value: 'irregular', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are antivirus or endpoint detection tools deployed on all workstations and servers?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Yes, on all devices with EDR', value: 'all_edr', score: 10, isCorrect: true },
            { text: 'Yes, basic antivirus on all devices', value: 'all_av', score: 7, isCorrect: false },
            { text: 'Partial deployment', value: 'partial', score: 4, isCorrect: false },
            { text: 'No endpoint protection', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you monitor network traffic for unusual or malicious behavior?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Is remote access (RDP, VPN) protected with MFA and encryption?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Yes, both MFA and encryption', value: 'both', score: 10, isCorrect: true },
            { text: 'Only MFA', value: 'mfa_only', score: 6, isCorrect: false },
            { text: 'Only encryption', value: 'encryption_only', score: 4, isCorrect: false },
            { text: 'Neither', value: 'neither', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are default system passwords changed before deployment?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are servers and devices hardened according to security best practices?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 7️⃣ Physical & Environmental Security (5 questions)
    {
      categoryName: 'Physical & Environmental Security',
      questions: [
        {
          text: 'Are server rooms or data centers physically restricted to authorized staff?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are visitor logs maintained for sensitive areas?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are CCTV systems installed in areas with IT infrastructure?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are critical systems protected against power failures (UPS, generators)?',
          type: 'SINGLE_CHOICE',
          weight: 1.2,
          options: [
            { text: 'Both UPS and generators', value: 'both', score: 10, isCorrect: true },
            { text: 'Only UPS', value: 'ups_only', score: 6, isCorrect: false },
            { text: 'Only generators', value: 'generator_only', score: 4, isCorrect: false },
            { text: 'No power protection', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are disaster recovery sites regularly tested?',
          type: 'SINGLE_CHOICE',
          weight: 1.2,
          options: [
            { text: 'Quarterly testing', value: 'quarterly', score: 10, isCorrect: true },
            { text: 'Annual testing', value: 'annual', score: 7, isCorrect: false },
            { text: 'Irregular testing', value: 'irregular', score: 3, isCorrect: false },
            { text: 'No testing or no DR site', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 8️⃣ Vendor & Third-Party Security (5 questions)
    {
      categoryName: 'Vendor & Third-Party Security',
      questions: [
        {
          text: 'Do you perform security due diligence on IT service providers and vendors?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are vendor contracts reviewed to ensure cybersecurity clauses and data protection?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do third-party providers report security incidents that affect your organization?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are cloud service providers assessed for compliance and reliability?',
          type: 'YES_NO',
          weight: 1.3,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have backup providers or contingency plans for critical third-party failures?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 9️⃣ Compliance & Audit (5 questions)
    {
      categoryName: 'Compliance & Audit',
      questions: [
        {
          text: 'Have you undergone a cybersecurity audit or assessment in the last 12 months?',
          type: 'SINGLE_CHOICE',
          weight: 1.4,
          options: [
            { text: 'Yes, external audit', value: 'external', score: 10, isCorrect: true },
            { text: 'Yes, internal audit', value: 'internal', score: 7, isCorrect: false },
            { text: 'Self-assessment only', value: 'self', score: 4, isCorrect: false },
            { text: 'No audit', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you track progress on audit recommendations and remediation actions?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Is your organization certified or aligned with standards like ISO 27001 or NIST?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Certified (ISO 27001, SOC 2, etc.)', value: 'certified', score: 10, isCorrect: true },
            { text: 'Aligned but not certified', value: 'aligned', score: 6, isCorrect: false },
            { text: 'Partially aligned', value: 'partial', score: 3, isCorrect: false },
            { text: 'No alignment', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are internal policy violations logged and reviewed by management?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you conduct annual reviews of all IT security policies?',
          type: 'YES_NO',
          weight: 1.2,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        }
      ]
    },
    // 🔟 Technology & Innovation Readiness (5 questions)
    {
      categoryName: 'Technology & Innovation Readiness',
      questions: [
        {
          text: 'Do you use security monitoring dashboards or SIEM tools?',
          type: 'SINGLE_CHOICE',
          weight: 1.2,
          options: [
            { text: 'Full SIEM implementation', value: 'siem', score: 10, isCorrect: true },
            { text: 'Basic monitoring dashboards', value: 'basic', score: 6, isCorrect: false },
            { text: 'Manual monitoring only', value: 'manual', score: 3, isCorrect: false },
            { text: 'No monitoring', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you have endpoint management (MDM or EDR) for mobile/laptop devices?',
          type: 'SINGLE_CHOICE',
          weight: 1.1,
          options: [
            { text: 'Both MDM and EDR', value: 'both', score: 10, isCorrect: true },
            { text: 'Only MDM', value: 'mdm_only', score: 6, isCorrect: false },
            { text: 'Only EDR', value: 'edr_only', score: 6, isCorrect: false },
            { text: 'Neither', value: 'neither', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Are critical applications regularly penetration tested or vulnerability scanned?',
          type: 'SINGLE_CHOICE',
          weight: 1.3,
          options: [
            { text: 'Quarterly pen tests + continuous scanning', value: 'both', score: 10, isCorrect: true },
            { text: 'Annual pen tests only', value: 'annual_pen', score: 6, isCorrect: false },
            { text: 'Vulnerability scanning only', value: 'vuln_only', score: 4, isCorrect: false },
            { text: 'No testing', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Do you employ cloud security configurations or CSPM tools?',
          type: 'YES_NO',
          weight: 1.1,
          options: [
            { text: 'Yes', value: 'yes', score: 10, isCorrect: true },
            { text: 'No', value: 'no', score: 0, isCorrect: false },
          ]
        },
        {
          text: 'Have you adopted Zero Trust or MFA Everywhere principles organization-wide?',
          type: 'SINGLE_CHOICE',
          weight: 1.2,
          options: [
            { text: 'Full Zero Trust implementation', value: 'zero_trust', score: 10, isCorrect: true },
            { text: 'MFA implemented everywhere', value: 'mfa_everywhere', score: 8, isCorrect: false },
            { text: 'Partial implementation', value: 'partial', score: 4, isCorrect: false },
            { text: 'Traditional security model', value: 'traditional', score: 0, isCorrect: false },
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
        const { options, ...question } = questionData;
        const createdQuestion = await prisma.question.create({
          data: {
            ...question,
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