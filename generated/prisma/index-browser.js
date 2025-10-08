
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  password: 'password',
  firstName: 'firstName',
  lastName: 'lastName',
  phone: 'phone',
  avatar: 'avatar',
  emailVerified: 'emailVerified',
  isActive: 'isActive',
  role: 'role',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.PasswordResetScalarFieldEnum = {
  id: 'id',
  token: 'token',
  userId: 'userId',
  expiresAt: 'expiresAt',
  used: 'used',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  website: 'website',
  description: 'description',
  logo: 'logo',
  address: 'address',
  city: 'city',
  region: 'region',
  country: 'country',
  gpsAddress: 'gpsAddress',
  size: 'size',
  sector: 'sector',
  isPublic: 'isPublic',
  csiScore: 'csiScore',
  riskTier: 'riskTier',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InviteCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  organizationId: 'organizationId',
  createdBy: 'createdBy',
  expiresAt: 'expiresAt',
  usageLimit: 'usageLimit',
  usedCount: 'usedCount',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationMemberScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  role: 'role',
  status: 'status',
  joinedAt: 'joinedAt',
  invitedBy: 'invitedBy',
  inviteCode: 'inviteCode'
};

exports.Prisma.AssessmentScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  type: 'type',
  status: 'status',
  score: 'score',
  maxScore: 'maxScore',
  riskTier: 'riskTier',
  benchmarkRegion: 'benchmarkRegion',
  benchmarkSector: 'benchmarkSector',
  benchmarkSize: 'benchmarkSize',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  reportUrl: 'reportUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId',
  userId: 'userId'
};

exports.Prisma.QuestionCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  weight: 'weight',
  order: 'order',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuestionScalarFieldEnum = {
  id: 'id',
  text: 'text',
  description: 'description',
  type: 'type',
  weight: 'weight',
  isRequired: 'isRequired',
  order: 'order',
  isActive: 'isActive',
  version: 'version',
  dependsOnAnswer: 'dependsOnAnswer',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  categoryId: 'categoryId'
};

exports.Prisma.QuestionOptionScalarFieldEnum = {
  id: 'id',
  text: 'text',
  value: 'value',
  score: 'score',
  order: 'order',
  isCorrect: 'isCorrect',
  questionId: 'questionId'
};

exports.Prisma.AssessmentResponseScalarFieldEnum = {
  id: 'id',
  answer: 'answer',
  score: 'score',
  timeSpent: 'timeSpent',
  createdAt: 'createdAt',
  assessmentId: 'assessmentId',
  questionId: 'questionId'
};

exports.Prisma.AssessmentResultScalarFieldEnum = {
  id: 'id',
  overallScore: 'overallScore',
  overallPercentage: 'overallPercentage',
  tier: 'tier',
  categoryScores: 'categoryScores',
  sectionScores: 'sectionScores',
  industryPercentile: 'industryPercentile',
  sizePercentile: 'sizePercentile',
  regionPercentile: 'regionPercentile',
  questionsAnswered: 'questionsAnswered',
  totalQuestions: 'totalQuestions',
  completionRate: 'completionRate',
  totalTimeMinutes: 'totalTimeMinutes',
  generatedAt: 'generatedAt',
  assessmentId: 'assessmentId'
};

