# MyDuka Backend Setup Guide

##  Project Overview

MyDuka is an inventory management system designed for multi-store operations. The backend is built with **FastAPI** and **PostgreSQL**.

### Key Features:

- **Role-Based Access Control**: Superuser (Merchant), Admin (Store Manager), Clerk (Data Entry)
- **JWT Authentication**: Secure token-based authentication
- **Inventory Management**: Track stock, spoilage, and payment status
- **Supply Requests**: Clerks can request products, admins approve/decline
- **Multi-Store Support**: Manage multiple stores from one system

---

##  Installation & Setup

### Prerequisites

- **Python 3.10+** (Verify: `python --version`)pavucontrol
- **PostgreSQL 12+** (or SQLite for development)
- **pip** (Python package manager)

### Step 1: Clone/Setup Project

```bash
cd /home/mungai/Documents/P-Projects/MYDUKA/backend
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Linux/Mac:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

The `requirements.txt` includes:

- **fastapi**: Web framework
- **uvicorn**: ASGI server
- **sqlalchemy**: ORM for database
- **psycopg2-binary**: PostgreSQL adapter
- **python-jose**: JWT handling
- **passlib[bcrypt]**: Password hashing
- **pydantic**: Data validation
- **alembic**: Database migrations

### Step 4: Setup Environment Variables

```bash
# Copy example file
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

**Important Settings in `.env`:**

```
DATABASE_URL=postgresql://user:password@localhost:5432/myduka
SECRET_KEY=change-this-to-a-long-random-string
DEBUG=true  # Set to false in production
```

### Step 5: Database Setup

#### Option A: PostgreSQL (Recommended)

```bash
# Create database
createdb myduka

# The app will auto-create tables on first run
```

#### Option B: SQLite (Development Only)

Edit `.env`:

```
DATABASE_URL=sqlite:///./myduka.db
```

---

##  Running the Application

### Start the Server

```bash
# Using Python directly
python main.py

# OR using Uvicorn directly (with auto-reload)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete
```

### Access the Application

- **API Docs (Swagger)**: http://localhost:8000/api/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/api/redoc
- **API Root**: http://localhost:8000

### Test Health Check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "MyDuka - Inventory Management System",
  "version": "1.0.0"
}
```

---

##  Authentication Flow

### 1. Register (Clerk)

```bash
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clerk@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "password": "secure_password_123",
    "phone": "+254712345678"
  }'
```

### 2. Login

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "clerk@example.com",
    "password": "secure_password_123"
  }'
```

Response includes `access_token` and `refresh_token`.

### 3. Use Token in Requests

