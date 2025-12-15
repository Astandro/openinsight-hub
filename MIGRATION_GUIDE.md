# Migration Guide - CSV Format Changes

## 🔄 What Changed

The ticket CSV file **no longer requires Function and Multiplier columns**. These values are now looked up from the **Multiplier Database** that you upload separately.

---

## ✅ New Workflow

### Before (Old Way)
```csv
Assignee,Function,Multiplier,Status,Story Points,...
Alice Johnson,FE,1.2,Closed,5,...
Bob Smith,BE,1.0,Closed,8,...
```
- Function and Multiplier in every row
- Hard to update multipliers (need to re-upload all data)
- Error-prone (typos, inconsistencies)

### After (New Way)

**Step 1: Upload Multiplier Database** (one time)
```csv
Nama,Posisi,Formula
Alice Johnson,FE,1.2
Bob Smith,BE,1.0
```

**Step 2: Upload Ticket CSV** (Function/Multiplier columns removed)
```csv
Assignee,Status,Story Points,Type,Project,...
Alice Johnson,Closed,5,User Story,Orion,...
Bob Smith,Closed,8,Feature,Threat Intel,...
```

- Function and Multiplier automatically looked up by name
- Easy to update multipliers without touching ticket data
- Single source of truth for team configuration

---

## 📋 How to Migrate Your CSV

### Option 1: Remove Columns (Recommended)

1. **Extract Multiplier Data First**
   ```
   Open your existing CSV
   Copy columns: Assignee, Function, Multiplier
   Create new file: multiplier_config.csv
   Rename columns: Nama, Posisi, Formula
   Remove duplicates (keep one row per person)
   ```

2. **Clean Your Ticket CSV**
   ```
   Open your ticket CSV
   Delete the "Function" column
   Delete the "Multiplier" column
   Save the file
   ```

3. **Upload in Order**
   ```
   1. Admin page → Upload multiplier_config.csv
   2. Admin page → Upload cleaned ticket CSV
   ```

### Option 2: Keep Columns (Backward Compatible)

If you want to keep Function/Multiplier columns in your CSV:
- ✅ They will be used as **fallback** if person not found in database
- ✅ Database values take priority over CSV columns
- ⚠️ Redundant - better to remove them for cleaner data

---

## 🔍 Required CSV Columns (Updated)

### Ticket CSV - Required Columns

| Column | Required | Description |
|--------|----------|-------------|
| **Assignee** | ✅ Yes | Person's name (must match Multiplier DB) |
| **Status** | ✅ Yes | Ticket status (Closed, Open, etc.) |
| **Story Points** | ✅ Yes | Story point value |
| **Type** | ✅ Yes | Ticket type (Feature, Bug, etc.) |
| **Project** | ✅ Yes | Project name |
| **Sprint Closed** | ✅ Yes | Sprint when closed |
| **Created At** | ✅ Yes | Creation date |
| **Updated At** | ✅ Yes | Last update date |
| **Subject** | ✅ Yes | Ticket title/subject |
| ~~Function~~ | ❌ No longer needed | Looked up from Multiplier DB |
| ~~Multiplier~~ | ❌ No longer needed | Looked up from Multiplier DB |

### Optional Columns (Recommended)
- **Start Date** - For date-based sprint calculation
- **Due Date** / **Finish Date** / **End Date** - For date-based sprint calculation
- **Sprint Created** - Sprint when created
- **Parent** - Parent feature ID

---

## 🚨 Important Notes

### 1. Upload Order Matters
```
✅ CORRECT:
   1. Upload Multiplier Database first
   2. Then upload Ticket CSV

❌ WRONG:
   1. Upload Ticket CSV first
   2. Then upload Multiplier Database
   Result: All people default to BE/1.0
```

### 2. Name Matching is Critical
- Names in ticket CSV must **exactly match** names in multiplier database
- Case-insensitive matching (Alice = alice)
- Leading/trailing spaces are trimmed
- Example:
  ```
  ✅ MATCH:
     CSV: "Alice Johnson"
     DB:  "Alice Johnson"
  
  ❌ NO MATCH:
     CSV: "Alice  Johnson" (double space)
     DB:  "Alice Johnson"
  ```

### 3. Fallback Behavior
If person not found in Multiplier Database:
- **Function**: Defaults to "BE" (Backend)
- **Multiplier**: Defaults to 1.0
- ⚠️ System shows warning in Admin panel

