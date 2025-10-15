# Email Verification Implementation

## Overview
The email verification system is fully implemented in the CyberDefend Backend. When a user creates an account, a verification email is automatically sent to their registered email address.

## How It Works

### 1. User Registration Flow
When a user registers via `POST /auth/register`:

1. **Account Creation**: User account is created in the database
2. **Token Generation**: A unique UUID verification token is generated
3. **Token Storage**: The token is stored in the user's database record
4. **Email Dispatch**: A verification email is sent asynchronously (non-blocking)
5. **Response**: User receives access tokens and can use the app, but some features may require email verification

### 2. Email Verification Email
The verification email includes:
- A personalized greeting with the user's name
- A clear call-to-action button to verify the email
- A fallback verification URL (if button doesn't work)
- Professional HTML and plain text versions
- 24-hour expiration notice

**Template Location**: `src/auth/auth.service.ts` (lines 522-565)

### 3. Email Verification
Users can verify their email by:
- Clicking the link in the email
- Making a request to `POST /auth/verify-email` with the token

### 4. Resending Verification Email
If the user didn't receive the email, they can request a new one:
- Endpoint: `POST /auth/resend-verification`
- Body: `{ "email": "user@example.com" }`

## API Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+233501234567",
  "organization": {
    "name": "Acme Corp",
    "size": "MEDIUM",
    "sector": "TECHNOLOGY"
  }
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification.",
  "access_token": "jwt-token...",
  "refresh_token": "refresh-token...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    ...
  }
}
```

### Verify Email
```http
POST /auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

### Resend Verification Email
```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent successfully"
}
```

## Email Configuration

### Environment Variables Required
Ensure these environment variables are set in your `.env` file:

```bash
# Email Service Configuration (Mailtrap)
MAILTRAP_API_TOKEN=your-api-token
MAILTRAP_SMTP_USER=api
MAILTRAP_SMTP_PASS=your-smtp-password
MAILTRAP_SMTP_PORT=587
MAILTRAP_LIVE_HOST=live.smtp.mailtrap.io
MAILTRAP_BULK_HOST=bulk.smtp.mailtrap.io
MAILTRAP_FROM_EMAIL=noreply@cyber360.tech
MAILTRAP_FROM_NAME=CyberDefend 360

# Frontend URL (for verification links)
FRONTEND_URL=https://your-frontend-domain.com
```

## Login Enforcement
The login system checks email verification:
- If `emailVerified` is `false`, login is **blocked**
- Error message: "Please verify your email before logging in"
- Users must verify their email before accessing the dashboard

**Code Location**: `src/auth/auth.service.ts` (lines 51-53)

## Technical Implementation

### Files Involved

1. **Auth Service** (`src/auth/auth.service.ts`)
   - `register()`: Handles user registration and triggers email
   - `sendVerificationEmail()`: Sends the verification email
   - `verifyEmail()`: Verifies the token and marks email as verified
   - `resendVerificationEmail()`: Resends verification email

2. **Auth Controller** (`src/auth/auth.controller.ts`)
   - Exposes endpoints for registration, verification, and resend

3. **Email Service** (`src/notification/services/email.service.ts`)
   - Handles actual email sending via SMTP (Mailtrap)
   - Uses live transport for transactional emails

4. **Auth Module** (`src/auth/auth.module.ts`)
   - Imports NotificationModule for email functionality

5. **DTOs** (`src/auth/dto/verify-email.dto.ts`)
   - `VerifyEmailDto`: Validation for verification requests
   - `ResendVerificationDto`: Validation for resend requests

### Database Schema
The `User` model includes:
```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  emailVerified     Boolean   @default(false)
  verificationToken String?   @unique
  // ... other fields
}
```

## Error Handling

### Registration
- Email sending happens **asynchronously** (non-blocking)
- If email fails, registration still succeeds
- Error is logged, but user can request resend

### Verification
- Invalid/expired tokens return 401 Unauthorized
- Already verified emails return success message
- Missing users return 401 Unauthorized

## Testing

### Test Registration and Email
```bash
# 1. Register a new user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+233501234567",
    "organization": {
      "name": "Test Org",
      "size": "SMALL",
      "sector": "TECHNOLOGY"
    }
  }'

# 2. Check your email inbox for verification email

# 3. Verify email (use token from email)
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-verification-token"
  }'

# 4. Test resend (if needed)
curl -X POST http://localhost:3000/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

## Security Features

1. **Token-based verification**: UUIDs prevent guessing
2. **One-time use**: Tokens are cleared after verification
3. **Login restriction**: Unverified users cannot login
4. **Email validation**: Uses class-validator for email format checking
5. **Rate limiting**: Can be added to resend endpoint to prevent abuse

## Future Enhancements

Consider adding:
- [ ] Token expiration (currently tokens don't expire)
- [ ] Rate limiting on resend verification endpoint
- [ ] Email verification reminder after X days
- [ ] Analytics tracking for verification rates
- [ ] Customizable email templates
- [ ] Multi-language support for emails

## Troubleshooting

### Email Not Sending
1. Check environment variables are set correctly
2. Verify Mailtrap credentials are valid
3. Check application logs for errors
4. Test email service directly

### Verification Link Not Working
1. Ensure FRONTEND_URL is correct
2. Check token hasn't been used already
3. Verify user exists in database
4. Check for typos in token

### User Can't Login After Registration
1. Confirm email verification is required (by design)
2. User should check email and verify
3. Use resend endpoint if email not received

## Support

For issues or questions about the email verification system:
- Check logs: `console.log` messages in auth.service.ts
- Verify email service configuration
- Test email service independently
- Contact backend team