```bash
curl -X GET "http://localhost:8000/api/users/" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## API Endpoints Overview

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users Management

- `GET /api/users/` - List users (admin only)
- `POST /api/users/create` - Create user (admin only)
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `POST /api/users/{id}/change-password` - Change password
- `PATCH /api/users/{id}/deactivate` - Deactivate/activate user
- `DELETE /api/users/{id}` - Delete user (admin only)

### Products

- `GET /api/products/` - List products
- `POST /api/products/` - Create product (admin only)
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product (admin only)
- `DELETE /api/products/{id}` - Delete product (admin only)

### Inventory

- `POST /api/inventory/` - Record inventory entry
- `GET /api/inventory/` - List inventory records
- `GET /api/inventory/{id}` - Get inventory details
- `PUT /api/inventory/{id}` - Update inventory record
- `GET /api/inventory/store/{store_id}/paid` - Get paid items (admin)
- `GET /api/inventory/store/{store_id}/unpaid` - Get unpaid items (admin)

### Supply Requests

- `POST /api/supply-requests/` - Create supply request
- `GET /api/supply-requests/` - List requests
- `GET /api/supply-requests/{id}` - Get request details
- `POST /api/supply-requests/{id}/approve` - Approve (admin only)
- `POST /api/supply-requests/{id}/decline` - Decline (admin only)
- `GET /api/supply-requests/pending/all` - Get pending (admin only)

### Stores

- `GET /api/stores/` - List stores
- `POST /api/stores/` - Create store (admin only)
- `GET /api/stores/{id}` - Get store details
- `PUT /api/stores/{id}` - Update store (admin only)
- `DELETE /api/stores/{id}` - Delete store (admin only)

---

##  Project Structure

```
backend/
├── main.py                 # Application entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables example
├── app/
│   ├── __init__.py
│   ├── core/              # Configuration & utilities
│   │   ├── config.py      # Settings
│   │   ├── database.py    # Database setup
│   │   ├── security.py    # JWT & password utilities
│   │   └── dependencies.py # Authentication dependencies
│   ├── models/            # SQLAlchemy models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── store.py
│   │   ├── inventory.py
│   │   └── supply_request.py
│   ├── routes/            # API endpoints
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── products.py
│   │   ├── inventory.py
│   │   ├── supply_requests.py
│   │   └── reports.py
│   ├── schemas/           # Pydantic validation
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── inventory.py
│   │   └── reports.py
│   ├── services/          # Business logic
│   │   ├── email_service.py
│   │   └── report_service.py
│   └── tests/             # Unit tests
└── venv/                  # Virtual environment
```

---

##  Testing with Postman/cURL

### Create a Store

```bash
curl -X POST "http://localhost:8000/api/stores/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Downtown Store",
    "location": "Nairobi",
    "phone": "+254712345678",
    "email": "store@example.com"
  }'
```

### Create a Product

```bash
curl -X POST "http://localhost:8000/api/products/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Rice 50kg",
    "sku": "RICE-50K",
    "buying_price": 2000,
    "selling_price": 2500,
    "description": "Premium quality rice"
  }'
```

### Record Inventory

```bash
curl -X POST "http://localhost:8000/api/inventory/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "product_id": 1,
    "store_id": 1,
    "quantity_received": 100,
    "quantity_in_stock": 98,
    "quantity_spoilt": 2,
    "payment_status": "unpaid",
    "buying_price": 2000,
    "selling_price": 2500
  }'
```

---

##  Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'fastapi'"

**Solution**: Activate virtual environment and install requirements

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "psycopg2.OperationalError: could not connect to server"

**Solution**: Ensure PostgreSQL is running

```bash
# On Linux/Mac
sudo systemctl status postgresql

# Check database exists
psql -l | grep myduka
```

### Issue: "database does not exist"

**Solution**: Create the database

```bash
createdb myduka
```

### Issue: Token validation errors

**Solution**: Ensure you're using the correct token format

```bash
Authorization: Bearer YOUR_ACTUAL_TOKEN
```

---

##  Common Development Tasks

### Restart Server

```bash
# Press Ctrl+C, then
uvicorn main:app --reload
```

### Check Database

```bash
# PostgreSQL
psql -d myduka -c "\dt"  # List tables

# SQLite
sqlite3 myduka.db ".tables"
```

### View Logs

The server logs are displayed in the terminal running uvicorn.

---

##  Notes for Your Team

1. **Frontend Integration**: Use `/api/` prefix for all API calls
2. **CORS**: Already configured for `localhost:3000` and `localhost:5173`
3. **Role Hierarchy**: `superuser` > `admin` > `clerk`
4. **Token Expiry**: Access tokens valid for 30 minutes
5. **Database**: Changes auto-create tables on startup

---

##  Deployment Checklist

Before moving to production:

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DEBUG=false`
- [ ] Use strong PostgreSQL password
- [ ] Configure proper CORS origins
- [ ] Use HTTPS
- [ ] Set up proper logging
- [ ] Configure backups

---

##  Additional Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **SQLAlchemy Docs**: https://docs.sqlalchemy.org
- **JWT Guide**: https://pyjwt.readthedocs.io

---

##  Questions?

If you encounter issues:

1. Check server logs in terminal
2. Verify `.env` configuration
3. Ensure database is running
4. Check firewall/port availability (port 8000)

Happy coding! 
