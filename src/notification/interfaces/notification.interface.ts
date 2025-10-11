export interface EmailData {
  to: string | string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  category?: string;
  fromEmail?: string;
  fromName?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SmsData {
  to: string | string[];
  message: string;
  from?: string;
}

export interface ScheduleOptions {
  delay?: number; // milliseconds
  cron?: string; // cron expression
  repeat?: {
    every?: number; // milliseconds
    limit?: number; // number of times to repeat
    endDate?: Date;
  };
}

export interface NotificationJob {
  id: string;
  type: 'email' | 'sms';
  data: EmailData | SmsData;
  schedule?: ScheduleOptions;
  retryOptions?: {
    attempts?: number;
    delay?: number;
    exponentialBackoff?: boolean;
  };
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
  attempts: number;
}

export interface EmailConfig {
  token: string;
  fromEmail: string;
  fromName: string;
}

export interface SmsConfig {
  apiKey: string;
  sender: string;
  baseUrl?: string;
}

export interface NotificationHistory {
  id: string;
  type: 'email' | 'sms';
  recipient: string;
  subject?: string;
  content: string;
  status: 'pending' | 'sent' | 'failed' | 'retry';
  attempts: number;
  lastAttempt?: Date;
  sentAt?: Date;
  error?: string;
  jobId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}