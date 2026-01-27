# 📦 MyDuka – Inventory & Reporting System
## Project Documentation

### 1. Project Overview
MyDuka is a web-based inventory management system designed to help merchants and store admins efficiently track stock, manage procurement payments, and generate insightful reports. The system supports role-based access control and provides real-time data visualization for informed decision-making.

### 2. Problem Statement
Many small and medium-sized businesses still rely on manual record keeping, which is:
- Time-consuming
- Error-prone
- Lacks real-time reporting

This leads to poor decision-making, stock losses, and delayed procurement processes.

### 3. Solution
MyDuka provides:
- Centralized inventory tracking
- Role-based dashboards
- Automated reports (weekly, monthly, yearly)
- Payment tracking for suppliers
- Visual analytics using charts and graphs

### 4. User Roles & Permissions
#### 👑 Merchant (Superuser)
- Initialize admin registration via tokenized email links
- Activate, deactivate, or delete admin accounts
- View:
  - Store-by-store performance reports
  - Paid vs unpaid products per store
  - Individual product performance
  - Visualized reports using graphs

#### 🧑‍💼 Store Admin
- Register and manage data entry clerks
- Approve or decline supply requests
- Update payment status (paid / unpaid)
- View:
  - Clerk performance reports
  - Paid vs unpaid supplier products
- Deactivate or delete clerks

#### 🧾 Data Entry Clerk
- Record:
  - Items received
  - Items in stock
  - Spoilt items (expired, broken, etc.)
  - Buying & selling price
  - Payment status
- Request additional stock supply from admin

### 5. Core Features
- JWT Authentication
- Role-based access control
- Token-based email registration
- Inventory CRUD operations
- Supply request workflow
- Payment tracking
- Graphical reports (bar & line charts)
- Pagination on all listing endpoints
- CI/CD with GitHub Actions
- Automated testing (frontend & backend)

## ⚙️ Recommended Technology Stack (Chosen for You)
### Backend (API)
| Purpose | Technology |
| --- | --- |
| Framework | FastAPI |
| Language | Python |
| Authentication | JWT (Access & Refresh Tokens) |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Email Service | SMTP / SendGrid |
| Testing | Pytest |
| API Docs | Swagger (built-in) |

**Why FastAPI?**
- Faster than Flask
- Automatic API documentation
- Async support
- Production-ready

### Frontend
| Purpose | Technology |
| --- | --- |
| Framework | React (Vite) |
| State Management | Redux Toolkit |
| Routing | React Router |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Forms | React Hook Form |
| Auth Handling | JWT + Axios Interceptors |
| Testing | Jest + React Testing Library |

**Why Redux Toolkit?**
- Cleaner than Context for large apps
- Better debugging
- Scales well with complex dashboards

### DevOps & Workflow
- Gitflow workflow
- GitHub Actions for CI/CD
- Automated:
  - Tests
  - Linting
  - Build checks
- Deployment:
  - Frontend → Vercel
  - Backend → Render / Railway

## 🗂️ Project Repository Structure (Single Repo – Required)
```
myduka/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── dependencies.py
│   │   │
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── store.py
│   │   │   ├── product.py
│   │   │   ├── inventory.py
│   │   │   └── supply_request.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── product.py
│   │   │   ├── inventory.py
│   │   │   └── reports.py
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── products.py
│   │   │   ├── inventory.py
│   │   │   ├── reports.py
│   │   │   └── supply_requests.py
│   │   │
│   │   ├── services/
│   │   │   ├── email_service.py
│   │   │   └── report_service.py
│   │   │
│   │   ├── tests/
│   │   │   ├── test_auth.py
│   │   │   ├── test_inventory.py
│   │   │   └── test_reports.py
│   │
│   ├── alembic/
│   ├── requirements.txt
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   └── store.js
│   │   │
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── inventory/
│   │   │   ├── reports/
│   │   │   └── users/
│   │   │
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── AdminPanel.jsx
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Charts.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── tests/
│   │   │   └── auth.test.js
│   │   │
│   │   └── main.jsx
│   │
│   ├── tailwind.config.js
│   ├── package.json
│   └── README.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── README.md
└── PROJECT_TRACKER.md
```

## 🧪 Testing Strategy
### Backend
- Unit tests for auth, inventory, reports
- Pagination tests on listing endpoints

### Frontend
- Component rendering tests
- Auth flow tests
- Dashboard data rendering tests

## 📊 Reporting & Visualization
- Line graphs → stock movement over time
- Bar graphs → product performance
- Filters:
  - Store
  - Product
  - Date range
- Pie charts (optional)
