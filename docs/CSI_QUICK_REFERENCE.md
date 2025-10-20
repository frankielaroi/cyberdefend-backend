# CSI Real Data - Quick Reference Guide

## Summary

The CSI (Cybersecurity Index) system has been updated to use **actual company data** from the database instead of placeholder/mock values. All benchmark calculations and percentile rankings now reflect real organizational performance.

## What Changed

### Before
- Hardcoded placeholder percentile values (e.g., 65, 72, 58)
- Mock benchmark data for comparisons
- No real peer-to-peer comparisons

### After
- ✅ Real-time calculations from actual organization CSI scores
- ✅ Accurate percentile rankings based on peer comparisons
- ✅ Dynamic benchmarks that update with new assessments
- ✅ Comprehensive statistics by region, sector, and size

## Key Features

### 1. Automatic Benchmark Updates
The system automatically calculates benchmarks from all active organizations with CSI scores.

```typescript
// Example: Update all benchmarks
const result = await benchmarkService.updateBenchmarks();
// Returns:
// {
//   message: 'Benchmarks updated successfully',
//   period: '2025-Q4',
//   totalBenchmarks: 45,
//   totalOrganizations: 150
// }
```

### 2. Real Percentile Rankings
Organizations are ranked against their peers in three categories:
- **Industry Percentile**: Compared to organizations in the same sector
- **Size Percentile**: Compared to organizations of similar size
- **Regional Percentile**: Compared to organizations in the same region

### 3. Live Calculations
When cached benchmark data is unavailable, the system automatically calculates benchmarks in real-time from current organization data.

## How It Works

### Data Flow

1. **Assessment Completion** → Organization's CSI score is calculated and stored
2. **Benchmark Update** → Aggregates scores by region/sector/size combinations
3. **Percentile Calculation** → Compares organization against peers
4. **Report Generation** → Uses real data for comparisons

### Calculation Logic

**Percentile Calculation Example:**
- Organization A has CSI score: 75
- Same sector has 100 organizations with scores: 45-95
- 70 organizations score below 75
- Percentile = (70/100) × 100 = 70th percentile
- Organization A performs better than 70% of peers

## API Endpoints Affected

All endpoints remain the same, but now return real data:

### Assessment Endpoints
- `POST /defendx/assessments/:id/submit` - Returns real benchmark comparisons
- `GET /defendx/assessments/:id/report` - Uses actual percentile rankings

### Directory Endpoints
- `GET /csi-directory/regional-benchmarks` - Shows actual regional averages
- `GET /csi-directory/sectoral-benchmarks` - Shows actual sector averages

### Dashboard Endpoints
- `GET /defendx/dashboard/:organizationId` - Displays real peer comparisons

## Running Benchmark Updates

### Manual Update
You can manually trigger a benchmark update:

```bash
# Via API (requires admin access)
POST /api/admin/benchmarks/update

# Via backend service
await benchmarkService.updateBenchmarks();
```

### Scheduled Updates
Consider setting up a cron job to update benchmarks regularly:
- **Recommended frequency**: Daily or after each assessment completion
- **Off-peak hours**: Run during low-traffic periods
- **Monitor performance**: Watch for slow queries with large datasets

## Data Requirements

### Minimum Data for Accurate Benchmarks
- **Regional**: At least 10 organizations per region
- **Sectoral**: At least 15 organizations per sector
- **Size-based**: At least 10 organizations per size category

### Handling Insufficient Data
When insufficient peer data exists:
- Percentiles return `null`
- Benchmarks return `0`
- Reports show "Insufficient data for comparison"

## Performance Considerations

### Optimizations Included
✅ Cached benchmark data (by period)
✅ Fallback to live calculations
✅ Efficient aggregation queries
✅ Minimal database hits

### Recommended Indexes
Consider adding these database indexes for better performance:

```sql
-- On Organization table
CREATE INDEX idx_org_csi_score ON organizations(csi_score) WHERE is_active = true;
CREATE INDEX idx_org_region_sector_size ON organizations(region, sector, size);

-- On BenchmarkData table
CREATE INDEX idx_benchmark_lookup ON benchmark_data(region, sector, size, period);
```

## Monitoring & Maintenance

### Health Checks
Monitor these metrics:
- Average benchmark update duration
- Number of organizations per category
- Percentile calculation accuracy
- Cache hit/miss rates

### Data Quality
Ensure data quality by:
- Validating CSI scores (0-100 range)
- Checking for null regions (affects regional benchmarks)
- Monitoring inactive organizations
- Verifying assessment completion rates

## Troubleshooting

### Problem: All percentiles return null
**Cause**: Insufficient peer organizations
**Solution**: Ensure at least 10 active organizations exist in each category

### Problem: Benchmarks show 0 values
**Cause**: No cached data and no organizations match filter
**Solution**: Run `updateBenchmarks()` or check organization data

### Problem: Slow performance
**Cause**: Large dataset without indexes
**Solution**: Add recommended database indexes

### Problem: Inconsistent rankings
**Cause**: Benchmark data not updated recently
**Solution**: Update benchmarks after new assessments

## Best Practices

1. **Update Regularly**: Run benchmark updates after major assessment completions
2. **Monitor Data**: Track the number of organizations in each category
3. **Handle Nulls**: UI should gracefully handle null percentiles
4. **Cache Strategy**: Balance freshness vs. performance
5. **Validate Inputs**: Ensure organization attributes are properly set

## Example Usage

```typescript
// 1. Get benchmarks for comparison
const benchmarks = await benchmarkService.getBenchmarks(
  'Greater Accra',  // region
  'TECHNOLOGY',     // sector
  'MEDIUM'          // size
);

// 2. Calculate percentiles for an organization
const percentiles = await benchmarkService.calculatePercentile(orgId);
console.log(`Industry: ${percentiles.industryPercentile}th percentile`);
console.log(`Size: ${percentiles.sizePercentile}th percentile`);
console.log(`Region: ${percentiles.regionPercentile}th percentile`);

// 3. Update all benchmarks
const updateResult = await benchmarkService.updateBenchmarks();
console.log(`Updated ${updateResult.totalBenchmarks} benchmarks`);
```

## Support

For issues or questions:
1. Check the main documentation: `CSI_REAL_DATA_IMPLEMENTATION.md`
2. Review the code in: `src/defendx/services/benchmark.service.ts`
3. Monitor logs for error messages
4. Verify database connectivity and data integrity
