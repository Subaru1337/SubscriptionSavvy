# 💳 Subscription Manager

A **full-stack web application** designed to help users **track and manage recurring subscriptions** through an interactive dashboard, timely reminders, and exportable analytics.

---

## 🚀 Key Features

- **🔐 Full User Authentication**  
  Secure user registration and login powered by **JWT (JSON Web Tokens)**.

- **🧾 Subscription Management**  
  Complete **CRUD functionality** (Create, Read, Update, Delete) for managing all your subscriptions.

- **📅 Smart Date Calculation**  
  Automatically calculates the **next payment date** based on the billing cycle (monthly/yearly) and dynamically updates it when the cycle changes.

- **📊 Interactive Dashboard**  
  Get a quick overview of **total monthly/annual spending**, active subscriptions, and category breakdowns.

- **📈 Data Visualization**  
  Displays a **pie chart and detailed list view** showing spending by category, normalized to a monthly view.

- **⏰ Payment Reminders**  
  View upcoming payments with **color-coded tags**:
 
- **💰 One-Click Payments**  
  Instantly **mark subscriptions as paid**, automatically updating the next payment date.

- **📤 Data Export**  
  Export all subscription data to **CSV** and **PDF** formats for external use or backup.

---

## 🖼️ Screenshots

**🔑 Login Page**  
<img width="1919" height="911" alt="Dashboard Screenshot 1" src="https://github.com/user-attachments/assets/911d5ef0-f69f-44d4-9109-39d34a089903" />

**📊 Main Dashboard**  
<img width="1896" height="906" alt="Login Screenshot" src="https://github.com/user-attachments/assets/8ef9c666-760b-43f1-a85e-7e8aa36c3e64" />

<img width="1900" height="915" alt="Dashboard Screenshot 2" src="https://github.com/user-attachments/assets/bf8eb788-2258-4133-8e64-49ab3665b2d3" />

---

## 🧰 Technology Stack

### 🖥️ Backend

| Component | Technology |
|------------|-------------|
| **Framework** | Flask |
| **Database** | PostgreSQL (Neon) & SQLite (local) |
| **ORM** | SQLAlchemy |
| **Authentication** | Flask-JWT-Extended |
| **Date Handling** | python-dateutil |
| **File Exports** | Pandas (CSV), ReportLab (PDF) |
| **Env Management** | python-dotenv |

### 💻 Frontend

| Component | Technology |
|------------|-------------|
| **Library** | React |
| **Build Tool** | Vite |
| **Routing** | React Router (`react-router-dom`) |
| **API Communication** | Axios |
| **Charts** | Chart.js (`react-chartjs-2`) |
| **Styling** | Plain CSS (modular structure) |

---

## ⚙️ Getting Started — Local Setup

Follow the steps below to run the project locally for development or testing.

### 📋 Prerequisites

- Python **3.8+** and Pip  
- Node.js **v18+** and npm  
- Git

---

### 🧩 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-project-folder>
````

---

### 🐍 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate      # On macOS/Linux
.venv\Scripts\activate         # On Windows

# Install dependencies
pip install -r requirements.txt

# Create a .env file
# Copy from .env.example or create manually
# Add: SECRET_KEY, JWT_SECRET_KEY, DATABASE_URL
touch .env

# Initialize database
flask init-db

# Run Flask development server
flask run
```

Backend runs on: **[http://localhost:5000](http://localhost:5000)**

---

### ⚛️ 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend-react

# Install dependencies
npm install

# Run React dev server
npm run dev
```

Frontend runs on: **[http://localhost:5173](http://localhost:5173)**

---

## 🔐 Security & Privacy

* JWT-based authentication for secure API access
* Environment variables for managing secrets
* Passwords and tokens are **never stored in plaintext**
* Protected routes and validation on both frontend & backend

---

## 📦 Folder Structure (Simplified)

```
subscription-manager/
├── backend/
│   ├── app.py
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend-react/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## 💬 Author

👨‍💻 Developed by *Varad Mhatre*
For questions, suggestions, or contributions — feel free to open an **issue** or a **pull request**!

```

betatester013370@gmail.com

Would you like me to **add shields/badges** (for Python, React, PostgreSQL, Flask, License, etc.) to make it more visually appealing for GitHub?
```