exports.Prisma.PhishingCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  templateId: 'templateId',
  template: 'template',
  subject: 'subject',
  senderName: 'senderName',
  senderEmail: 'senderEmail',
  landingPageUrl: 'landingPageUrl',
  status: 'status',
  scheduledAt: 'scheduledAt',
  launchedAt: 'launchedAt',
  completedAt: 'completedAt',
  pausedAt: 'pausedAt',
  targetCount: 'targetCount',
  emailsSent: 'emailsSent',
  emailsDelivered: 'emailsDelivered',
  emailsOpened: 'emailsOpened',
  linksClicked: 'linksClicked',
  credentialsEntered: 'credentialsEntered',
  phishingReported: 'phishingReported',
  emailsBounced: 'emailsBounced',
  createdBy: 'createdBy',
  organizationId: 'organizationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PhishingTargetScalarFieldEnum = {
  id: 'id',
  email: 'email',
  firstName: 'firstName',
  lastName: 'lastName',
  department: 'department',
  jobTitle: 'jobTitle',
  emailSent: 'emailSent',
  emailDelivered: 'emailDelivered',
  emailOpened: 'emailOpened',
  linkClicked: 'linkClicked',
  credentialsEntered: 'credentialsEntered',
  reportedPhishing: 'reportedPhishing',
  emailBounced: 'emailBounced',
  sentAt: 'sentAt',
  deliveredAt: 'deliveredAt',
  openedAt: 'openedAt',
  clickedAt: 'clickedAt',
  credentialsAt: 'credentialsAt',
  reportedAt: 'reportedAt',
  bouncedAt: 'bouncedAt',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  clickCount: 'clickCount',
  riskScore: 'riskScore',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  campaignId: 'campaignId',
  userId: 'userId'
};

exports.Prisma.PhishingEventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  timestamp: 'timestamp',
  metadata: 'metadata',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  location: 'location',
  campaignId: 'campaignId',
  targetId: 'targetId'
};

exports.Prisma.PhishingTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  category: 'category',
  riskLevel: 'riskLevel',
  defaultSubject: 'defaultSubject',
  defaultSenderName: 'defaultSenderName',
  emailBodyHtml: 'emailBodyHtml',
  emailBodyText: 'emailBodyText',
  landingPageHtml: 'landingPageHtml',
  captureCredentials: 'captureCredentials',
  isActive: 'isActive',
  previewContent: 'previewContent',
  tags: 'tags',
  usageCount: 'usageCount',
  successRate: 'successRate',
  createdBy: 'createdBy',
  organizationId: 'organizationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmailJobScalarFieldEnum = {
  id: 'id',
  campaignId: 'campaignId',
  targetId: 'targetId',
  priority: 'priority',
  scheduledFor: 'scheduledFor',
  attempts: 'attempts',
  maxAttempts: 'maxAttempts',
  status: 'status',
  processingData: 'processingData',
  errorMessage: 'errorMessage',
  lastAttemptAt: 'lastAttemptAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AgentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  version: 'version',
  osType: 'osType',
  osVersion: 'osVersion',
  hostname: 'hostname',
  ipAddress: 'ipAddress',
  macAddress: 'macAddress',
  isActive: 'isActive',
  lastSeen: 'lastSeen',
  apiKey: 'apiKey',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId'
};

exports.Prisma.TelemetryEventScalarFieldEnum = {
  id: 'id',
  type: 'type',
  source: 'source',
  data: 'data',
  severity: 'severity',
  timestamp: 'timestamp',
  agentId: 'agentId',
  userId: 'userId'
};

exports.Prisma.DetectionRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  condition: 'condition',
  action: 'action',
  severity: 'severity',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AlertScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  severity: 'severity',
  status: 'status',
  data: 'data',
  acknowledgedAt: 'acknowledgedAt',
  acknowledgedBy: 'acknowledgedBy',
  resolvedAt: 'resolvedAt',
  resolvedBy: 'resolvedBy',
  createdAt: 'createdAt',
  ruleId: 'ruleId',
  agentId: 'agentId'
};

exports.Prisma.ScanResultScalarFieldEnum = {
  id: 'id',
  type: 'type',
  status: 'status',
  score: 'score',
  findings: 'findings',
  recommendations: 'recommendations',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  reportUrl: 'reportUrl',
  agentId: 'agentId'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  features: 'features',
  price: 'price',
  currency: 'currency',
  type: 'type',
  isActive: 'isActive',
  trialDays: 'trialDays',
  maxUsers: 'maxUsers',
  maxAssessments: 'maxAssessments',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  trialEndDate: 'trialEndDate',
  autoRenew: 'autoRenew',
  cancelledAt: 'cancelledAt',
  cancellationReason: 'cancellationReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId',
  planId: 'planId'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  dueDate: 'dueDate',
  paidAt: 'paidAt',
  description: 'description',
  metadata: 'metadata',
  receiptUrl: 'receiptUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organizationId: 'organizationId',
  subscriptionId: 'subscriptionId'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  amount: 'amount',
  currency: 'currency',
  method: 'method',
  provider: 'provider',
  providerRef: 'providerRef',
  status: 'status',
  metadata: 'metadata',
  paidAt: 'paidAt',
  createdAt: 'createdAt',
  invoiceId: 'invoiceId'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  timestamp: 'timestamp',
  userId: 'userId'
};

