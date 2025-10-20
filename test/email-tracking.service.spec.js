"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const email_tracking_service_1 = require("../src/common/services/email-tracking.service");
const prisma_service_1 = require("../src/database/prisma.service");
describe('Email Tracking System Tests', () => {
    let service;
    let prisma;
    const mockPrismaService = {
        emailTracking: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            deleteMany: jest.fn(),
        },
        phishingCampaign: {
            update: jest.fn(),
        },
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                email_tracking_service_1.EmailTrackingService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();
        service = module.get(email_tracking_service_1.EmailTrackingService);
        prisma = module.get(prisma_service_1.PrismaService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('createTracking', () => {
        it('should create a tracking record with a unique tracking ID', async () => {
            const mockTracking = {
                id: 'test-id',
                trackingId: 'tracking-123',
                recipientEmail: 'test@example.com',
                emailSubject: 'Test Email',
                emailType: 'notification',
                sentAt: new Date(),
            };
            mockPrismaService.emailTracking.create.mockResolvedValue(mockTracking);
            const trackingId = await service.createTracking({
                recipientEmail: 'test@example.com',
                emailSubject: 'Test Email',
                emailType: 'notification',
            });
            expect(trackingId).toBeTruthy();
            expect(mockPrismaService.emailTracking.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    recipientEmail: 'test@example.com',
                    emailSubject: 'Test Email',
                    emailType: 'notification',
                }),
            }));
        });
    });
    describe('recordOpen', () => {
        it('should record first email open correctly', async () => {
            const mockTracking = {
                id: 'test-id',
                trackingId: 'tracking-123',
                recipientEmail: 'test@example.com',
                openCount: 0,
                openedAt: null,
                phishingCampaignId: null,
            };
            mockPrismaService.emailTracking.findUnique.mockResolvedValue(mockTracking);
            mockPrismaService.emailTracking.update.mockResolvedValue({
                ...mockTracking,
                openCount: 1,
                openedAt: new Date(),
            });
            const result = await service.recordOpen('tracking-123', {
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
                deviceType: 'desktop',
            });
            expect(result).toBe(true);
            expect(mockPrismaService.emailTracking.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { trackingId: 'tracking-123' },
                data: expect.objectContaining({
                    openCount: { increment: 1 },
                    ipAddress: '192.168.1.1',
                    userAgent: 'Mozilla/5.0',
                    deviceType: 'desktop',
                }),
            }));
        });
        it('should handle multiple opens of the same email', async () => {
            const mockTracking = {
                id: 'test-id',
                trackingId: 'tracking-123',
                recipientEmail: 'test@example.com',
                openCount: 3,
                openedAt: new Date('2025-01-01'),
                lastOpenedAt: new Date('2025-01-02'),
                phishingCampaignId: null,
            };
            mockPrismaService.emailTracking.findUnique.mockResolvedValue(mockTracking);
            mockPrismaService.emailTracking.update.mockResolvedValue({
                ...mockTracking,
                openCount: 4,
                lastOpenedAt: new Date(),
            });
            const result = await service.recordOpen('tracking-123');
            expect(result).toBe(true);
            expect(mockPrismaService.emailTracking.update).toHaveBeenCalled();
        });
        it('should update phishing campaign stats on first open', async () => {
            const mockTracking = {
                id: 'test-id',
                trackingId: 'tracking-123',
                recipientEmail: 'test@example.com',
                openCount: 0,
                openedAt: null,
                phishingCampaignId: 'campaign-123',
            };
            mockPrismaService.emailTracking.findUnique.mockResolvedValue(mockTracking);
            mockPrismaService.emailTracking.update.mockResolvedValue({
                ...mockTracking,
                openCount: 1,
                openedAt: new Date(),
            });
            await service.recordOpen('tracking-123');
            expect(mockPrismaService.phishingCampaign.update).toHaveBeenCalledWith({
                where: { id: 'campaign-123' },
                data: {
                    emailsOpened: { increment: 1 },
                },
            });
        });
        it('should return false for non-existent tracking ID', async () => {
            mockPrismaService.emailTracking.findUnique.mockResolvedValue(null);
            const result = await service.recordOpen('non-existent-id');
            expect(result).toBe(false);
            expect(mockPrismaService.emailTracking.update).not.toHaveBeenCalled();
        });
    });
    describe('generateTrackingPixelHtml', () => {
        it('should generate correct tracking pixel HTML', () => {
            const trackingId = 'test-tracking-123';
            const baseUrl = 'https://example.com';
            const html = service.generateTrackingPixelHtml(trackingId, baseUrl);
            expect(html).toContain(`src="${baseUrl}/api/track/open/${trackingId}"`);
            expect(html).toContain('width="1"');
            expect(html).toContain('height="1"');
            expect(html).toContain('display:none');
        });
    });
    describe('injectTrackingPixel', () => {
        it('should inject pixel before closing body tag', () => {
            const trackingId = 'test-123';
            const html = '<html><body><p>Content</p></body></html>';
            const result = service.injectTrackingPixel(html, trackingId);
            expect(result).toContain('<img src=');
            expect(result).toContain('</body>');
            expect(result.indexOf('<img')).toBeLessThan(result.indexOf('</body>'));
        });
        it('should append pixel if no body tag exists', () => {
            const trackingId = 'test-123';
            const html = '<html><p>Content without body tag</p></html>';
            const result = service.injectTrackingPixel(html, trackingId);
            expect(result).toContain('<img src=');
            expect(result.endsWith('/>') || result.endsWith('html>')).toBe(true);
        });
    });
    describe('getTrackingStats', () => {
        it('should calculate tracking statistics correctly', async () => {
            const mockTrackings = [
                { openCount: 2, sentAt: new Date('2025-01-01') },
                { openCount: 0, sentAt: new Date('2025-01-02') },
                { openCount: 3, sentAt: new Date('2025-01-03') },
                { openCount: 1, sentAt: new Date('2025-01-04') },
            ];
            mockPrismaService.emailTracking.findMany.mockResolvedValue(mockTrackings);
            const stats = await service.getTrackingStats('test@example.com');
            expect(stats.totalSent).toBe(4);
            expect(stats.totalOpened).toBe(3);
            expect(stats.totalOpens).toBe(6);
            expect(stats.openRate).toBe(75);
            expect(stats.recipientEmail).toBe('test@example.com');
        });
    });
    describe('cleanupOldTrackings', () => {
        it('should delete tracking records older than specified days', async () => {
            const daysToKeep = 90;
            mockPrismaService.emailTracking.deleteMany.mockResolvedValue({ count: 15 });
            const count = await service.cleanupOldTrackings(daysToKeep);
            expect(count).toBe(15);
            expect(mockPrismaService.emailTracking.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    sentAt: {
                        lt: expect.any(Date),
                    },
                },
            }));
        });
    });
});
//# sourceMappingURL=email-tracking.service.spec.js.map