# CyberDefend 360 Backend API

A comprehensive NestJS backend for the CyberDefend 360 platform providing cybersecurity assessment ### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration (sends verification email)
- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/resend-verification` - Resend verification email
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with tokenndX) and phishing simulation (DefendX+) services.

## 🚀 Features

### DefendX Core (Cybersecurity Assessment)
- **Dynamic Questionnaires**: Adaptive cybersecurity assessment questions
- **CSI Scoring**: Automated Cyber Safety Index calculation  
- **Risk Tiering**: VERY_LOW to VERY_HIGH risk classification
- **Benchmarking**: Regional, sectoral, and size-based comparisons
- **Public Directory**: Searchable CSI directory for transparency
- **Automated Reporting**: PDF and HTML report generation

### DefendX+ (Phishing & Monitoring)
- **Phishing Campaigns**: Email-based security awareness testing
- **Live Monitoring**: Real-time SIEM-lite telemetry ingestion
- **Alert System**: Configurable detection rules and notifications
- **System Scanning**: Scheduled endpoint security assessments
- **Agent Management**: Endpoint agent registration and monitoring

### Core Platform Features
- **Multi-tenant Architecture**: Organization-based data isolation
- **Role-Based Access Control**: Admin, Manager, and End User roles
- **Subscription Management**: Integrated billing with Paystack/Flutterwave
- **JWT Authentication**: Secure token-based authentication
- **API Documentation**: Auto-generated Swagger documentation
- **Audit Logging**: Comprehensive activity tracking

## 🛠️ Tech Stack

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Queue Management**: Bull with Redis
- **File Storage**: AWS S3
- **Payment Processing**: Paystack & Flutterwave
- **Documentation**: Swagger/OpenAPI
- **Validation**: Class Validator & Class Transformer

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- AWS Account (for S3)
- Payment Gateway accounts (Paystack/Flutterwave)

## 🚦 Getting Started

### 1. Clone and Install Dependencies

\`\`\`bash
git clone <repository-url>
cd cyberdefend-backend
npm install
\`\`\`

### 2. Environment Configuration

Copy the example environment file and configure your settings:

\`\`\`bash
cp .env.example .env
\`\`\`

Update the following key variables in \`.env\`:

\`\`\`env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cyberdefend_db"

# JWT Secrets (generate secure keys)
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# AWS Configuration
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET="cyberdefend-storage"

# Payment Gateways
PAYSTACK_SECRET_KEY="sk_test_your_paystack_secret_key"
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-your_flutterwave_secret_key"

# Email Configuration (Mailtrap)
MAILTRAP_API_TOKEN="your-mailtrap-api-token"
MAILTRAP_SMTP_USER="api"
MAILTRAP_SMTP_PASS="your-smtp-password"
MAILTRAP_FROM_EMAIL="noreply@cyber360.tech"
MAILTRAP_FROM_NAME="CyberDefend 360"

# Frontend URL (for verification links)
FRONTEND_URL="https://your-frontend-domain.com"
\`\`\`

### 3. Database Setup

Initialize your PostgreSQL database and run migrations:

\`\`\`bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
\`\`\`

### 4. Start Development Server

\`\`\`bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod
\`\`\`

The API will be available at \`http://localhost:3000\`

### 5. Access API Documentation

Visit \`http://localhost:3000/api/docs\` for interactive Swagger documentation.

## 🔑 Default Accounts

After seeding, you can use these default accounts:

- **Super Admin**: admin@cyberdefend360.com / admin123!
- **CSA Admin**: csa@cyberdefend360.com / admin123!  
- **Org Admin**: admin@samplecompany.com / admin123!

## 📚 API Endpoints

### Authentication
- \`POST /api/v1/auth/login\` - User login
- \`POST /api/v1/auth/register\` - User registration
- \`POST /api/v1/auth/refresh-token\` - Refresh access token
- \`GET /api/v1/auth/profile\` - Get user profile

### DefendX (Cybersecurity Assessment)
- \`GET /api/v1/defendx/csi-directory\` - Public CSI directory
- \`POST /api/v1/defendx/assessments\` - Start new assessment
- \`POST /api/v1/defendx/assessments/:id/responses\` - Submit question response
- \`GET /api/v1/defendx/assessments/:id/result\` - Get assessment results

### DefendX+ (Phishing & Monitoring)
- \`POST /api/v1/defendxplus/campaigns\` - Create phishing campaign
- \`POST /api/v1/defendxplus/agents/register\` - Register monitoring agent
- \`POST /api/v1/defendxplus/telemetry\` - Ingest telemetry data
- \`GET /api/v1/defendxplus/alerts\` - Get security alerts

### Billing & Subscriptions
- \`GET /api/v1/billing/plans\` - Get subscription plans
- \`POST /api/v1/billing/checkout\` - Create payment session
- \`GET /api/v1/billing/invoices\` - Get invoices

## 🏗️ Project Structure

\`\`\`
src/
├── auth/                 # Authentication & authorization
│   ├── decorators/       # Custom decorators (Public, Roles, GetUser)
│   ├── dto/              # Data transfer objects
│   ├── guards/           # JWT and role-based guards
│   └── strategies/       # Passport strategies
├── defendx/              # Cybersecurity assessment module
│   ├── dto/              # Assessment DTOs
│   └── services/         # Assessment, Question, Report services
├── defendxplus/          # Phishing & monitoring module
├── billing/              # Subscription & payment module
├── admin/                # Admin management module
├── common/               # Shared utilities and guards
├── config/               # Configuration validation
└── database/             # Prisma service and utilities
\`\`\`

## 🧪 Testing

\`\`\`bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
\`\`\`

## 🚀 Deployment

### Production Build

\`\`\`bash
npm run build
npm run start:prod
\`\`\`

### Docker Deployment

\`\`\`bash
# Build Docker image
docker build -t cyberdefend-backend .

# Run with Docker Compose
docker-compose up -d
\`\`\`

### Environment Variables for Production

Ensure the following are properly configured for production:

- Set \`NODE_ENV=production\`
- Use strong, unique secrets for JWT keys
- Configure production database URLs
- Set up proper AWS IAM roles for S3 access
- Use production payment gateway keys

## 📈 Monitoring & Maintenance

### Database Maintenance

\`\`\`bash
# View database in browser
npm run db:studio

# Reset database (development only)
npm run db:reset

# Generate new migration
npx prisma migrate dev --name migration_name
\`\`\`

### Performance Monitoring

- API response times tracked via built-in interceptors
- Database query performance monitored through Prisma
- Redis queue status available through Bull dashboard
- AWS CloudWatch integration for production monitoring

## 🔒 Security Features

- **JWT Authentication** with refresh token rotation
- **Role-Based Access Control** (RBAC) 
- **Request Rate Limiting** via Throttler
- **Input Validation** using Class Validator
- **SQL Injection Protection** via Prisma ORM
- **CORS Configuration** for cross-origin requests
- **Helmet Security Headers** for enhanced protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@cyberdefend360.com
- Documentation: API docs at \`/api/docs\`
- Issues: GitHub Issues section

---

**CyberDefend 360** - Strengthening Ghana's Cybersecurity Ecosystem 🇬🇭