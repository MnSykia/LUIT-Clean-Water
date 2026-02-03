# LUIT Clean Water - END-TO-END SYSTEM ANALYSIS
## Hackathon Pitch Slide Reference

---

## 1️⃣ HOW USERS REPORT WATER ISSUES

### **Two Reporting Channels (Both Create Same Database Record):**

#### **Channel A: Direct Web Reporting** 🌐
- **Entry Point:** ReportingPage.jsx form
- **Required Fields:**
  - Water Problem (dropdown: Muddy water, Metallic taste, Reddish brown, Pungent smell, Health symptom)
  - Water Source (dropdown: Handpump, Tube well, Piped water, Dug well, River, Ponds)
  - PIN Code (text input)
  - Locality Name (text input)
  - District (dropdown: 23 Assam districts)
  - Description (optional)
- **Submission:** `POST /api/reporting/submit-report`
- **Result:** Report created with `status: 'reported'` and `active: true`

#### **Channel B: Offline SMS Reporting** 📱
- **Entry Point:** SMS section in ReportingPage.jsx
- **Workflow:**
  1. User fills form → clicks "Generate SMS Format"
  2. System generates 2 versions:
     - **Compact:** `WQ|781014|Health symptoms|Tube well|Description`
     - **Full:** Multi-line structured format
  3. User copies text offline (saves to Notes app)
  4. **When online:** Pastes SMS in "Submit SMS Report" section
  5. Submission: `POST /api/reporting/sms/parse`
- **Parsing:** Supports both compact and structured formats
- **Result:** Identical database record as web reports

---

## 2️⃣ DATA FLOW THROUGH BACKEND

### **Database Schema (Firebase Firestore):**

```
water_quality_reports collection:
├─ pinCode: "781014"
├─ sourceType: "Tube well"
├─ problem: "Health symptoms"
├─ localityName: "Guwahati"
├─ district: "Kamrup Metropolitan"
├─ status: "reported" → "contaminated" → "cleaned"
├─ active: true (boolean toggle)
├─ reportedAt: ISO timestamp
├─ reportedBy: "Anonymous" | "SMS" | user email
├─ description: user notes
├─ upvotes: 0 (counter)
└─ verified: false
```

### **Step 1: Report Reception & Storage**
- Web/SMS submission → Parsed into standard format
- Stored in `water_quality_reports` collection
- **Key Property:** `status: 'reported'` (not immediately "contaminated")

### **Step 2: PHC Operator Discovery**
- PHC Dashboard fetches: `GET /api/phc/active-reports/<district>`
- Filters: Reports where `status IN ['reported', 'contaminated']` AND `active === true`
- **Automatic Grouping:** By PIN code
- **Severity Calculation:**
  - Count ≥ 20 reports = **SEVERE** 🔴
  - Count 10-19 = **MEDIUM** 🟡
  - Count 5-9 = **MILD** 🟢
  - Count < 5 = No "Send to Lab" button (disabled)

### **Step 3: PHC Sends to Lab**
- PHC operator clicks "Send to Testing Lab (5 reports)"
- Modal captures:
  - All grouped report IDs
  - PIN code, locality, district
  - PHC description of issue
  - **PHC's current GPS coordinates** (geolocation.getCurrentPosition)
- Submission: `POST /api/phc/send-to-lab`
- **Backend Actions:**
  - ✅ All reports status changed: `'reported'` → `'contaminated'`
  - ✅ New document created: `lab_assignments` collection with `status: 'pending_lab_visit'`
  - ✅ GPS coordinates stored: `latitude` (float), `longitude` (float)

### **Step 4: Lab Receives Assignment**
- Lab Dashboard fetches: `GET /api/lab/assignments?district=<district>`
- Queries `lab_assignments` collection filtered by district
- Shows: PIN code, report count, severity, PHC description

---

## 3️⃣ RULE-BASED LOGIC & ALERT TRIGGERS

### **Severity Calculation (PIN-Based Aggregation)**
```
Reports per PIN Code → Severity Level:
├─ 1-4 reports     → No escalation (button disabled)
├─ 5-9 reports     → MILD (🟢 button enabled)
├─ 10-19 reports   → MEDIUM (🟡 button enabled)
└─ ≥20 reports     → SEVERE (🔴 button enabled)
```

**Implementation:** PHCDashboard.jsx `fetchActiveReports()` loop:
```javascript
if (count >= 20) severity = 'severe'
else if (count >= 10) severity = 'medium'
else if (count >= 5) severity = 'mild'
```

