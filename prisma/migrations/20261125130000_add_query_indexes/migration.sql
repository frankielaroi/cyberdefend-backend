-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE INDEX "invite_codes_organizationId_idx" ON "invite_codes"("organizationId");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_idx" ON "organization_members"("organizationId");

-- CreateIndex
CREATE INDEX "assessments_organizationId_createdAt_idx" ON "assessments"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "assessments_status_expiresAt_idx" ON "assessments"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "questions_categoryId_idx" ON "questions"("categoryId");

-- CreateIndex
CREATE INDEX "question_options_questionId_idx" ON "question_options"("questionId");

-- CreateIndex
CREATE INDEX "phishing_campaigns_organizationId_status_idx" ON "phishing_campaigns"("organizationId", "status");

-- CreateIndex
CREATE INDEX "phishing_campaigns_status_scheduledAt_idx" ON "phishing_campaigns"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "phishing_events_campaignId_type_idx" ON "phishing_events"("campaignId", "type");

-- CreateIndex
CREATE INDEX "phishing_events_targetId_idx" ON "phishing_events"("targetId");

-- CreateIndex
CREATE INDEX "phishing_templates_organizationId_idx" ON "phishing_templates"("organizationId");

-- CreateIndex
CREATE INDEX "email_jobs_campaignId_status_idx" ON "email_jobs"("campaignId", "status");

-- CreateIndex
CREATE INDEX "email_jobs_status_scheduledFor_idx" ON "email_jobs"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "agents_organizationId_idx" ON "agents"("organizationId");

-- CreateIndex
CREATE INDEX "telemetry_events_agentId_timestamp_idx" ON "telemetry_events"("agentId", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_agentId_status_idx" ON "alerts"("agentId", "status");

-- CreateIndex
CREATE INDEX "scan_results_agentId_idx" ON "scan_results"("agentId");

-- CreateIndex
CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_idx" ON "invoices"("organizationId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_timestamp_idx" ON "audit_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "notification_history_userId_idx" ON "notification_history"("userId");

-- CreateIndex
CREATE INDEX "backup_agents_organizationId_idx" ON "backup_agents"("organizationId");

-- CreateIndex
CREATE INDEX "backup_jobs_organizationId_status_createdAt_idx" ON "backup_jobs"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "backups_organizationId_createdAt_idx" ON "backups"("organizationId", "createdAt");

