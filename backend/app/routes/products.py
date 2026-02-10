"""
Product management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import enforce_store_scope, get_current_user
from app.models.user import User
from app.models.store import Store
from app.models.product import Product
from app.models.stock_threshold import StockThreshold
from app.schemas.notifications import StockThresholdResponse, StockThresholdUpsert
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
)
from typing import List

router = APIRouter(prefix="/api/products", tags=["products"])


@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new product.
    Clerks/admins/merchants can create products for inventory workflows.
    """
    if current_user.role not in {"clerk", "admin", "superuser"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create products"
        )
    merchant_id = None
    if current_user.role == "superuser":
        merchant_id = current_user.id
    else:
        if not current_user.store_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Store is required")
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if not store:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
        merchant_id = store.merchant_id

    # Check if SKU already exists for this merchant
    existing_product = (
        db.query(Product)
        .filter(Product.sku == product_data.sku, Product.merchant_id == merchant_id)
        .first()
    )
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product with this SKU already exists"
        )
    
    new_product = Product(
        merchant_id=merchant_id,
        name=product_data.name,
        description=product_data.description,
        sku=product_data.sku,
        buying_price=product_data.buying_price,
        selling_price=product_data.selling_price
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    return ProductResponse.model_validate(new_product)


@router.get("/", response_model=List[ProductListResponse])
async def list_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
    active_only: bool = True
):
    """
    List all products
    """
    query = db.query(Product)
    
    if active_only:
        query = query.filter(Product.is_active == True)
    if current_user.role == "superuser":
        query = query.filter(Product.merchant_id == current_user.id)
    elif current_user.store_id:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store:
            query = query.filter(Product.merchant_id == store.merchant_id)
        else:
            query = query.filter(Product.id == -1)
    elif current_user.role in {"admin", "clerk"}:
        query = query.filter(Product.id == -1)
    
    products = query.offset(skip).limit(limit).all()
    return [ProductListResponse.model_validate(product) for product in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get product details by ID
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if current_user.role == "superuser" and product.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your account")
    if current_user.role in {"admin", "clerk"} and current_user.store_id:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store and product.merchant_id != store.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your store")
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update product details
    Only admins can update products
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if current_user.role not in {"admin", "superuser"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or merchant can update products"
        )
    if current_user.role == "superuser" and product.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your account")
    if current_user.role == "admin" and current_user.store_id:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store and product.merchant_id != store.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your store")

    # Check if new SKU is unique
    if product_data.sku and product_data.sku != product.sku:
        existing = (
            db.query(Product)
            .filter(Product.sku == product_data.sku, Product.merchant_id == product.merchant_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SKU already in use"
            )
    
    # Update fields
    if product_data.name:
        product.name = product_data.name
    if product_data.description:
        product.description = product_data.description
    if product_data.sku:
        product.sku = product_data.sku
    if product_data.buying_price:
        product.buying_price = product_data.buying_price
    if product_data.selling_price:
        product.selling_price = product_data.selling_price
    if product_data.is_active is not None:
        product.is_active = product_data.is_active
    
    db.commit()
    db.refresh(product)
    
    return ProductResponse.model_validate(product)


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a product
    Only admins can delete products
    """
    if current_user.role not in {"admin", "superuser"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or merchant can delete products"
        )

    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    if current_user.role == "superuser" and product.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your account")
    if current_user.role == "admin" and current_user.store_id:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store and product.merchant_id != store.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your store")
    
    db.delete(product)
    db.commit()
    
    return {"message": "Product deleted successfully"}


@router.get("/{product_id}/thresholds", response_model=List[StockThresholdResponse])
async def list_product_thresholds(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List low-stock thresholds for a product.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    if current_user.role == "superuser" and product.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your account")
    if current_user.role in {"admin", "clerk"} and current_user.store_id is not None:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store and product.merchant_id != store.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your store")
    query = db.query(StockThreshold).filter(StockThreshold.product_id == product_id)
    if current_user.role == "admin" and current_user.store_id is not None:
        query = query.filter(
            (StockThreshold.store_id == current_user.store_id) | (StockThreshold.store_id.is_(None))
        )
    thresholds = query.all()
    return [StockThresholdResponse.model_validate(row) for row in thresholds]


@router.put("/{product_id}/thresholds", response_model=StockThresholdResponse)
async def upsert_product_threshold(
    product_id: int,
    payload: StockThresholdUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set/update low-stock threshold for a product (admin/merchant only).
    """
    if current_user.role not in {"admin", "superuser"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or merchant can update thresholds"
        )
    if payload.min_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Threshold must be zero or greater"
        )
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    if current_user.role == "superuser" and product.merchant_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your account")
    if current_user.role in {"admin", "clerk"} and current_user.store_id is not None:
        store = db.query(Store).filter(Store.id == current_user.store_id).first()
        if store and product.merchant_id != store.merchant_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Product not in your store")

    store_scope_id = payload.store_id
    if store_scope_id is not None:
        enforce_store_scope(current_user, store_scope_id)
        if current_user.role == "superuser":
            store = db.query(Store).filter(Store.id == store_scope_id).first()
            if not store or store.merchant_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Store not in your account")
    elif current_user.role == "admin":
        store_scope_id = current_user.store_id

    threshold = (
        db.query(StockThreshold)
        .filter(
            StockThreshold.product_id == product_id,
            StockThreshold.store_id == store_scope_id,
        )
        .first()
    )
    if not threshold:
        threshold = StockThreshold(
            product_id=product_id,
            store_id=store_scope_id,
            min_quantity=payload.min_quantity,
        )
        db.add(threshold)
    else:
        threshold.min_quantity = payload.min_quantity

    db.commit()
    db.refresh(threshold)
    return StockThresholdResponse.model_validate(threshold)
