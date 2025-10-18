# Subscription Manager

A full-stack web application designed to help users track and manage their recurring subscriptions with an interactive dashboard, timely reminders, and data export capabilities.

## \#\# Key Features

  * **Full User Authentication:** Secure user registration and login using JWT (JSON Web Tokens).
  * **Subscription Management:** Full CRUD (Create, Read, Update, Delete) functionality for managing subscriptions.
  * **Smart Date Calculation:** Automatically calculates the next payment date based on the billing cycle (monthly/yearly) and handles updates when the cycle is changed.
  * **Interactive Dashboard:** At-a-glance overview of key metrics like total monthly/annual spending and active subscription count.
  * **Data Visualization:** Features a pie chart and a detailed list to break down spending by category, with costs normalized to a monthly view.
  * **Payment Reminders:** A dedicated page that displays all upcoming payments with color-coded status tags for "Overdue," "Due Today," "Tomorrow," and "Within a week."
  * **One-Click Payments:** A "Mark as Paid" feature that automatically updates the subscription's next payment date.
  * **Data Export:** Users can export their subscription data to both CSV and PDF formats.

-----

## \#\# Screenshots

*[Insert screenshots of your application here. For example: the login page, the dashboard, and the subscriptions list.]*

**Login Page**
<img width="1896" height="906" alt="Screenshot 2025-10-18 191238" src="https://github.com/user-attachments/assets/8ef9c666-760b-43f1-a85e-7e8aa36c3e64" />

**Main Dashboard**
<img width="1919" height="911" alt="Screenshot 2025-10-18 191158" src="https://github.com/user-attachments/assets/911d5ef0-f69f-44d4-9109-39d34a089903" />

<img width="1900" height="915" alt="Screenshot 2025-10-18 191252" src="https://github.com/user-attachments/assets/bf8eb788-2258-4133-8e64-49ab3665b2d3" />


-----

## \#\# Technology Stack

### \#\#\# Backend

  * **Framework:** Flask
  * **Database:** PostgreSQL (with Neon) & SQLite for local development
  * **ORM:** SQLAlchemy
  * **Authentication:** Flask-JWT-Extended
  * **Date Handling:** python-dateutil
  * **File Exports:** Pandas (for CSV), ReportLab (for PDF)
  * **Environment Variables:** python-dotenv

### \#\#\# Frontend

  * **Library:** React
  * **Build Tool:** Vite
  * **Routing:** React Router (`react-router-dom`)
  * **API Communication:** Axios
  * **Charts:** Chart.js (`react-chartjs-2`)
  * **Styling:** Plain CSS with a modular approach

-----

## \#\# Getting Started & Local Setup

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### \#\#\# Prerequisites

  * Python (3.8+) and Pip
  * Node.js (v18+) and npm
  * Git

### \#\#\# 1. Clone the Repository

```bash
git clone [Your Repository URL]
cd [Your Project Folder]
```

### \#\#\# 2. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Create a .env file
# (Copy the contents from .env.example if you have one, or create it from scratch)
# Add your SECRET_KEY, JWT_SECRET_KEY, and DATABASE_URL
touch .env

# Initialize the database
flask init-db

# Run the Flask server
flask run
```

The backend will now be running at `http://localhost:5000`.

### \#\#\# 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd ../frontend-react

# Install Node.js dependencies
npm install

# Run the React development server
npm run dev
```

The frontend will now be running at `http://localhost:5173`. Open this URL in your browser to use the application.
