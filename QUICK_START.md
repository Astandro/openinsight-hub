# Quick Start Guide - New Features

## 🚀 Getting Started with the New TeamLight Features

### Prerequisites
- Admin access to TeamLight
- Your team's ticket data CSV
- Multiplier data for your team members

---

## Step-by-Step Setup

### 1️⃣ Prepare Your Multiplier File

Create a CSV file with 3 columns based on the image you provided:

```csv
Nama,Posisi,Formula
Yoga Nasution,QA,1
Firman Maulana,QA,0.9
Panca Rizki Perkasa,OPERATION,1
```

**Tips:**
- ✅ Use exact names as they appear in your ticket system
- ✅ Position can be: BE, FE, QA, DESIGNER, PRODUCT, INFRA, OPERATION, FOUNDRY, UX WRITER, RESEARCHER, APPS
- ✅ Formula values typically range from 0.6 (Principal) to 1.2 (Junior)
- ✅ See `multiplier_template.csv` for a complete example

### 2️⃣ Login and Access Admin Panel

1. Open TeamLight in your browser
2. Login with admin credentials
3. Click **"Admin"** button in the top right corner

### 3️⃣ Upload Multiplier Database

1. In Admin panel, find **"Multiplier Database"** section
2. Click **"Upload Multiplier CSV"**
3. Select your prepared multiplier file
4. Wait for success message: "🎉 Successfully uploaded X multiplier entries"
5. Verify entries appear in the status box below

### 4️⃣ Upload Your Ticket Data

1. In the **"Data Management"** section
2. Click **"Upload CSV File"**
3. Select your ticket export CSV
4. System will automatically:
   - Apply multipliers from your uploaded database
   - Calculate date-based sprints for Orion, Threat Intel, and Aman
   - Calculate individual capacity-based utilization
5. Wait for success message

### 5️⃣ View Your Dashboard

1. Click **"Back to Dashboard"** in the header
2. You'll now see:
   - ✅ Updated utilization metrics (based on individual capacity)
   - ✅ Accurate sprint assignments for main products
   - ✅ Applied multipliers for all team members

---

## 📊 Understanding the New Utilization Metrics

### What the Numbers Mean

| Your Screen Shows | What It Means | What To Do |
|-------------------|---------------|------------|
| **Alice: 65%** | Alice is working at 65% of her demonstrated capacity | Can assign 35% more work |
| **Bob: 95%** | Bob is fully utilized at his peak capacity | Monitor closely, don't overload |
| **Charlie: 110%** | Charlie is working beyond sustainable capacity | **URGENT**: Reduce workload or hire help |
| **Diana: 45%** | Diana has significant spare capacity | Can assign much more work |

### Key Indicators

**🟢 Green Zone (70-90%)**: Healthy, sustainable workload
- Team member is productive but not overworked
- This is the ideal range

**🟡 Yellow Zone (90-100%)**: Fully utilized
- Working at peak demonstrated capacity
- Monitor for signs of stress or quality issues
- Consider this when planning new projects

**🔴 Red Zone (>100%)**: OVERLOADED
- **Immediate action required**
- Person is working beyond their demonstrated sustainable capacity
- High risk of burnout, quality issues, or delays
- **Decision Point**: Hire additional staff or rebalance work

**⚪ White Zone (<70%)**: Underutilized
- Has capacity for additional work
- Can take on new projects or tasks
- Good candidates for mentoring or cross-training

---

## 🎯 Making Hiring Decisions

### Question: "Should we hire more engineers?"

**Old Way (Unclear)**:
- Look at team velocity
- Guess if team is overworked
- Hard to justify hiring

**New Way (Data-Driven)**:
```
1. Filter by Function (e.g., "BE" for Backend)
2. Check utilization for each person:
   - John: 105% ⚠️ Overloaded
   - Mary: 98% 🔥 Fully utilized
   - Steve: 102% ⚠️ Overloaded
   - Lisa: 92% ✅ Good

3. Calculate team status:
   - 2 people overloaded (>100%)
   - 1 person at max capacity
   - 1 person in healthy range
   
4. Decision: HIRE 1-2 more Backend engineers
   - Current team cannot sustain current workload
   - Data shows clear capacity shortage
```

---

## 🔍 Date-Based Sprint Calculation

### For Orion, Threat Intel, and Aman Projects

**Automatic**: No configuration needed!

The system now automatically:
1. Detects if project is Orion, Threat Intel, or Aman
2. Looks for "Start Date" and "Due Date" in your CSV
3. Calculates which sprint the work falls into based on dates
4. Other projects continue using CSV sprint values

**Benefits**:
- ✅ More accurate sprint assignment
- ✅ Reflects actual work timing
- ✅ Better for sprint planning and retrospectives

---

## 🔧 Troubleshooting

### "Multipliers not being applied"
**Fix:**
1. Make sure names in multiplier CSV exactly match ticket CSV
2. Upload multiplier CSV BEFORE uploading ticket CSV
3. Re-upload ticket CSV if you upload multipliers later

### "Utilization shows 0% for some people"
**Cause:** Person has less than 3 sprints of history
**Fix:** This is expected for new team members - they'll show accurate utilization after 3+ sprints

### "Sprint still wrong for Orion project"
**Check:**
1. Project name in CSV contains "Orion" (case insensitive)
2. CSV has "Start Date" or "Due Date" columns
3. Dates are in valid format (YYYY-MM-DD recommended)

### "Can't access Admin page"
**Fix:** You need admin role - contact system administrator

---

## 💡 Best Practices

### 1. Regular Multiplier Updates
- Review multiplier values quarterly
- Update when people get promoted or change roles
- Keep multiplier file version controlled

### 2. Weekly Utilization Review
- Check dashboard weekly
- Identify overloaded team members early
- Rebalance work before it becomes critical

### 3. Hiring Planning
- Use utilization data in quarterly planning
- If >50% of team is >90% utilized, plan to hire
- Budget for hiring when you see sustained overload

### 4. Data Quality
- Ensure ticket data is up-to-date
- Verify sprint assignments are correct
- Check that story points are estimated consistently

---

## 📝 Example Multiplier Values

Based on your uploaded image, here are typical ranges:

| Seniority Level | Typical Formula | Meaning |
|----------------|----------------|---------|
| **Principal/Staff** | 0.6 - 0.8 | Lower multiplier = higher productivity expected |
| **Senior** | 0.9 - 1.0 | Standard baseline |
| **Mid-level** | 1.0 - 1.1 | Slightly adjusted for experience |
| **Junior** | 1.2 - 1.5 | Higher multiplier = still learning |

**Note:** The multiplier adjusts expectations but doesn't affect the NEW utilization calculation, which is based on each person's own demonstrated capacity regardless of seniority.

---

## 📞 Need Help?

1. **Check Documentation**: See `CHANGES_SUMMARY.md` for detailed technical information
2. **Sample Files**: Use `multiplier_template.csv` as a reference
3. **Console Logs**: Open browser console (F12) to see detailed calculation logs
4. **Contact Support**: Reach out to your system administrator

---

## 🎉 You're All Set!

Your TeamLight system is now configured with:
- ✅ Multiplier database for accurate capacity modeling
- ✅ Date-based sprint calculation for main products
- ✅ Individual capacity-based utilization for hiring decisions

Start making data-driven decisions about your team's workload and hiring needs!

**Last Updated**: December 2024

