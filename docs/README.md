# Documentation index

Most of these notes were written while each feature was built. Start with the guide for an area; the "summary" and "complete" files are implementation logs kept for history.

## Assessments (DefendX)

- [Anonymous assessments API](ANONYMOUS_ASSESSMENTS.md)
- [Questions API guide](QUESTIONS_API_GUIDE.md) and [how to get questions](HOW_TO_GET_QUESTIONS.md)
- [CSI real data](CSI_REAL_DATA_IMPLEMENTATION.md), [quick reference](CSI_QUICK_REFERENCE.md)

## Phishing campaigns (DefendX+)

- Guides: [quick start](PHISHING_QUICK_START.md), [production checklist](PHISHING_PRODUCTION_CHECKLIST.md), [email integration](PHISHING_EMAIL_INTEGRATION.md), [multi-channel campaigns](MULTI_CHANNEL_PHISHING_CAMPAIGNS.md)
- Queues and jobs: [Bull queue](PHISHING_BULL_QUEUE.md), [cron jobs](PHISHING_CRON_JOBS.md)
- Scheduling: [process walkthrough](SCHEDULED_CAMPAIGNS_PROCESS.md), [quick reference](SCHEDULED_CAMPAIGNS_QUICK_REF.md), [safety layers](CAMPAIGN_SCHEDULER_SAFETY_LAYERS.md), [60-second polling cron](CAMPAIGN_SCHEDULER_CRON.md), [logging guide](CAMPAIGN_SCHEDULING_LOGS.md)
- Implementation logs: [scheduling](CAMPAIGN_SCHEDULING.md), [scheduler complete](CAMPAIGN_SCHEDULER_COMPLETE.md), [scheduled campaigns](README_SCHEDULED_CAMPAIGNS.md), [polling cron](IMPLEMENTATION_SUMMARY.md), [logging](CAMPAIGN_SCHEDULING_LOGGING_SUMMARY.md)

Since the Phase 2 changes, every `@Cron` job is wrapped in `@RunExclusively` (`src/common/decorators/run-exclusively.decorator.ts`), so it runs on one instance per tick when the app is scaled out.

## Email

- Tracking: [system](EMAIL_TRACKING_SYSTEM.md), [quick start](EMAIL_TRACKING_QUICK_START.md), [summary](EMAIL_TRACKING_SUMMARY.md)
- Sending domain: [domain setup](EMAIL_DOMAIN_SETUP.md), [domain masking](EMAIL_DOMAIN_MASKING.md) and [summary](DOMAIN_MASKING_SUMMARY.md), [DNS records](DNS_RECORDS_CYBER360_TECH.md), [verify cyber360.tech](VERIFY_DOMAIN_CYBER360_TECH.md), [verification checklist](DOMAIN_VERIFICATION_CHECKLIST.md)
- Providers and limits: [Mailtrap sandbox](MAILTRAP_SANDBOX_SETUP.md), [rate limiter](RATE_LIMITER.md) and [quick setup](RATE_LIMITER_QUICK_SETUP.md), [email verification](EMAIL_VERIFICATION_IMPLEMENTATION.md)

## SMS

- [SMS provider recommendations](SMS_SERVICE_RECOMMENDATIONS.md)

## Operations

- [Deployment notes](DEPLOYMENT_READY.md)
- [Heroku Redis setup](HEROKU_REDIS_SETUP.md), [quick reference](HEROKU_REDIS_QUICK_REF.md)
- AWS backup bucket policies: [`infra/aws`](../infra/aws/README.md)
- Health check: `GET /api/v1/health` (database ping, 503 when down)

## Testing

- Unit tests: `npm test`
- End-to-end tests: `npm run test:e2e` with `DATABASE_URL` pointing at a disposable local or `*test*` Postgres database and `REDIS_URL` at a local Redis. The suite truncates every table and refuses to run against any other database.
