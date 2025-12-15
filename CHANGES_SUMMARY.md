# TeamLight - Feature Updates Summary

## Overview
This document summarizes the three major functionality adjustments implemented in the TeamLight system.

---

## 1. Multiplier Database System

### What Changed
Previously, multiplier values (seniority adjustments) were read from the uploaded CSV file. Now, they are managed through a separate **Multiplier Database** that administrators can upload and maintain independently.

### New Structure
The multiplier file should contain 3 columns:
- **Nama / Name**: Person's name (e.g., "Yoga Nasution")
- **Posisi / Position**: Function/Role (e.g., "QA", "BE", "FE", "OPERATION", "DESIGNER", etc.)
- **Formula / Multiplier**: Multiplier value (e.g., 0.9, 1.0, 1.2)

### How to Use
1. **Admin Panel**: Navigate to Admin page (requires admin role)
2. **Upload Multiplier File**: 
   - Click "Upload Multiplier CSV" 
   - Select your CSV file with the 3 required columns
   - System will validate and load the data
3. **Load Sample**: For testing, click "Load Sample" to load demo multiplier data
4. **Automatic Application**: Once uploaded, multipliers are automatically applied to all uploaded ticket data

### Benefits
- ✅ Centralized multiplier management
- ✅ Easy to update multipliers without re-uploading all ticket data
- ✅ Supports both Indonesian (Nama, Posisi) and English (Name, Position) column names
- ✅ Validation ensures data quality
- ✅ Multipliers persist on server across sessions

### Technical Details
- **File**: `src/lib/multiplierManager.ts` - Handles parsing and validation
- **Storage**: Server-side in-memory storage (persists across user sessions)
- **Fallback**: If person not found in database, defaults to 1.0 multiplier
- **API**: New endpoints added to `/api/data` for multiplier storage

---

## 2. Date-Based Sprint Calculation

### What Changed
For the three main products (**Orion**, **Threat Intel**, and **Aman/Intellibron Aman**), sprint assignment is now calculated based on **Start Date** and **Due Date** instead of using the Sprint Closed column from CSV.

### How It Works
1. **Automatic Detection**: System detects if a ticket belongs to Orion, Threat Intel, or Aman
2. **Date Parsing**: Reads "Start Date" and "Due Date" (or "Finish Date", "End Date") columns
3. **Sprint Calculation**: 
   - Uses due date to determine which sprint the user story falls into
   - If sprint configurations are provided, maps to exact sprint periods
   - Otherwise, calculates using 2-week sprint cycles from a base date
4. **Other Projects**: Other projects continue using the original Sprint Closed value from CSV

### Benefits
- ✅ More accurate sprint assignment based on actual work dates
- ✅ Reflects when work was actually planned/completed
- ✅ Flexible: supports both configured sprint periods and automatic calculation
- ✅ No impact on other projects

### Technical Details
- **File**: `src/lib/sprintCalculator.ts` - Sprint calculation logic
- **Detection**: Checks project name contains "Orion", "Threat Intel", or "Aman"
- **Date Columns**: Supports multiple date column names (Due Date, Finish Date, End Date)
- **Configuration**: Optional sprint configurations can be uploaded for precise sprint periods

---

## 3. Redesigned Utilization Calculation

### What Changed (MAJOR)
**OLD APPROACH**: Utilization compared each person to their function's baseline (team average).
- Problem: Showed performance vs peers, not actual workload capacity
- Couldn't tell if someone was truly at full capacity or had room for more

**NEW APPROACH**: Utilization based on each person's **own demonstrated capacity**.
- Shows real workload as % of what they CAN handle
- Helps accurately determine if hiring is needed

### New Methodology

#### Step 1: Calculate Individual Peak Capacity
- Analyzes each person's sprint history
- Takes **95th percentile** of their own sprint performance
- This represents what they CAN do when fully loaded
- Example: If someone's 95th percentile is 20 SP/sprint, that's their peak capacity

