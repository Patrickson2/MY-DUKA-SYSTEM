# MyDuka Backend API

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-blue.svg)](https://www.postgresql.org/)

## Overview

MyDuka is a comprehensive inventory management system designed for multi-store ecommerce operations. The backend provides a robust REST API built with **FastAPI**, featuring role-based access control, JWT authentication, and complete inventory tracking capabilities.

### 🎬 Quick Demo

**Server Status:**

```bash
curl http://localhost:8000/health
```

**Interactive API Docs:**

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc

---

## Key Features

### Authentication & Authorization

- **JWT Token-Based Authentication** - Secure API access
- **Role-Based Access Control (RBAC)**:
  - `superuser`: Merchant - Full system access
  - `admin`: Store Manager - Store-level management
  - `clerk`: Data Entry - Record inventory entries

### Inventory Management

- Record received items with prices and payment status
- Track stock levels and spoilage
- Support for multiple stores
- Detailed inventory history

### Product Management

- Add and manage products
- Track buying and selling prices
- Unique SKU system
- Product activation/deactivation

### Store Management

- Multi-store support
- Store-specific data tracking
- Store admin assignment

### Supply Requests

- Clerks request additional products
- Admin approval/decline workflow
- Supply request history and tracking

### Reporting (Ready for Implementation)

- Sales performance by store
- Payment status tracking (paid/unpaid)
- Inventory movement reports

---

## Project Structure

```
backend/
├── main.py                      # Application entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
├── SETUP_GUIDE.md              # Detailed setup instructions
├── start.sh / start.bat        # Quick start scripts
└── app/
    ├── core/                    # Core configuration
    │   ├── config.py           # Settings & environment
    │   ├── database.py         # Database connection
    │   ├── security.py         # JWT & password utilities
    │   └── dependencies.py     # Authentication middleware
    ├── models/                  # SQLAlchemy database models
    │   ├── user.py
    │   ├── product.py
    │   ├── store.py
    │   ├── inventory.py
    │   └── supply_request.py
    ├── routes/                  # API endpoints
    │   ├── auth.py             # Authentication endpoints
    │   ├── users.py            # User management
    │   ├── products.py         # Product management
    │   ├── inventory.py        # Inventory tracking
    │   ├── supply_requests.py  # Supply request workflow
    │   └── reports.py          # Store management
    ├── schemas/                 # Pydantic validation models
    │   ├── user.py
    │   ├── product.py
    │   ├── inventory.py
    │   └── reports.py
    └── services/                # Business logic
        ├── email_service.py
        └── report_service.py
```

---

## Getting Started

### Prerequisites

- **Python 3.10** or higher
- **PostgreSQL 12** or higher (or SQLite for development)
- **pip** (comes with Python)

### Quick Start (Linux/Mac)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Run quick start script (automatic setup)
chmod +x start.sh
./start.sh

# OR manual setup:

# 3. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Setup environment
cp .env.example .env
# Edit .env with your database details

# 6. Create database
createdb myduka  # PostgreSQL

# 7. Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Quick Start (Windows)

```cmd
cd backend
start.bat
```

---

## Configuration

### Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myduka

# Security (CHANGE IN PRODUCTION)
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256

# Token expiry
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS_RAW=http://localhost:3000,http://localhost:5173

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_FROM=noreply@myduka.com
```

**For Development:** Use SQLite

```env
DATABASE_URL=sqlite:///./myduka.db
```

### Database Migrations (Alembic)

```bash
# create a new migration
alembic revision --autogenerate -m "describe change"

# apply migrations
alembic upgrade head

# rollback one migration
alembic downgrade -1
```

---

## API Documentation

### Authentication Endpoints

#### Register New User

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "clerk@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123!",
  "phone": "+254712345678"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "clerk@example.com",
  "password": "SecurePass123!"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "clerk@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "clerk",
    "is_active": true,
    "created_at": "2024-01-29T10:00:00"
  }
}
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

#### Refresh Access Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout (Revoke Refresh Token)

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Product Endpoints

#### Create Product (Admin Only)

```http
POST /api/products/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Rice 50kg",
  "sku": "RICE-50K",
  "buying_price": 2000.00,
  "selling_price": 2500.00,
  "description": "Premium quality rice"
}
```

#### List Products

```http
GET /api/products/?skip=0&limit=10&active_only=true
Authorization: Bearer {access_token}
```

#### Get Product Details

```http
GET /api/products/{product_id}
Authorization: Bearer {access_token}
```

#### Update Product (Admin Only)

```http
PUT /api/products/{product_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Rice 50kg - Premium",
  "selling_price": 2600.00
}
```

---

### Inventory Endpoints

#### Record Inventory Entry

```http
POST /api/inventory/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "product_id": 1,
  "store_id": 1,
  "quantity_received": 100,
  "quantity_in_stock": 98,
  "quantity_spoilt": 2,
  "payment_status": "unpaid",
  "buying_price": 2000,
  "selling_price": 2500,
  "remarks": "Delivered on time"
}
```

#### List Inventory Records

```http
GET /api/inventory/?skip=0&limit=10&payment_status=unpaid
Authorization: Bearer {access_token}
```

#### Get Paid Items for Store (Admin)

```http
GET /api/inventory/store/{store_id}/paid
Authorization: Bearer {access_token}
```

#### Get Unpaid Items for Store (Admin)

```http
GET /api/inventory/store/{store_id}/unpaid
Authorization: Bearer {access_token}
```

---

### Supply Request Endpoints

#### Create Supply Request

```http
POST /api/supply-requests/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "product_id": 1,
  "store_id": 1,
  "quantity_requested": 50,
  "reason": "Stock running low"
}
```

#### List Supply Requests

```http
GET /api/supply-requests/?status=pending
Authorization: Bearer {access_token}
```

#### Approve Supply Request (Admin)

```http
POST /api/supply-requests/{request_id}/approve
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "admin_notes": "Approved for shipment"
}
```

#### Decline Supply Request (Admin)

```http
POST /api/supply-requests/{request_id}/decline
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "admin_notes": "Out of stock currently"
}
```

---

### User Management Endpoints

#### Create User (Admin Only)

```http
POST /api/users/create
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "email": "clerk2@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "password": "SecurePass123!",
  "role": "clerk",
  "store_id": 1
}
```

#### List Users (Admin Only)

```http
GET /api/users/?skip=0&limit=10
Authorization: Bearer {access_token}
```

#### Deactivate User (Admin)

```http
PATCH /api/users/{user_id}/deactivate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "is_active": false
}
```

#### Change Password

```http
POST /api/users/{user_id}/change-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "old_password": "OldPass123!",
  "new_password": "NewPass456!"
}
```

---

### Store Endpoints

#### Create Store (Admin Only)

```http
POST /api/stores/
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Downtown Store",
  "location": "Nairobi CBD",
  "phone": "+254712345678",
  "email": "downtown@myduka.com",
  "description": "Main store location"
}
```

#### List Stores

```http
GET /api/stores/?skip=0&limit=10&active_only=true
Authorization: Bearer {access_token}
```

#### Update Store (Admin Only)

```http
PUT /api/stores/{store_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Downtown Store - Updated",
  "location": "Nairobi CBD Extension"
}
```

---

## Authentication & Authorization

### How It Works

1. **Register/Login** → Get JWT tokens
2. **Store Token** → In browser/app storage
3. **Send Token** → With every API request in header:
   ```
   Authorization: Bearer {access_token}
   ```
4. **Automatic Validation** → Server validates token before processing request

### Role Permissions

| Action           | Clerk | Admin | Superuser |
| ---------------- | ----- | ----- | --------- |
| Register         | ✅    | ✅    | ✅        |
| Record Inventory | ✅    | ✅    | ✅        |
| Request Supply   | ✅    | ✅    | ✅        |
| Manage Products  | ❌    | ✅    | ✅        |
| Create Users     | ❌    | ✅    | ✅        |
| Approve Requests | ❌    | ✅    | ✅        |
| View Reports     | ❌    | ✅    | ✅        |
| Deactivate Users | ❌    | ✅    | ✅        |

---

## Testing

### Using Swagger UI (Recommended)

1. Go to http://localhost:8000/api/docs
2. Click "Authorize"
3. Paste your access token
4. Try out endpoints interactively

### Using cURL

```bash
# Register
curl -X POST "http://localhost:8000/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "password": "TestPass123!"
  }'

