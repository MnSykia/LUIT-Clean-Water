# LUIT Clean Water - Hackathon Project

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- Firebase project with Realtime Database and Storage

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your Firebase credentials to .env
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Add your Firebase credentials to .env
npm run dev
```

### Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

## Key Features

1. **Landing Page** - Real-time water quality status with area contamination popup
2. **Reporting System** - Submit contamination reports with GPS and severity levels
3. **PHC Dashboard** - Manage active reports and send to labs
4. **Lab Dashboard** - Test samples and upload solutions
5. **Hotspot Map** - Visualize contaminated areas
6. **Solution History** - Access past solutions by area or district

## Environment Variables

### Backend (.env)
```
FLASK_ENV=development
FIREBASE_DATABASE_URL=xxx
FIREBASE_STORAGE_BUCKET=xxx
FIREBASE_KEY_PATH=serviceAccountKey.json
```

### Frontend (.env)
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_DATABASE_URL=xxx
```

## Deploy to Railway/Vercel

This project is pre-configured for Railway (backend) and Vercel (frontend) deployment.

Update environment variables in your deployment platform with Firebase credentials.

## Support

For issues or questions, refer to the main README.md file.
