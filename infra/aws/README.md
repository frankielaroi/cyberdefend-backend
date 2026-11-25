# AWS configuration for backups

Reference policies for the S3 bucket that stores organization backups. They are applied by hand in AWS; nothing in the app reads these files.

- `backup-iam-policy.json`: IAM policy for the app user, scoped to the production backup bucket.
- `backup-iam-policy-minimal.json`: the same access for any `myapp-backups-prod-*` bucket, without ACL or bucket-location permissions.
- `s3-bucket-encryption.json`: default server-side encryption (AES-256) for the bucket, for `aws s3api put-bucket-encryption`.