#### Step 2: Calculate Current Average Workload
- Average story points per sprint in current period
- Example: Currently doing 15 SP/sprint on average

#### Step 3: Calculate Utilization
```
Utilization = (Current Average Workload / Personal Peak Capacity) × 100%
            = (15 / 20) × 100% = 75%
```

### Interpretation Guide

| Utilization | Status | Meaning | Action |
|-------------|--------|---------|--------|
| **< 70%** | ⬇️ Underutilized | Has significant capacity for more work | Can assign more tasks |
| **70-90%** | ✅ Good | Healthy utilization, sustainable | Maintain current load |
| **90-100%** | 🔥 Fully Utilized | Working at peak demonstrated capacity | Monitor closely |
| **> 100%** | ⚠️ OVERLOADED | Exceeding demonstrated capacity | Consider hiring or rebalancing |

### Benefits
- ✅ **Accurate Hiring Decisions**: Know exactly who has capacity and who needs support
- ✅ **Individual-Based**: Everyone compared to their own capability, not team average
- ✅ **Objective**: Based on historical demonstrated performance
- ✅ **Real Workload**: Shows actual workload vs capacity, not performance ranking
- ✅ **Fair**: Junior vs Senior comparison is fair (each compared to own peak)

### Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Baseline** | Function-wide median | Individual's own 95th percentile |
| **Purpose** | Rank performance vs peers | Show real workload capacity |
| **Multiplier** | Applied to baseline | Not used (already in historical data) |
| **>100%** | High performer | Overloaded (unsustainable) |
| **<70%** | Low performer | Has capacity (can take more) |
| **Hiring Decision** | Unclear | Clear: look at overloaded (>100%) |

### Technical Details
- **File**: `src/lib/metrics.ts` - Main calculation in `calculateUtilizationIndex()`
- **Minimum Data**: Requires at least 3 sprints of history per person
- **Flags**: Automatic flagging for "underutilized" (<70%) and "overloaded" (>100%)
- **Logging**: Console logs show utilization status for each person
- **Visualization**: Updated in UtilizationTrendline component for consistency

---

## System Requirements

### CSV File Requirements
Your ticket CSV should now include these columns:
- **Required**: Assignee, Function, Status, Story Points, Type, Project, Created At, Updated At, Subject
- **Optional but Recommended**: 
  - Start Date (for date-based sprint calculation)
  - Due Date / Finish Date / End Date (for date-based sprint calculation)
  - Sprint Created, Sprint Closed (fallback for non-date-based projects)
  - Parent (for feature hierarchy)

### Multiplier CSV Requirements
- **Required Columns**: 
  - Nama or Name
  - Posisi or Position (BE, FE, QA, DESIGNER, PRODUCT, INFRA, etc.)
  - Formula or Multiplier (numeric value, typically 0.6 - 1.5)

### Server Updates
- Server now stores multipliers and sprint configurations
- Data persists across user sessions
- API endpoints updated to handle new data types

---

## How to Get Started

### 1. Upload Multiplier Database
```
1. Login as admin
2. Go to Admin page
3. Upload your multiplier CSV (Nama, Posisi, Formula)
4. Verify the upload was successful
```

### 2. Upload Ticket Data
```
1. Stay on Admin page
2. Upload your ticket CSV
3. System will automatically:
   - Apply multipliers from database
   - Calculate date-based sprints for Orion/Threat Intel/Aman
   - Calculate individual capacity-based utilization
```

### 3. View Dashboard
```
1. Return to main Dashboard
2. Check utilization metrics:
   - Look for people with >100% utilization (need help/hiring)
   - Look for people with <70% utilization (can take more work)
3. Use filters to analyze by project, function, time period
```

---

## Example Scenarios

### Scenario 1: Hiring Decision
**Question**: Do we need to hire more Backend engineers?