# Login
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }')

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# List products with token
curl -X GET "http://localhost:8000/api/products/" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn main:app --port 8001 --reload
```

### Database Connection Error

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Create database
createdb myduka

# Check connection in .env
DATABASE_URL=postgresql://user:password@localhost:5432/myduka
```

### Module Not Found

```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Import Errors

Ensure all files have proper `__init__.py`:

```bash
touch app/__init__.py
touch app/core/__init__.py
touch app/models/__init__.py
touch app/routes/__init__.py
touch app/schemas/__init__.py
touch app/services/__init__.py
```

---

## Performance Tips

1. **Use Connection Pooling** - Already configured in SQLAlchemy
2. **Enable Caching** - For frequently accessed data
3. **Pagination** - Always use pagination for list endpoints
4. **Indexes** - Database indexes on `email`, `product_id`, `store_id`
5. **Async Operations** - FastAPI automatically handles async operations

---

## Deployment Checklist

- [ ] Change `SECRET_KEY` to random string (32+ chars)
- [ ] Set `DEBUG=false`
- [ ] Use strong PostgreSQL password
- [ ] Configure CORS for your domain
- [ ] Use environment-specific `.env` files
- [ ] Set up SSL/HTTPS
- [ ] Configure logging
- [ ] Set up database backups
- [ ] Monitor server logs
- [ ] Use production ASGI server (Gunicorn + Uvicorn)

---

## Support

For issues or questions:

1. Check `SETUP_GUIDE.md` for detailed setup help
2. Review API documentation in Swagger UI
3. Check server logs in terminal
4. Verify `.env` configuration
5. Ensure database is running

---

## License

This project is for educational purposes. All rights reserved.

---

## Team

- **Backend Team**: Building FastAPI
- **Frontend Team**: Building React interface
- **Project Lead**: Coordinating all teams

---

## Implementation Checklist

- Authentication & JWT
- User Management
- Product Management
- Inventory Tracking
- Supply Requests
- Store Management
- Email Notifications (Ready to implement)
- Advanced Reporting (Ready to implement)
- Data Export (Ready to implement)

---

**Happy coding!**
