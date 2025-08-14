# Database Cleanup System

This document describes the automated database cleanup system for NVLP, which maintains database performance and manages storage by removing old and unnecessary data.

## Overview

The cleanup system automatically removes:
- **Old session invalidation records** (older than 30 days)
- **Inactive user devices** (not seen for 180+ days, keeping at least one per user)
- **Soft-deleted transactions** (older than 30 days)
- **Old cleanup logs** (older than 90 days)

## Components

### 1. Database Functions

#### `cleanup_old_user_devices()`
- Removes user devices not seen for 180+ days
- Always keeps at least one device per user (most recent)
- Also cleans up invalidated sessions older than 30 days
- Returns count of cleaned devices and sessions

#### `run_all_cleanup_jobs()`
- Orchestrates all cleanup operations
- Provides detailed execution metrics
- Logs all activities for auditing
- Returns comprehensive results for monitoring

#### `get_cleanup_stats(days_back)`
- Provides cleanup statistics for specified period
- Shows total records cleaned, last run, and run count
- Useful for monitoring and reporting

### 2. Edge Function

**Endpoint**: `/functions/v1/cleanup-jobs`

The cleanup Edge Function provides:
- **Actual cleanup**: `POST {"manual": true}`
- **Dry run**: `POST {"dry_run": true}`
- **Detailed reporting**: Execution times, records cleaned, job status
- **Error handling**: Comprehensive error reporting and logging

### 3. Management Tools

#### Scripts
- **`scripts/manage-cleanup-jobs.sh`**: Command-line management tool
- **GitHub Actions**: Automated daily cleanup workflow
- **Manual execution**: Direct Edge Function calls

### 4. Logging and Monitoring

#### Cleanup Logs Table
```sql
CREATE TABLE public.cleanup_logs (
  id UUID PRIMARY KEY,
  cleanup_type TEXT NOT NULL,
  records_cleaned INTEGER DEFAULT 0,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Configuration

### Cleanup Intervals

| Data Type | Retention Period | Cleanup Frequency |
|-----------|-----------------|-------------------|
| Session invalidations | 30 days | Daily |
| Inactive devices | 180 days | Daily |
| Soft-deleted transactions | 30 days | Daily |
| Cleanup logs | 90 days | Daily |

### Edge Function Environment

Required environment variables:
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Usage

### Automatic Scheduling (Recommended)

The system runs automatically via GitHub Actions daily at 2 AM UTC:

```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Manual Execution

#### Using Management Script
```bash
# Run actual cleanup
./scripts/manage-cleanup-jobs.sh run

# Dry run (check what would be cleaned)
./scripts/manage-cleanup-jobs.sh dry-run

# View statistics
./scripts/manage-cleanup-jobs.sh stats

# Test functionality
./scripts/manage-cleanup-jobs.sh test
```

#### Direct API Calls
```bash
# Actual cleanup
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"manual": true}' \
  "$SUPABASE_URL/functions/v1/cleanup-jobs"

# Dry run
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"dry_run": true}' \
  "$SUPABASE_URL/functions/v1/cleanup-jobs"
```

### GitHub Actions Manual Trigger

1. Go to Actions tab in GitHub repository
2. Select "Database Cleanup Jobs"
3. Click "Run workflow"
4. Choose dry run or actual cleanup

## Monitoring and Alerting

### Success Indicators
- ✅ HTTP 200 response from Edge Function
- ✅ `"success": true` in response JSON
- ✅ No failed jobs in summary
- ✅ Reasonable execution time (<10 seconds)

### Failure Indicators
- ❌ HTTP error status (4xx, 5xx)
- ❌ `"success": false` in response
- ❌ Failed jobs in job results
- ❌ Timeout or execution errors