exports.Prisma.BenchmarkDataScalarFieldEnum = {
  id: 'id',
  region: 'region',
  sector: 'sector',
  size: 'size',
  avgScore: 'avgScore',
  totalOrgs: 'totalOrgs',
  period: 'period',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CSA_ADMIN: 'CSA_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  ORG_MANAGER: 'ORG_MANAGER',
  END_USER: 'END_USER'
};

exports.OrganizationSize = exports.$Enums.OrganizationSize = {
  MICRO: 'MICRO',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE',
  ENTERPRISE: 'ENTERPRISE'
};

exports.Sector = exports.$Enums.Sector = {
  BANKING: 'BANKING',
  TELECOMMUNICATIONS: 'TELECOMMUNICATIONS',
  INSURANCE: 'INSURANCE',
  GOVERNMENT: 'GOVERNMENT',
  HEALTHCARE: 'HEALTHCARE',
  EDUCATION: 'EDUCATION',
  ENERGY: 'ENERGY',
  MANUFACTURING: 'MANUFACTURING',
  RETAIL: 'RETAIL',
  LOGISTICS: 'LOGISTICS',
  TECHNOLOGY: 'TECHNOLOGY',
  NGO: 'NGO',
  OTHER: 'OTHER'
};

exports.RiskTier = exports.$Enums.RiskTier = {
  VERY_LOW: 'VERY_LOW',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH'
};

exports.MemberStatus = exports.$Enums.MemberStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING'
};

exports.AssessmentType = exports.$Enums.AssessmentType = {
  CSI_ASSESSMENT: 'CSI_ASSESSMENT',
  COMPLIANCE_CHECK: 'COMPLIANCE_CHECK',
  SECURITY_AUDIT: 'SECURITY_AUDIT',
  BASELINE_ASSESSMENT: 'BASELINE_ASSESSMENT'
};

exports.AssessmentStatus = exports.$Enums.AssessmentStatus = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
};

exports.QuestionType = exports.$Enums.QuestionType = {
  SINGLE_CHOICE: 'SINGLE_CHOICE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  YES_NO: 'YES_NO',
  SCALE: 'SCALE',
  TEXT: 'TEXT',
  FILE_UPLOAD: 'FILE_UPLOAD'
};

exports.CSITier = exports.$Enums.CSITier = {
  BASIC: 'BASIC',
  FOUNDATIONAL: 'FOUNDATIONAL',
  ORGANIZATIONAL: 'ORGANIZATIONAL',
  ADVANCED: 'ADVANCED',
  PROGRESSIVE: 'PROGRESSIVE',
  INNOVATIVE: 'INNOVATIVE'
};

exports.CampaignStatus = exports.$Enums.CampaignStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

exports.PhishingEventType = exports.$Enums.PhishingEventType = {
  EMAIL_QUEUED: 'EMAIL_QUEUED',
  EMAIL_SENT: 'EMAIL_SENT',
  EMAIL_DELIVERED: 'EMAIL_DELIVERED',
  EMAIL_BOUNCED: 'EMAIL_BOUNCED',
  EMAIL_OPENED: 'EMAIL_OPENED',
  LINK_CLICKED: 'LINK_CLICKED',
  CREDENTIALS_ENTERED: 'CREDENTIALS_ENTERED',
  PHISHING_REPORTED: 'PHISHING_REPORTED',
  CAMPAIGN_STARTED: 'CAMPAIGN_STARTED',
  CAMPAIGN_PAUSED: 'CAMPAIGN_PAUSED',
  CAMPAIGN_RESUMED: 'CAMPAIGN_RESUMED',
  CAMPAIGN_COMPLETED: 'CAMPAIGN_COMPLETED',
  CAMPAIGN_CANCELLED: 'CAMPAIGN_CANCELLED'
};

