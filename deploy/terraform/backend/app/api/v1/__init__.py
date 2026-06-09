"""Aggregate all v1 routers under a single APIRouter."""
from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_console,
    ads,
    ai,
    auth,
    customers,
    dashboard,
    export,
    forecasting,
    integrations,
    orders,
    organizations,
    payments,
    products,
    shipping,
    team,
    webhooks,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_console.router, prefix="/admin", tags=["admin"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(team.router, prefix="/team", tags=["team"])
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(ads.router, prefix="/ads", tags=["ads"])
api_router.include_router(shipping.router, prefix="/shipping", tags=["shipping"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(forecasting.router, prefix="/forecasting", tags=["forecasting"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