### **Status State Machine (Implemented)**
```
REPORTED
   ↓ (PHC sends to lab)
CONTAMINATED
   ↓ (Lab uploads solution)
[AWAITING VERIFICATION]
   ↓ (Lab confirms clean)
CLEANED
```

### **Contamination Alert Trigger**
- **When:** Report status changes to `'contaminated'`
- **Where:** Generated via `GET /api/phc/contaminated-areas`
- **Data returned:** All `lab_assignments` documents with latitude/longitude
- **Alert shown on:** LandingPage (public-facing map)

### **Distance-Based Alert Filtering**
- **Calculation:** Haversine formula (2 separate implementations):
  - Backend: `phc_operations.py` (for map data)
  - Frontend: `LandingPage.jsx` (for user proximity)
- **Formula:** `distance = 2 * R * asin(sqrt(sin²(dlat/2) + cos(lat1)*cos(lat2)*sin²(dlon/2)))`
  - R = 6371 km (Earth radius)
- **Threshold:** 2 km radius
- **Logic:** 
  ```javascript
  IF user_location && distance(user, contaminated_pin) <= 2km
    → Show contamination warning card
  ```

### **Auto-Refresh Mechanism**
- Frontend: Contaminated areas auto-refresh every 30 seconds
- Frontend: Sent-to-lab PINs auto-refresh every 30 seconds
- Ensures users see latest alerts without manual refresh

---

## 4️⃣ HOW ALERTS & GUIDANCE ARE DELIVERED

### **To Public Users (LandingPage.jsx)**

#### **Contamination Alert Card:**
```
When within 2km radius:
┌────────────────────────┐
│ 🔴 Water Contamination │
│ PIN: 781014            │
│ Location: Guwahati     │
│ 5 Reports | MILD       │
│ ⚠️ Avoid this area     │
└────────────────────────┘
```
- **Retrieval:** `GET /api/phc/contaminated-areas`
- **Filtering:** Client-side Haversine calculation
- **Display:** Only if user permits geolocation
- **Fallback:** "Location permission denied" message shown

#### **Recent Reported Issues:**
```
Non-contaminated reports displayed as:
- Problem type
- Locality name
- Report count (upvotes)
```

#### **Statistics Dashboard:**
```
Total Reports | Active Reports | Cleaned Areas
(district-level aggregation)
```

### **To PHC Operators (PHCDashboard.jsx)**

#### **Active Reports Tab:**
- Grouped by PIN code
- Shows severity badge (MILD/MEDIUM/SEVERE)
- "Send to Testing Lab" button (enabled if count ≥ 5)
- Button **disabled** if PIN already sent (tracked in `sentToLabPins` array)

#### **Hotspots Tab:**
- Interactive Leaflet map showing:
  - 🔴 **Red markers** = Contaminated areas (auto-updated)
  - 🟢 **Green markers** = Clean areas
  - 📍 **Blue marker** = PHC's current location
- Auto-refresh: Every 30 seconds
- Click markers for popup with details

#### **Solutions Tab:**
- Shows solutions received from labs
- Displays solution PDFs/documents
- PHC can implement solution and mark area as cleaned

### **To Lab Users (LabDashboard - Not yet built)**
- Receives assignments with:
  - PIN code grouping
  - Report count & severity
  - PHC description
  - Embedded map with PHC location
- Can upload test results: `POST /api/lab/upload-test-result/<id>`
- Can upload solutions: `POST /api/lab/upload-solution/<id>`
- Can confirm clean: `POST /api/lab/confirm-clean/<id>`

---

## 5️⃣ HOW ACTIONS & UPDATES ARE TRACKED

### **Report Status Tracking** 📊

#### **Status Transitions Implemented:**
```
1. REPORTED 
   └─ Initial submission (web or SMS)
   
2. CONTAMINATED 
   └─ When PHC sends to lab
   └─ Coordinates captured here
   └─ Alerts triggered
   
3. CLEANED 
   └─ When lab confirms (NOT implemented in UI yet)
   └─ Report deactivated: active: false
```

#### **Active Flag Toggle:**
- `active: true` = Report visible in PHC dashboard
- `active: false` = Report hidden (status: 'cleaned')
- Filters applied: `where status IN ['reported','contaminated'] AND active=true`

### **Tracking Data Points Stored:**

For each report:
- **When created:** `reportedAt` (ISO timestamp)
- **Who reported:** `reportedBy` (Anonymous/SMS/email)
- **PHC submission time:** When status changes to 'contaminated'
- **Lab assignment record:** Separate `lab_assignments` doc created with:
  - `createdAt` (assignment timestamp)
  - `phcSubmittedAt` (when PHC sent)
  - All report IDs linked
  - Status tracking: pending_lab_visit → solution_uploaded → cleaned

