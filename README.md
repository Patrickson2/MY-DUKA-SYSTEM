# MyDuka – Inventory & Reporting System

MyDuka is a role-based inventory management and reporting platform for merchants, store admins, and clerks. It supports stock tracking, supply requests, payment status updates, and visual reporting for better decision-making.

## Authors
- Abdirahman Mohamed
- Akam Novel
- Christine Mumbi
- Patrickson Mungai
- Joshua Muriki

## Key Features
- Role-based access (Merchant, Admin, Clerk)
- JWT authentication with refresh tokens
- Inventory CRUD (stock, spoilt, pricing, payment status)
- Supply request workflow (approve/decline + notes)
- Store, product, supplier, purchase order, returns, sales, expense management
- Analytics dashboards (performance, payment trends, top/slow movers)
- In-app notifications and activity tracking
- Responsive UI and charted reports

## Tech Stack
**Frontend**
- React + Vite
- Redux Toolkit
- Tailwind CSS
- Charting (JS plotting library)

**Backend**
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL (production), SQLite (local)

**Testing**
- Vitest (frontend)
- Pytest (backend)

## Project Structure
```
frontend/    # React app
backend/     # FastAPI app
```

## Demo Credentials
```
Merchant: merchant@myduka.com / merchant123
Admin:    admin@myduka.com / admin123
Clerk:    clerk@myduka.com / clerk123
```

## Local Setup

### 1) Backend
```
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` in `backend/` (example):
```
DATABASE_URL=sqlite:///./myduka.db
SECRET_KEY=your-secret
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
```

Run migrations (Postgres recommended):
```
alembic upgrade head
```

Seed demo users:
```
python -c "from app.models import user, inventory, product, store, supply_request, refresh_token, supplier, purchase_order, sale, expense, return_request, stock_transfer; from app.core.database import SessionLocal; from app.services.seed_service import seed_demo_users; db=SessionLocal(); seed_demo_users(db); db.close(); print('seeded')"
```

Start the API:
```
uvicorn main:app --reload
```

API docs:
- http://localhost:8000/docs
- http://localhost:8000/redoc

### 2) Frontend
```
cd frontend
npm install
npm run dev
```

Frontend runs at:
- http://localhost:5173

### Environment Variables (Frontend)
Create `frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Tests

**Backend**
```
cd backend
pytest
```

Run tests with SQLite (useful if Postgres is unavailable):
```
DATABASE_URL="sqlite:///./myduka_test.db" DATABASE_DRIVER=sqlite pytest
```

**Frontend**
```
cd frontend
npm run test
```

## Deployment Notes
- Use PostgreSQL in production (Neon recommended).
- Keep backend + DB in the same region to reduce latency.
- Use the Neon pooler URL for better connection handling.
- Configure CORS and SECRET_KEY securely.

## License
MIT
