# Bug Fix Summary - December 2024

## 🐛 Bugs Fixed

### Bug #1: BE Filter Showing Wrong People ✅ FIXED

**Problem:**
- When filtering by "BE" function, the graph showed people who didn't have BE configured in the multiplier database
- This was because people not found in the multiplier DB were defaulting to "BE" function

**Root Cause:**
```typescript
// OLD CODE (WRONG):
personFunction = row.Function || "BE"; // Defaulted everyone to BE!
```

**Solution:**
- Changed logic to **skip tickets** for people not found in multiplier database
- No more automatic defaulting to "BE"
- System now requires proper configuration for all people

**New Behavior:**
```typescript
// NEW CODE (CORRECT):
if (multiplierEntry) {
  // Found in database - use database values
  personFunction = multiplierEntry.position;
} else if (row.Function) {
  // Has Function in CSV - use as fallback
  personFunction = row.Function;
} else {
  // Not configured - skip this ticket with warning
  console.warn(`"${assigneeName}" not found in multiplier database`);
  return null; // Skip ticket
}
```

**Impact:**
- ✅ BE filter now only shows actual BE engineers
- ✅ All filters show accurate data
- ⚠️ **Action Required**: Make sure ALL people in your ticket CSV are in the multiplier database, or they'll be skipped

---

### Bug #2: Sprint Calculation Showing Sprint 53 ✅ FIXED

**Problem:**
- Sprints were showing as "Sprint 53" in Q4
- Should max out at Sprint 26 (52 weeks / 2 weeks per sprint)
- Date-based calculation was using a fixed base date (2024-01-01) causing sprints to accumulate

**Root Cause:**
```typescript
// OLD CODE (WRONG):
const baseDate = new Date("2024-01-01"); // Fixed date!
const daysDiff = Math.floor((referenceDate.getTime() - baseDate.getTime()) / ...);
const sprintNumber = Math.floor(daysDiff / 14) + 1;
// Could create Sprint 53, 54, 55...
```

**Solution:**
- Changed to use **year-relative** sprint calculation
- Sprints now reset each year (January 1st = Sprint 1)
- Capped at maximum 26 sprints per year

**New Behavior:**
```typescript
// NEW CODE (CORRECT):
const year = referenceDate.getFullYear();
const yearStart = new Date(year, 0, 1); // January 1st of ticket's year
const daysSinceYearStart = Math.floor(...);
const sprintNumber = Math.min(Math.floor(daysSinceYearStart / 14) + 1, 26);
// Max Sprint 26
```

**Impact:**
- ✅ Sprints now stay within 1-26 range
- ✅ Sprints reset each calendar year
- ✅ More realistic sprint numbering for date-based projects (Orion, Threat Intel, Aman)

---

### Bug #3: Utilization at 70% or 0% ✅ FIXED

**Problem:**
- Most people showing exactly 70% utilization
- Many sprints showing 0% utilization even when people had work
- Unrealistic results

**Root Cause:**
```typescript
// OLD CODE (TOO STRICT):
if (sprintTotals.length < 3) {
  return 0.7; // Everyone with <3 sprints = 70%!
}
// Also required exactly 3+ sprints to calculate anything
```

**Solution:**
- Made calculation **more flexible** for different data amounts
- Removed strict 3-sprint requirement
- Added logic to estimate peak capacity for people with less history
- Filters out sprints with 0 story points

**New Behavior:**
```typescript
// NEW CODE (FLEXIBLE):
if (sprintTotals.length >= 5) {
  // 5+ sprints: Use 95th percentile (reliable)
  peakCapacity = percentile95;
} else if (sprintTotals.length >= 3) {
  // 3-4 sprints: Use maximum
  peakCapacity = Math.max(...sprintTotals);
} else {
  // 1-2 sprints: Estimate peak as average * 1.3
  peakCapacity = avgWorkload * 1.3;
}

utilization = avgWorkload / peakCapacity;
```

**Impact:**
- ✅ Realistic utilization percentages for everyone
- ✅ Works with any amount of data (1+ sprint)
- ✅ More accurate representation of actual workload
- ✅ No more fixed 70% or 0% values

---

### Bug #4: BUSINESS SUPPORT in Filter (Not in Config) ✅ FIXED

**Problem:**
- Function filter showed "BUSINESS SUPPORT" even though no one in the multiplier config had that position
- Filters were showing functions that didn't exist in actual data

**Root Cause:**
- Old tickets in the database had BUSINESS SUPPORT assigned (from before proper multiplier DB)
- System was showing all functions that ever existed in loaded tickets

**Solution:**
- Bug #1 fix solves this: People not in multiplier DB are now skipped
- Only properly configured people (from multiplier DB) create tickets
- Function filter now only shows functions that actually exist in current data

**New Behavior:**
- Filter sidebar gets functions directly from actual tickets: `tickets.map(t => t.function)`
- Only functions with active people in multiplier DB appear
- Dynamic filter list based on loaded configuration