exports.TemplateCategory = exports.$Enums.TemplateCategory = {
  SECURITY: 'SECURITY',
  HR: 'HR',
  FINANCE: 'FINANCE',
  IT: 'IT',
  EXECUTIVE: 'EXECUTIVE',
  GENERAL: 'GENERAL'
};

exports.RiskLevel = exports.$Enums.RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  VERY_HIGH: 'VERY_HIGH'
};

exports.JobPriority = exports.$Enums.JobPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT'
};

exports.JobStatus = exports.$Enums.JobStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.TelemetryType = exports.$Enums.TelemetryType = {
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  FILE_ACCESS: 'FILE_ACCESS',
  PROCESS_START: 'PROCESS_START',
  NETWORK_CONNECTION: 'NETWORK_CONNECTION',
  ANTIVIRUS_EVENT: 'ANTIVIRUS_EVENT',
  SYSTEM_CHANGE: 'SYSTEM_CHANGE',
  SECURITY_ALERT: 'SECURITY_ALERT',
  APPLICATION_EVENT: 'APPLICATION_EVENT'
};

exports.SeverityLevel = exports.$Enums.SeverityLevel = {
  LOW: 'LOW',
  INFO: 'INFO',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

exports.RuleAction = exports.$Enums.RuleAction = {
  ALERT: 'ALERT',
  BLOCK: 'BLOCK',
  LOG: 'LOG',
  EMAIL: 'EMAIL',
  SMS: 'SMS'
};

exports.AlertStatus = exports.$Enums.AlertStatus = {
  OPEN: 'OPEN',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  FALSE_POSITIVE: 'FALSE_POSITIVE'
};

exports.ScanType = exports.$Enums.ScanType = {
  VULNERABILITY_SCAN: 'VULNERABILITY_SCAN',
  MALWARE_SCAN: 'MALWARE_SCAN',
  COMPLIANCE_SCAN: 'COMPLIANCE_SCAN',
  CONFIGURATION_SCAN: 'CONFIGURATION_SCAN',
  NETWORK_SCAN: 'NETWORK_SCAN'
};

exports.ScanStatus = exports.$Enums.ScanStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

exports.SubscriptionType = exports.$Enums.SubscriptionType = {
  DEFEND_CORE: 'DEFEND_CORE',
  DEFEND_VAULT: 'DEFEND_VAULT',
  DEFEND_CLICK: 'DEFEND_CLICK'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED'
};

exports.InvoiceStatus = exports.$Enums.InvoiceStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CARD: 'CARD',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  PAYPAL: 'PAYPAL'
};

exports.PaymentProvider = exports.$Enums.PaymentProvider = {
  PAYSTACK: 'PAYSTACK',
  FLUTTERWAVE: 'FLUTTERWAVE',
  PAYPAL: 'PAYPAL'
};

exports.PaymentStatus = exports.$Enums.PaymentStatus = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  PasswordReset: 'PasswordReset',
  Organization: 'Organization',
  InviteCode: 'InviteCode',
  OrganizationMember: 'OrganizationMember',
  Assessment: 'Assessment',
  QuestionCategory: 'QuestionCategory',
  Question: 'Question',
  QuestionOption: 'QuestionOption',
  AssessmentResponse: 'AssessmentResponse',
  AssessmentResult: 'AssessmentResult',
  PhishingCampaign: 'PhishingCampaign',
  PhishingTarget: 'PhishingTarget',
  PhishingEvent: 'PhishingEvent',
  PhishingTemplate: 'PhishingTemplate',
  EmailJob: 'EmailJob',
  Agent: 'Agent',
  TelemetryEvent: 'TelemetryEvent',
  DetectionRule: 'DetectionRule',
  Alert: 'Alert',
  ScanResult: 'ScanResult',
  SubscriptionPlan: 'SubscriptionPlan',
  Subscription: 'Subscription',
  Invoice: 'Invoice',
  Payment: 'Payment',
  AuditLog: 'AuditLog',
  BenchmarkData: 'BenchmarkData'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