**Process**:
1. Filter Dashboard by Function = "BE"
2. Check utilization metrics
3. Find: 3 BE engineers at 95-110% utilization
4. **Decision**: YES, hire 1-2 more BE engineers (current team overloaded)

### Scenario 2: Task Assignment
**Question**: Can we assign the new project to Alice?

**Process**:
1. Search for Alice in Dashboard
2. Check her utilization: 65%
3. **Decision**: YES, Alice has 35% capacity remaining

### Scenario 3: Workload Balancing
**Question**: Why is bug rate high for Bob?

**Process**:
1. Check Bob's utilization: 125% (overloaded)
2. Check quality metrics: High bug rate, high revise rate
3. **Decision**: Reduce Bob's workload to sustainable levels (80-90%)

---

## API Changes

### New Endpoints
- `POST /api/data` - Now accepts `multipliers` and `sprintConfigs` fields
- `GET /api/data` - Now returns `multipliers` and `sprintConfigs` fields

### Request Example
```json
POST /api/data
{
  "tickets": [...],
  "multipliers": [
    { "name": "Alice", "position": "FE", "formula": 1.2 },
    { "name": "Bob", "position": "BE", "formula": 1.0 }
  ],
  "thresholds": {...}
}
```

---

## Files Changed

### New Files
- `src/lib/multiplierManager.ts` - Multiplier database management
- `src/lib/sprintCalculator.ts` - Date-based sprint calculation
- `CHANGES_SUMMARY.md` - This documentation

### Modified Files
- `src/lib/csvParser.ts` - Integrated multiplier lookup and date-based sprints
- `src/lib/metrics.ts` - New individual capacity-based utilization calculation
- `src/pages/Admin.tsx` - Added multiplier upload interface
- `src/pages/Dashboard.tsx` - Integrated multiplier database
- `src/types/openproject.ts` - Added new types (MultiplierEntry, SprintConfig)
- `src/components/Dashboard/UtilizationTrendline.tsx` - Updated to match new calculation
- `server.js` - Added multiplier and sprint config storage

---

## Validation & Testing

### Multiplier Validation
- ✅ Checks for duplicate names
- ✅ Validates multiplier values (0-5 range)
- ✅ Ensures no empty names
- ✅ Shows validation errors in UI

### Sprint Calculation Testing
- ✅ Correctly identifies Orion, Threat Intel, Aman projects
- ✅ Parses various date formats
- ✅ Falls back to CSV sprints for other projects
- ✅ Handles missing dates gracefully

### Utilization Calculation Testing
- ✅ Requires minimum 3 sprints per person
- ✅ Handles edge cases (no data, new joiners)
- ✅ Calculates 95th percentile correctly
- ✅ Flags overloaded and underutilized correctly

---

## Support & Troubleshooting

### Issue: Multipliers not applied
**Solution**: 
1. Check if multiplier CSV was uploaded successfully
2. Verify names in multiplier CSV match names in ticket CSV exactly
3. Re-upload ticket CSV after uploading multipliers

### Issue: Sprints still using CSV values
**Solution**: 
1. Check project name contains "Orion", "Threat Intel", or "Aman"
2. Ensure Start Date or Due Date columns exist in CSV
3. Verify date format is parseable (YYYY-MM-DD recommended)

### Issue: Utilization shows 0% or unrealistic values
**Solution**: 
1. Person needs at least 3 sprints of history
2. Check if tickets have valid Sprint Closed values
3. Verify tickets are marked as "Closed" status

---

## Future Enhancements (Potential)

1. **Sprint Configuration Upload**: Allow admins to upload sprint period configurations
2. **Capacity Planning**: Predictive capacity planning based on upcoming sprints
3. **Multiplier Management UI**: Edit multipliers directly in UI without CSV upload
4. **Historical Tracking**: Track utilization changes over time
5. **Alerts**: Automatic alerts when someone exceeds 100% utilization

---

## Contact & Feedback

For questions or issues with these new features, please contact the development team or refer to the README.md file.

**Last Updated**: December 2024

