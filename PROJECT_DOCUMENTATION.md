# MyDuka - Inventory and Reporting System
## Project Documentation

## 1. Project Overview
MyDuka is a web-based inventory management system that helps merchants, admins, and clerks manage stock, supply flow, payments, and role-based reporting.

## 2. Problem Statement
Many small and medium businesses still use manual inventory records that are:
- Time-consuming
- Error-prone
- Weak for real-time reporting

This causes stock mistakes, delayed replenishment, and weaker purchasing decisions.

## 3. Solution
MyDuka provides:
- Centralized inventory and stock updates
- Role-based dashboards
- Supply request approval workflow
- Paid/unpaid supplier tracking
- Report views and chart-based insights

## 4. Current Implementation Status
### Implemented
- Role-based login with JWT access and refresh tokens
- Session restore (`/api/auth/me`) and logout flow
- Clerk dashboard with inventory record/create, edit, delete, supply requests
- Admin dashboard with supply request approval/decline and clerk/user management actions
- Merchant dashboard with store/admin analytics and invite-link workflow
- Backend seed service for demo users
- Backend tests (auth, inventory, reports)
- Frontend tests (auth, admin panel, clerk dashboard, merchant dashboard)

### In Progress or Pending
- Full email delivery integration for invite links (SMTP provider setup)
- Production hardening (strict secrets, final CORS domains, deployment env separation)
- Additional UX polish and non-critical empty-state/report filters

## 5. User Roles and Permissions
### Merchant (Superuser)
- Create admin invite links
- Activate/deactivate/delete admin accounts
- View merchant-level dashboard and payment/performance summaries

### Store Admin
- Register/manage clerks
- Approve/decline supply requests
- Update payment status for inventory items
- View store-level dashboard and clerk performance metrics

### Data Entry Clerk
- Record inventory entries
- Update own inventory entries
- Mark payment status (based on allowed endpoints)
- Submit supply requests to admins
- View own stock stats and records

## 6. Core Features
- JWT authentication (access + refresh)
- Role-based authorization
- Token-based admin invite registration
- Product and inventory CRUD (role-restricted)
- Supply request workflow (pending/approved/declined)
- Dashboard APIs for clerk/admin/merchant
- Automated tests for frontend and backend
- CI workflow support

## 7. Technology Stack
### Backend
| Purpose | Technology |
| --- | --- |
| Framework | FastAPI |
| Language | Python |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Auth | JWT |
| Test | Pytest |
| API Docs | Swagger (`/api/docs`) |

### Frontend
| Purpose | Technology |
| --- | --- |
| Framework | React (Vite) |
| Routing | React Router |
| State | Redux Toolkit |
| Styling | Tailwind CSS |
| Charts | Recharts |
| API Client | Axios |
| Tests | Vitest + Testing Library |

### Database
- Default local runtime currently uses SQLite (`backend/myduka.db`)
- Can be switched to PostgreSQL using environment config

## 8. Repository Structure (Current)
```text
myduka/
├── backend/
│   ├── main.py
│   ├── alembic.ini
│   ├── alembic/
│   ├── app/
│   │   ├── core/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── tests/
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── services/
│   │   └── tests/
│   ├── public/images/
│   ├── package.json
│   └── README.md
├── .github/workflows/
├── README.md
├── PROJECT_TRACKER.md
└── PROJECT_DOCUMENTATION.md
```

## 9. Local Setup and Run
### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs:
- Swagger: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend app:
- `http://localhost:5173`

## 10. Demo Credentials (Seeded)
- Merchant: `merchant@myduka.com` / `merchant123`
- Admin: `admin@myduka.com` / `admin123`
- Clerk: `clerk@myduka.com` / `clerk123`

If credentials are missing, reseed from `backend/`:
```bash
source .venv/bin/activate
python -c "from app.models import user, inventory, product, store, supply_request, refresh_token; from app.core.database import SessionLocal; from app.services.seed_service import seed_demo_users; db=SessionLocal(); seed_demo_users(db); db.close(); print('seeded')"
```

## 11. Environment Configuration
Important backend settings are in `backend/app/core/config.py` and `.env`:
- `SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_DRIVER`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `INVITE_TOKEN_EXPIRE_HOURS`
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS_RAW`
- `SEED_DEMO_USERS`

## 12. API Summary
### Auth (`/api/auth`)
- `POST /register`
- `POST /admin-invite/register`
- `POST /login`
- `GET /me`
- `POST /refresh`
- `POST /logout`

### Users (`/api/users`)
- `POST /create`
- `POST /admin-invites`
- `GET /`
- `GET /{user_id}`
- `PUT /{user_id}`
- `PATCH /{user_id}/deactivate`
- `DELETE /{user_id}`

### Products (`/api/products`)
- `POST /`
- `GET /`
- `GET /{product_id}`
- `PUT /{product_id}`
- `DELETE /{product_id}`

### Inventory (`/api/inventory`)
- `POST /`
- `GET /`
- `GET /{inventory_id}`
- `PUT /{inventory_id}`
- `PATCH /{inventory_id}/payment-status`
- `DELETE /{inventory_id}`

### Supply Requests (`/api/supply-requests`)
- `POST /`
- `GET /`
- `GET /{request_id}`
- `POST /{request_id}/approve`
- `POST /{request_id}/decline`
- `GET /pending/all`

### Dashboard and Reports (`/api/reports`)
- `GET /clerk/dashboard`
- `GET /admin/dashboard`
- `GET /merchant/dashboard`

### Stores (`/api/stores`)
- `POST /`
- `GET /`
- `GET /{store_id}`
- `PUT /{store_id}`
- `DELETE /{store_id}`

## 13. Testing Strategy
### Backend
```bash
cd backend
source .venv/bin/activate
python -m pytest app/tests -q
```
Covers auth, inventory, and reporting flows.

### Frontend
```bash
cd frontend
npm test -- --run
```
Covers auth routing and key dashboard actions.

## 14. Reporting and Visualization
- Bar and trend visualizations for performance and stock movement
- Paid vs unpaid summaries
- Clerk/admin/merchant role-specific dashboard widgets

## 15. Branching and Team Workflow
- Work on feature branches (for example `frontend/admin`)
- Keep branch updated from `main` regularly
- Open PR to `main` after tests pass
- Avoid committing `node_modules` and local database files

## 16. Deployment Checklist
Before production deployment:
- Set strong `SECRET_KEY`
- Configure production `DATABASE_URL` (PostgreSQL recommended)
- Configure strict CORS origins
- Disable demo seeding in production (`SEED_DEMO_USERS=false`)
- Configure SMTP provider credentials
- Run tests in CI for frontend and backend

## 17. Known Issues and Notes
- `307 Temporary Redirect` on endpoints without trailing slash is expected behavior in FastAPI
- Some warnings may appear from dependency internals; functional tests should still pass
- If login fails for seeded users, clear and reseed demo users

## 18. Next Features
- Complete full invite email delivery UX
- Add richer filtering (store/product/date range) across all dashboards
- Extend merchant CRUD controls and audit logs
- Add pagination controls consistently for all long lists in UI
- Finalize production deployment configs and monitoring