### Response Format
```json
{
  "success": true,
  "manual_run": false,
  "summary": {
    "total_records_cleaned": 150,
    "total_execution_time_ms": 1250,
    "successful_jobs": 4,
    "failed_jobs": 0,
    "timestamp": "2024-08-14T02:00:00.000Z"
  },
  "job_results": [
    {
      "job_name": "cleanup_user_devices",
      "records_cleaned": 45,
      "execution_time_ms": 300,
      "status": "completed"
    },
    // ... other jobs
  ],
  "next_recommended_run": "2024-08-15T02:00:00.000Z"
}
```

## Deployment

### 1. Deploy Database Migration
```bash
supabase db push
```

### 2. Deploy Edge Function
```bash
supabase functions deploy cleanup-jobs --no-verify-jwt
```

### 3. Configure GitHub Secrets
Add to repository secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. Test Setup
```bash
./scripts/manage-cleanup-jobs.sh test
```

## Performance Considerations

### Database Impact
- **Low impact**: Uses indexes for efficient queries
- **Non-blocking**: Operations don't lock application tables
- **Incremental**: Only processes records meeting criteria
- **Logged**: All operations logged for audit

### Execution Time
- **Typical**: 1-5 seconds for normal cleanup
- **Heavy load**: Up to 30 seconds for large datasets
- **Timeout**: 10-minute maximum (GitHub Actions)

### Resource Usage
- **Memory**: Minimal (streaming operations)
- **CPU**: Low impact (efficient queries)
- **I/O**: Moderate (DELETE operations)
- **Storage**: Reduces storage usage over time

## Troubleshooting

### Common Issues

#### 1. Edge Function Not Deployed
```bash
# Deploy the function
supabase functions deploy cleanup-jobs --no-verify-jwt

# Test deployment
curl -I "$SUPABASE_URL/functions/v1/cleanup-jobs"
```

#### 2. Permission Errors
- Ensure service role key is correct
- Check RLS policies allow service role access
- Verify function grants in migration

#### 3. Database Errors
```bash
# Check migration status
supabase db status

# Apply missing migrations
supabase db push
```

#### 4. GitHub Actions Failures
- Check repository secrets are set
- Verify secret names match workflow
- Review action logs for specific errors

### Debugging

#### View Recent Cleanup Activity
```sql
SELECT * FROM public.cleanup_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

#### Check Cleanup Statistics
```sql
SELECT * FROM public.get_cleanup_stats(30);
```

#### Manual Database Cleanup
```sql
-- Run cleanup manually in database
SELECT * FROM public.run_all_cleanup_jobs();
```

## Security

### Access Control
- **Edge Function**: Requires service role authentication
- **Database Functions**: Use `SECURITY DEFINER` for controlled access
- **RLS Policies**: Service role can access cleanup tables
- **GitHub Actions**: Uses encrypted secrets

### Data Protection
- **Soft Deletes**: Transactions are soft-deleted before permanent removal
- **User Devices**: Always keeps at least one device per user
- **Audit Trail**: All cleanup activities logged
- **Reversibility**: Critical operations can be reversed within retention period

### Compliance
- **Data Retention**: Configurable retention periods
- **Audit Logging**: Complete audit trail of all operations
- **Privacy**: No sensitive data exposed in logs
- **Security**: All operations authenticated and authorized

## Customization

### Adjust Retention Periods

Edit migration file to change retention:
```sql
-- Change device retention to 90 days
WHERE last_seen < NOW() - INTERVAL '90 days'

-- Change session retention to 14 days
WHERE invalidated_at < NOW() - INTERVAL '14 days'
```

### Add Custom Cleanup Jobs

Add new cleanup functions to `run_all_cleanup_jobs()`:
```sql
-- Custom cleanup example
v_start_time := clock_timestamp();
DELETE FROM custom_table WHERE created_at < NOW() - INTERVAL '30 days';
GET DIAGNOSTICS v_records_cleaned = ROW_COUNT;
-- Log and return results
```

### Modify Schedule

Change GitHub Actions schedule:
```yaml
schedule:
  - cron: '0 3 * * 0'  # Weekly on Sunday at 3 AM UTC
```

This comprehensive cleanup system ensures your NVLP database remains performant and well-maintained with minimal manual intervention.