### **Update Mechanisms**

#### **Frontend Polling (Auto-Refresh):**
- PHC Dashboard:
  - Hotspots: Every 30 seconds
  - Sent-to-lab PINs: Every 30 seconds
- Landing Page:
  - Contaminated areas: Every 30 seconds

#### **Backend Updates:**
- Report status: `firebase_service.update_report_status(report_id, 'contaminated')`
- Lab assignment: Firestore `.update()` method

#### **User Interaction Tracking:**
- **Upvotes:** `POST /api/reporting/upvote/<report_id>` increments counter
- **Button state:** `sentToLabPins` array tracks which PINs sent to lab
  - Button remains disabled on refresh (fetched from backend)
  - Auto-refresh maintains accurate state

### **Data Visibility & Querying**

#### **By District:**
```
PHC Dashboard: Filtered to their district only
Lab Dashboard: Filtered to their district only
Public Landing Page: All districts (location-based filtering applied)
```

#### **Real-time Updates:**
```
Frontend polls every 30 seconds:
- GETs latest contaminated areas
- GETs latest sent-to-lab PINs
- GETs latest hotspot map
- Prevents stale UI state
```

#### **User Authentication Context:**
- `localStorage.get('email')` for PHC/Lab identification
- `localStorage.get('district')` for filtering

---

## 📋 SUMMARY: THE COMPLETE FLOW

```
PUBLIC USER
    ↓ Reports issue (web/SMS)
    ↓
FIRESTORE: water_quality_reports (status: 'reported', active: true)
    ↓
PHC OPERATOR
    ↓ Sees in dashboard (grouped by PIN, severity calculated)
    ↓ Clicks "Send to Lab" if count ≥ 5
    ↓
FIRESTORE: 
  - status → 'contaminated'
  - lab_assignments created (coordinates saved)
    ↓
PUBLIC LANDING PAGE
    ↓ Shows 2km radius alerts (Haversine distance)
    ↓
LAB OPERATOR
    ↓ Receives assignment, uploads solution
    ↓
FIRESTORE: Lab solution stored
    ↓
PHC OPERATOR
    ↓ Implements solution, clicks "Mark Clean"
    ↓
FIRESTORE: status → 'cleaned', active: false
    ↓
SYSTEM: Report hidden, alerts disappear
```

---

## 🔧 IMPLEMENTATION NOTES FOR PRESENTERS

### **What IS Implemented:**
✅ Report submission (2 channels)
✅ PIN-based grouping & severity calculation
✅ Status tracking (reported → contaminated)
✅ Contamination alerts (2km radius, auto-refresh)
✅ PHC dashboard with hotspot map
✅ Send-to-lab workflow with coordinates
✅ SMS parsing (2 formats)
✅ Distance calculation (Haversine)
✅ Database state machine
✅ Frontend state management (sentToLabPins, hotspots)

### **What IS NOT Implemented (Don't Mention):**
❌ Lab dashboard UI (endpoints exist, UI missing)
❌ Lab solution upload UI
❌ Mark-clean confirmation UI
❌ Real SMS provider (manual mode only: copy/paste)
❌ Lab test result PDF handling
❌ Email/SMS notifications to users
❌ Analytics/reporting dashboards
❌ Role-based access control beyond localStorage

### **Key Numbers for Pitch:**
- **23 Assam districts** supported
- **5 water problem types** tracked
- **6 water source types** supported
- **5-report minimum** for lab escalation
- **2 km radius** for contamination alerts
- **30-second auto-refresh** for real-time updates
- **50+ PIN codes** in database
- **2 SMS formats** (compact + structured)

---

## 🎯 ONE-SLIDE SUMMARY

**LUIT Clean Water operates as a PIN-code-based contamination escalation system:**

1. **Public reports issues** via web or offline SMS
2. **PHC operator sees grouped reports** (by PIN), calculates severity (5+ triggers escalation)
3. **PHC sends to lab** → Status marked `contaminated`, GPS coordinates captured
4. **Public users within 2km** automatically alerted via Haversine distance calculation
5. **All updates tracked & auto-refresh** every 30 seconds for real-time visibility

**Key Technical Achievement:** Complete data pipeline from user report → PHC grouping → Lab escalation → Public alerts, with redundant state tracking to ensure accuracy across page refreshes.
