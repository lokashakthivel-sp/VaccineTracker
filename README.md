# VaccineTracker

VaccineTracker is a full-stack web application designed to help parents monitor their children's vaccination schedules and connect with nearby pediatricians.

## Live Demo
* **Frontend Application:** [https://vaccine-tracker.netlify.app](https://vaccine-tracker.netlify.app)
* **Backend API Documentation (Swagger UI):** [https://vaccine-tracker-api.onrender.com/docs](https://vaccine-tracker-api.onrender.com/docs)

## Features
* **Role-Based Accounts:** Separate dashboards and access levels for `parent` and `doctor` profiles.
* **Comprehensive Schedule:** Pre-configured with 34 standard vaccines covering birth to 16 years.
* **Automated Reminders:** Trigger email (via Resend) and WhatsApp notifications for upcoming doses.
* **Certificate Generation:** Downloadable PDF vaccination certificates using ReportLab.
* **Find a Doctor:** Geospatial search to find the nearest pediatricians using GPS coordinates and the Haversine formula.
* **AI Chatbot:** Built-in assistant to answer vaccination-related questions.

## Tech Stack
* **Frontend:** React, TypeScript, and Vite (Hosted on Netlify)
* **Backend:** Python and FastAPI (Hosted on Render)
* **Database & Auth:** Supabase (PostgreSQL)
