# MyDuka

MyDuka is a role-based inventory and operations platform for merchants, admins, and clerks.  
It helps teams manage stock, purchases, suppliers, sales, expenses, returns, and reporting from one system.

## Team

- Abdirahman Mohamed
- Akam Novel
- Christine Mumbi
- Patrickson Mungai
- Joshua Muriki

## Core Features

- JWT auth with access + refresh tokens
- Role-based access (`superuser`, `admin`, `clerk`)
- Multi-store inventory tracking with spoilage and payment status
- Product, supplier, purchase order, stock transfer, returns, sales, and expense workflows
- Clerk supply-request workflow with admin review
- Admin and merchant analytics/reporting dashboards
- Notifications and activity visibility

## Tech Stack

### Frontend

- React 18 + Vite
- Redux Toolkit
- React Router
- Recharts
- Tailwind CSS

### Backend

- FastAPI
- SQLAlchemy 2
- Alembic
- PostgreSQL (production) / SQLite (local or tests)

### Testing

- Frontend: Vitest + Testing Library
- Backend: Pytest

## Repository Layout

```text
MYDUKA/
├── frontend/   # React client
└── backend/    # FastAPI API + Alembic migrations
```

## Demo Accounts

```text
Merchant: merchant@myduka.com / merchant123
Admin:    admin@myduka.com / admin123
Clerk:    clerk@myduka.com / clerk123
```

## Local Development

### 1) Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

If your editor reports unresolved imports, point it to:

```text
backend/.venv/bin/python
```

Run migrations:

```bash
alembic upgrade head
```

Start API:

```bash
uvicorn main:app --reload
```

Backend URLs:

- API base: `http://127.0.0.1:8000`
- Docs: `http://127.0.0.1:8000/api/docs`
- ReDoc: `http://127.0.0.1:8000/api/redoc`
- Health: `http://127.0.0.1:8000/health`

### 2) Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run frontend:

```bash
npm run dev
```

Frontend URL:

- `http://127.0.0.1:5173`

## Environment Variables

Use `backend/.env.example` as the source template.  
At minimum, configure these values in production:

- `DATABASE_URL`
- `DATABASE_DRIVER=postgresql`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `FRONTEND_BASE_URL`
- `CORS_ORIGINS_RAW`
- `SEED_DEMO_USERS=false`
- `SENDGRID_API_KEY` (optional but required for email features)
- `EMAIL_FROM` (optional but required for email features)

Important:

- `CORS_ORIGINS_RAW` accepts comma-separated origins.
- For first boot you may temporarily set `SEED_DEMO_USERS=true`, then switch it back to `false`.
- Never commit real secrets in `.env` or `.env.example`.

## Running Tests

### Backend

```bash
cd backend
source .venv/bin/activate
pytest
```

Run backend tests against SQLite:

```bash
cd backend
DATABASE_URL="sqlite:///./myduka_test.db" DATABASE_DRIVER=sqlite pytest
```

### Frontend

```bash
cd frontend
npm run test
```

## Deployment

### Backend (Render)

- Root directory: `backend`
- Build command:
  ```bash
  pip install -r requirements.txt && alembic upgrade head
  ```
- Start command:
  ```bash
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```
- Python version: set via `backend/.python-version` (currently `3.12.3`)

### Frontend (Vercel)

- Framework: Vite
- Environment variable:
  - `VITE_API_BASE_URL=https://<your-render-backend-domain>`

### Cross-service settings

- In Render:
  - `FRONTEND_BASE_URL=https://<your-vercel-domain>`
  - `CORS_ORIGINS_RAW=https://<your-vercel-domain>`

## API Reference

Once backend is running, use:

- `GET /api/docs` for Swagger UI
- `GET /api/redoc` for ReDoc

## Security Checklist

- Rotate API keys immediately if exposed.
- Keep all credentials only in environment variables.
- Use a strong random `SECRET_KEY` in production.
- Ensure CORS is set only to trusted frontend domains.

## License

MIT
