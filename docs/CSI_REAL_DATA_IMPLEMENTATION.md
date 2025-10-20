# CSI Real Data Implementation

## Overview
This document describes the implementation of CSI (Cybersecurity Index) calculations using actual company data from the database instead of placeholder/mock data.

## Changes Made

### 1. BenchmarkService (`src/defendx/services/benchmark.service.ts`)

#### Enhanced `getBenchmarks()` Method
- Now attempts to retrieve cached benchmark data first
- Falls back to real-time calculation from actual organization data if cached data is unavailable
- Uses the new `calculateLiveBenchmark()` method for on-the-fly calculations

#### New `calculateLiveBenchmark()` Method
- Calculates benchmarks in real-time from actual organization CSI scores
- Supports filtering by region, sector, or size
- Uses `prisma.organization.aggregate()` to calculate average CSI scores

#### Enhanced `updateBenchmarks()` Method
- Now calculates benchmarks for all combinations of region, sector, and size from actual organizations
- Groups organizations by their attributes and calculates accurate averages
- Stores comprehensive benchmark data with actual organization counts
- Returns detailed statistics about the update operation

#### New `calculatePercentile()` Method
- Calculates accurate percentile rankings for organizations
- Compares organizations against peers in three categories:
  - Industry (sector) percentile
  - Size-based percentile
  - Regional percentile
- Returns null for categories without sufficient data

#### New `calculatePercentileForFilter()` Method (Private)
- Core percentile calculation logic
- Retrieves all organizations matching a specific filter
- Counts organizations with lower scores
- Calculates exact percentile position (0-100)

### 2. AssessmentService (`src/defendx/services/assessment.service.ts`)

#### Updated `getBenchmarkData()` Method
- Removed placeholder/mock percentile values
- Now uses `BenchmarkService.calculatePercentile()` for real calculations
- Returns actual percentile rankings based on live organization data
- Handles organizations without sufficient comparison data gracefully

### 3. ComprehensiveReportService (`src/defendx/services/comprehensive-report.service.ts`)

#### Enhanced `getBenchmarkingData()` Method
- Retrieves actual benchmark data from the database by period
- Fetches separate benchmarks for region, sector, and size
- Calculates real percentile positions using actual organization data
- Returns accurate organization counts and average scores

#### New `calculatePercentilePosition()` Method (Private)
- Calculates actual percentile ranking for a specific organization
- Supports filtering by region, sector, or size
- Returns the percentage of organizations the target org performs better than
- Returns null when insufficient data is available

## Key Improvements

### 1. Real-Time Accuracy
- All CSI benchmarks now reflect actual organization performance
- No more hardcoded placeholder values
- Percentiles calculated from real peer comparisons

### 2. Dynamic Calculations
- Benchmarks automatically update as new assessments are completed
- Falls back to live calculations when cached data is unavailable
- Ensures data is always current and accurate

### 3. Comprehensive Coverage
- Calculates benchmarks for all combinations of:
  - Regions
  - Sectors (industries)
  - Organization sizes
- Provides granular comparison data

### 4. Proper Statistics
- Uses proper percentile calculations (rank-based)
- Counts actual organizations in each category
- Handles edge cases (null data, insufficient samples)

## Database Schema

The implementation uses the existing `BenchmarkData` model:

```prisma
model BenchmarkData {
  id            String           @id @default(uuid())
  region        String
  sector        Sector
  size          OrganizationSize
  avgScore      Float            // Average CSI score
  totalOrgs     Int              // Number of organizations
  period        String           // e.g., "2024-Q4"
  createdAt     DateTime         @default(now())

  @@unique([region, sector, size, period])
}
```

## Usage

### Updating Benchmarks
To recalculate all benchmarks from current organization data:

```typescript
await benchmarkService.updateBenchmarks();
```

This should be run:
- After completing new assessments
- On a scheduled basis (e.g., weekly/monthly)
- When significant data changes occur

### Getting Organization Percentiles
To get percentile rankings for a specific organization:

```typescript
const percentiles = await benchmarkService.calculatePercentile(organizationId);
// Returns: { industryPercentile, sizePercentile, regionPercentile }
```

### Getting Benchmarks
To retrieve benchmark data for comparison:

```typescript
const benchmarks = await benchmarkService.getBenchmarks(region, sector, size);
// Returns: { regional, sectoral, sizeBased }
```

## Benefits

1. **Accuracy**: Real-time data ensures accurate comparisons
2. **Transparency**: Organizations can trust the benchmarks are based on actual peer data
3. **Scalability**: Automatically handles growing dataset
4. **Flexibility**: Easy to add new benchmark dimensions
5. **Performance**: Caches computed benchmarks for fast retrieval

## Future Enhancements

1. **Trend Analysis**: Track benchmark changes over multiple periods
2. **Advanced Statistics**: Add median, standard deviation, quartiles
3. **Weighted Benchmarks**: Consider organization size in averages
4. **Anonymization**: Ensure individual organizations can't be identified
5. **Custom Comparisons**: Allow users to select specific peer groups

## Testing Recommendations

1. **Data Quality**: Ensure sufficient organizations exist in each category
2. **Edge Cases**: Test with organizations that have unique attributes
3. **Performance**: Monitor query performance with large datasets
4. **Accuracy**: Verify percentile calculations match manual calculations
5. **Caching**: Test that stale cached data is handled properly

## Migration Notes

- No database migration required (uses existing schema)
- Existing code continues to work
- Recommend running `updateBenchmarks()` after deployment
- Monitor for performance issues with large datasets
- Consider adding indexes on frequently queried fields

## API Impact

- No breaking changes to existing API endpoints
- Response format remains the same
- Values change from placeholder to actual data
- Some organizations may see null values if insufficient peer data exists
