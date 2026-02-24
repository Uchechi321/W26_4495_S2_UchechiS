# Visual Drilling Operations & Decision Support System

## Course
- CSIS 4495 – Applied Project
- Term: Winter 2026
- Section: S2

## Student
- Name: Uchechi Sebastian
- Student ID: 300393092
- Email: sebastianu@student.douglascollege.ca

## Project Summary
This project develops a web-based decision support system for drilling operations.
The application visualizes drilling events along well depth and provides KPI analytics
and explainable predictive maintenance indicators based on recorded operational data.

## Repo Structure
- ReportsAndDocuments/: proposal, progress reports, and final documentation
- Implementation/: frontend, backend, and datasets


# Installation Instructions
This section explains how to install and run the project on your machine, including both backend (Python) and frontend (React).

## Backend (Python)
1. Navigate to the Frontend Folder:
   cd backend
   
2. Install Python:
   Ensure you have Python 3.9+ installed:
   - python --version

3. Create and Activate a Virtual Environment:
   - Create:
     python -m venv venv
   - Activate (Windows):
     venv\Scripts\activate
   - Activate (macOS/Linux):
     source venv/bin/activate

4. Install Dependencies:
   pip install -r requirements.txt

5. Run the Backend Server:
   uvicorn app.main:app --reload

## Frontend (React)
1. Install Node.js:
   Verify installation:
   - node -v
   - npm -v

2. Navigate to the Frontend Folder:
   cd frontend

3. Install Frontend Dependencies:
   npm install

4. Start the React Development Server:
   npm run dev

   The frontend will be available at:
   http://localhost:5173/

5. ▶️ Running the Full Demo
Once both servers are running:

Backend runs on something like:
http://localhost:8000

Frontend runs on:
http://localhost:5173/

The frontend will automatically communicate with the backend if your API URLs are configured correctly.