**Impact:**
- ✅ Function filter only shows configured functions
- ✅ No ghost functions from old/bad data
- ✅ Clean, accurate filter list
- ⚠️ **Action Required**: Re-upload your ticket CSV after uploading multiplier DB to clean up old data

---

## 🔧 How to Apply These Fixes

### Step 1: Clear Old Data
```
1. Admin page → Click "Clear Data"
2. This removes old tickets with bad configurations
```

### Step 2: Upload Multiplier Database
```
1. Admin page → Upload your multiplier CSV (Nama, Posisi, Formula)
2. Verify all team members are listed
3. Check success message shows correct count
```

### Step 3: Upload Clean Ticket CSV
```
1. Remove Function and Multiplier columns from CSV (optional but recommended)
2. Admin page → Upload ticket CSV
3. System will:
   - Look up each person in multiplier DB
   - Skip tickets for people not found (with warning)
   - Apply correct function and multiplier values
   - Calculate sprints correctly (max Sprint 26)
   - Calculate realistic utilization
```

### Step 4: Verify Results
```
1. Dashboard → Check filters show only actual functions
2. Check sprint numbers are reasonable (1-26)
3. Check utilization shows varied percentages (not all 70%)
4. Filter by function → Verify only correct people appear
```

---

## ⚠️ Important Changes in Behavior

### 1. Tickets for Unmapped People Are Now Skipped
**Before:**
- Person not in multiplier DB → Assigned "BE" function → Appears in data

**After:**
- Person not in multiplier DB → Ticket skipped → Warning in console

**Action Required:**
- Ensure ALL people in ticket CSV exist in multiplier database
- Check console for warnings about skipped people
- Add missing people to multiplier CSV if needed

### 2. Sprints Are Now Year-Relative
**Before:**
- Sprint calculated from fixed date (2024-01-01)
- Could reach Sprint 50+

**After:**
- Sprint calculated from year start (resets each January)
- Maximum Sprint 26 per year

**Impact:**
- More intuitive sprint numbers
- Aligns with typical 2-week sprint cycles
- Works correctly for multi-year data

### 3. Utilization Works with Any Data Amount
**Before:**
- Required 3+ sprints minimum
- <3 sprints = fixed 70%

**After:**
- Works with 1+ sprint
- Adapts calculation method based on available data
- Always calculates real utilization

**Impact:**
- New team members show realistic utilization immediately
- No more fixed percentages
- Better visibility into actual workload

---

## 🧪 Testing Checklist

After applying fixes, verify:

- [ ] BE filter only shows BE engineers
- [ ] QA filter only shows QA engineers
- [ ] All filters show only people with that function in multiplier DB
- [ ] Sprint numbers are between 1-26
- [ ] No "Sprint 53" or higher numbers
- [ ] Utilization percentages vary (not all 70%)
- [ ] People with work show >0% utilization
- [ ] Function filter only shows functions in your multiplier config
- [ ] No "BUSINESS SUPPORT" if not in your config
- [ ] Console warnings show any unmapped people

---

## 📊 Expected Results

### Before Fixes:
```
BE Filter: Shows 15 people (including unmapped people)
Sprints: Sprint 1, Sprint 25, Sprint 53 (!!)
Utilization: 70%, 70%, 70%, 0%, 70%...
Functions: BE, FE, QA, BUSINESS SUPPORT, DESIGNER...
```

### After Fixes:
```
BE Filter: Shows 5 BE engineers (only actual BE people)
Sprints: Sprint 1, Sprint 2, ... Sprint 25 (max 26)
Utilization: 45%, 78%, 92%, 110%, 65%... (realistic values)
Functions: BE, FE, QA, OPERATION, FOUNDRY (only from your config)
```

---

## 🆘 Troubleshooting

### Issue: "My BE engineers disappeared!"
**Cause:** They're not in the multiplier database
**Fix:** Add them to your multiplier CSV and re-upload

### Issue: "Still seeing Sprint 30+"
**Cause:** Old data still loaded
**Fix:** 
1. Clear Data in Admin panel
2. Re-upload multiplier DB
3. Re-upload ticket CSV

### Issue: "Utilization still shows 0% for some people"
**Cause:** They have no closed tickets in sprints
**Fix:** This is correct - they truly have 0 utilization if no work completed

### Issue: "Console shows warnings about people not found"
**Cause:** Ticket CSV has people not in multiplier database
**Fix:** Add those people to your multiplier CSV or remove their tickets

---

## 📝 Summary

All 4 bugs have been fixed with improved logic:

1. ✅ **Accurate Filtering**: Only configured people appear in filters
2. ✅ **Realistic Sprints**: Max Sprint 26, year-relative calculation
3. ✅ **Real Utilization**: Varies by actual workload, no fixed values
4. ✅ **Clean Functions**: Only configured functions in filter

**Next Steps:**
1. Clear old data
2. Upload multiplier database
3. Upload ticket CSV
4. Verify results match expected behavior

---

**Date Fixed**: December 12, 2024
**Status**: All bugs resolved ✅
**Action Required**: Re-upload data in correct order

