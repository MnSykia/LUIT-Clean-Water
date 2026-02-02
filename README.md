# LUIT 3.0 - Water Contamination Alert System

A comprehensive water contamination alert and management system for Assam.

## Features

- **Public Reporting**: Citizens can report water contamination with location, severity, and images
- **Area Status Check**: Automatic popup showing if user's area is contaminated (within 1km radius)
- **PHC Dashboard**: 
  - View district-level reports
  - Send reports to labs with descriptions/PDFs
  - Mark areas as clean
  - View lab solutions
  - Hotspot map visualization
- **Water Lab Dashboard**:
  - Receive reports from PHCs
  - Upload test results and solution PDFs
  - Approve clean areas
  - View previous solutions

## Deployment

### Backend (Railway)
- Deploy `backend/` folder to Railway
- Set environment variables from `backend/.env.example`

### Frontend (Vercel)
- Deploy `frontend/` folder to Vercel
- Set `VITE_API_URL` environment variable

## Workflow

1. **Citizen Reports** → Report contamination via web or SMS
2. **PHC Reviews** → PHC sees report in dashboard, sends to lab
3. **Lab Tests** → Lab uploads test results and solution PDFs
4. **PHC Marks Clean** → After cleanup, PHC marks area as clean
5. **Lab Approves** → Lab confirms area is clean, status changes to resolved
