import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SmsData, SmsConfig, NotificationResult } from '../interfaces/notification.interface';

interface ArkeselSmsResponse {
  status: string;
  message: string;
  data?: {
    id: string;
    status: string;
    network: string;
    units: number;
    amount: number;
  };
  code?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private httpClient: AxiosInstance;
  private smsConfig: SmsConfig;

  constructor(private configService: ConfigService) {
    this.initializeSmsConfig();
    this.createHttpClient();
  }

  private initializeSmsConfig() {
    this.smsConfig = {
      apiKey: this.configService.get<string>('ARKESEL_API_KEY'),
      sender: this.configService.get<string>('ARKESEL_SENDER_ID') || 'CyberDefend',
      baseUrl: this.configService.get<string>('ARKESEL_BASE_URL') || 'https://sms.arkesel.com/api/v2',
    };

    if (!this.smsConfig.apiKey) {
      this.logger.warn('Arkesel API key not found. SMS service may not function properly.');
    }
  }

  private createHttpClient() {
    this.httpClient = axios.create({
      baseURL: this.smsConfig.baseUrl,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'api-key': this.smsConfig.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug(`SMS API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('SMS API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(`SMS API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        this.logger.error('SMS API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async sendSms(smsData: SmsData): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: false,
      timestamp: new Date(),
      attempts: 1,
    };

    try {
      // Handle recipients
      const recipients = Array.isArray(smsData.to) ? smsData.to : [smsData.to];
      
      // Validate phone numbers
      const validatedRecipients = this.validatePhoneNumbers(recipients);
      if (validatedRecipients.length === 0) {
        throw new Error('No valid phone numbers provided');
      }

      // Prepare SMS data
      const sender = smsData.from || this.smsConfig.sender;
      const message = this.sanitizeMessage(smsData.message);

      // Send SMS to each recipient
      const sendPromises = validatedRecipients.map(recipient => 
        this.sendSingleSms(recipient, message, sender)
      );

      const responses = await Promise.allSettled(sendPromises);
      
      // Check if at least one SMS was sent successfully
      const successfulSends = responses.filter(response => response.status === 'fulfilled');
      const failedSends = responses.filter(response => response.status === 'rejected');

      if (successfulSends.length > 0) {
        result.success = true;
        result.messageId = `bulk_${Date.now()}`;
        
        const duration = Date.now() - startTime;
        this.logger.log(
          `SMS sent successfully to ${successfulSends.length}/${recipients.length} recipients in ${duration}ms`
        );

        // Log failed sends
        if (failedSends.length > 0) {
          this.logger.warn(`${failedSends.length} SMS sends failed`);
        }
      } else {
        throw new Error('All SMS sends failed');
      }

      return result;
    } catch (error) {
      result.error = error.message;
      const duration = Date.now() - startTime;
      
      this.logger.error(`Failed to send SMS to ${smsData.to} after ${duration}ms:`, error);
      
      return result;
    }
  }

  private async sendSingleSms(recipient: string, message: string, sender: string): Promise<ArkeselSmsResponse> {
    try {
      const payload = {
        sender,
        message,
        recipients: [recipient],
      };

      const response = await this.httpClient.post('/sms/send', payload);
      const data: ArkeselSmsResponse = response.data;

      if (data.status === 'success' || response.status === 200) {
        this.logger.debug(`SMS sent successfully to ${recipient}. Response:`, data);
        return data;
      } else {
        throw new Error(`Arkesel API error: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${recipient}:`, error);
      throw error;
    }
  }

  private validatePhoneNumbers(phoneNumbers: string[]): string[] {
    const validNumbers: string[] = [];
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format

    for (const number of phoneNumbers) {
      const cleanNumber = this.cleanPhoneNumber(number);
      
      if (phoneRegex.test(cleanNumber)) {
        validNumbers.push(cleanNumber);
      } else {
        this.logger.warn(`Invalid phone number format: ${number}`);
      }
    }

    return validNumbers;
  }

  private cleanPhoneNumber(phoneNumber: string): string {
    // Remove spaces, dashes, parentheses, and other non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If number doesn't start with +, assume it's a Ghanaian number and add +233
    if (!cleaned.startsWith('+')) {
      // Remove leading 0 if present (common in local format)
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      // Add Ghana country code if it looks like a local number
      if (cleaned.length === 9) {
        cleaned = '+233' + cleaned;
      } else if (cleaned.length === 10 && cleaned.startsWith('233')) {
        cleaned = '+' + cleaned;
      } else {
        // Default to adding + if not present
        cleaned = '+' + cleaned;
      }
    }

    return cleaned;
  }

  private sanitizeMessage(message: string): string {
    // Remove or escape characters that might cause issues
    return message
      .replace(/[\u0000-\u001F\u007F]/g, '') // Remove control characters
      .replace(/[\u2028\u2029]/g, ' ') // Replace line/paragraph separators
      .trim()
      .substring(0, 918); // SMS character limit (accounting for concatenated messages)
  }

  async checkBalance(): Promise<{ balance: number; currency: string } | null> {
    try {
      const response = await this.httpClient.get('/user/balance');
      const data = response.data;

      if (data.status === 'success' && data.data) {
        return {
          balance: parseFloat(data.data.balance || '0'),
          currency: data.data.currency || 'GHS',
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to check SMS balance:', error);
      return null;
    }
  }

  async getSmsStatus(messageId: string): Promise<string | null> {
    try {
      const response = await this.httpClient.get(`/sms/status/${messageId}`);
      const data = response.data;

      if (data.status === 'success' && data.data) {
        return data.data.status;
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get SMS status for message ${messageId}:`, error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const balance = await this.checkBalance();
      return balance !== null;
    } catch (error) {
      this.logger.error('SMS connection test failed:', error);
      return false;
    }
  }

  async sendBulkSms(smsMessages: SmsData[]): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const batchSize = 5; // Process in smaller batches to avoid rate limiting

    for (let i = 0; i < smsMessages.length; i += batchSize) {
      const batch = smsMessages.slice(i, i + batchSize);
      const batchPromises = batch.map(sms => this.sendSms(sms));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches to respect rate limits
      if (i + batchSize < smsMessages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    return results;
  }

  getMessageCharacterCount(message: string): { count: number; parts: number; encoding: string } {
    const sanitized = this.sanitizeMessage(message);
    
    // Check if message contains non-GSM characters
    const gsmRegex = /^[\r\n\x20-\x7E\u00A1\u00A3-\u00A5\u00A7\u00BF\u00C4-\u00C6\u00C9\u00D1\u00D6\u00DC\u00DF\u00E0\u00E4-\u00E6\u00E8-\u00E9\u00EC\u00ED\u00F1\u00F2\u00F6\u00F9\u00FA\u00FC\u00FF\u0393\u0394\u0398\u039B\u039E\u03A0\u03A3\u03A6\u03A8\u03A9]*$/;
    const isGsm = gsmRegex.test(sanitized);
    
    const encoding = isGsm ? 'GSM' : 'UCS2';
    const maxSingleSms = isGsm ? 160 : 70;
    const maxConcatSms = isGsm ? 153 : 67;
    
    const count = sanitized.length;
    const parts = count <= maxSingleSms ? 1 : Math.ceil(count / maxConcatSms);
    
    return { count, parts, encoding };
  }
}