### 4. Updating Multipliers
To update someone's multiplier:
1. Edit your multiplier CSV file
2. Re-upload multiplier CSV in Admin panel
3. No need to re-upload ticket data! ✅

---

## 📝 Example Migration

### Your Old CSV (Combined)
```csv
Assignee,Function,Multiplier,Status,Story Points,Type,Project,Subject
Yoga Nasution,QA,1,Closed,5,User Story,Orion,Login feature
Firman Maulana,QA,0.9,Closed,3,Bug,Orion,Fix login bug
```

### Step 1: Create Multiplier DB
Extract unique people:
```csv
Nama,Posisi,Formula
Yoga Nasution,QA,1
Firman Maulana,QA,0.9
```
Save as: `team_multipliers.csv`

### Step 2: Clean Ticket CSV
Remove Function and Multiplier columns:
```csv
Assignee,Status,Story Points,Type,Project,Subject
Yoga Nasution,Closed,5,User Story,Orion,Login feature
Firman Maulana,Closed,3,Bug,Orion,Fix login bug
```
Save as: `tickets_clean.csv`

### Step 3: Upload in Order
1. Admin → Upload `team_multipliers.csv`
   - See: "🎉 Successfully uploaded 2 multiplier entries"
2. Admin → Upload `tickets_clean.csv`
   - See: "🎉 Successfully uploaded 2 tickets"
   - Function and Multiplier automatically applied!

---

## ❓ FAQ

**Q: Do I have to remove Function/Multiplier columns?**
A: No, but it's recommended. If you keep them, database values take priority.

**Q: What if someone in my ticket CSV is not in the multiplier database?**
A: They'll default to Function=BE, Multiplier=1.0. You'll see a warning in the Admin panel.

**Q: Can I update multipliers without re-uploading tickets?**
A: Yes! Just upload a new multiplier CSV. Existing tickets will automatically use the new values on next calculation.

**Q: What if I have typos in names?**
A: Database lookup is case-insensitive but spelling must match. Fix typos in either CSV or database file.

**Q: Do I need to upload multipliers every time?**
A: No! Multipliers are stored on the server. Only re-upload when you need to make changes.

**Q: Where is the data stored?**
A: Server-side in-memory storage (persists across user sessions, but not server restarts).

---

## 🔧 Troubleshooting

### Issue: "Filters don't show any functions"
**Solution**: Make sure you uploaded the multiplier database first, then re-upload your ticket CSV.

### Issue: "Everyone shows as 'BE' function"
**Solution**: 
1. Check multiplier CSV was uploaded successfully
2. Verify names match exactly between ticket CSV and multiplier CSV
3. Re-upload ticket CSV after multiplier CSV

### Issue: "Some people have wrong multipliers"
**Solution**:
1. Check spelling of names in multiplier CSV
2. Look for extra spaces or special characters
3. Download and review uploaded multiplier database in Admin panel

### Issue: "Warning: No multiplier database"
**Solution**: Upload multiplier CSV before uploading ticket CSV

---

## 📊 Benefits of New Approach

| Benefit | Description |
|---------|-------------|
| 🎯 **Single Source of Truth** | One place to manage all team configurations |
| 🔄 **Easy Updates** | Change multipliers without re-uploading tickets |
| 📉 **Smaller Files** | Ticket CSV is now smaller (no redundant columns) |
| ✅ **Data Quality** | No inconsistencies or typos in Function/Multiplier |
| 🚀 **Flexibility** | Add new team members in one place |
| 💾 **Centralized** | Team config separate from transactional data |

---

## 🎯 Next Steps

1. ✅ Read this migration guide
2. ✅ Extract multiplier data from your current CSV
3. ✅ Create multiplier CSV file (Nama, Posisi, Formula)
4. ✅ Remove Function and Multiplier columns from ticket CSV
5. ✅ Upload multiplier CSV in Admin panel (Step 1)
6. ✅ Upload cleaned ticket CSV in Admin panel (Step 2)
7. ✅ Verify filters and calculations work correctly
8. ✅ Bookmark multiplier CSV for future updates

---

## 📚 Related Documentation

- **QUICK_START.md** - Step-by-step setup guide
- **CHANGES_SUMMARY.md** - Complete list of all changes
- **multiplier_template.csv** - Example multiplier file

---

**Last Updated**: December 2024
**Version**: 2.0

