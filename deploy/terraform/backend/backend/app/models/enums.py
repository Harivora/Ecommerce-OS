"""Shared string enums mirroring the frontend TypeScript union types."""
from __future__ import annotations

import enum


class PlanTier(str, enum.Enum):
    starter = "starter"
    growth = "growth"
    scale = "scale"


class OrgStatus(str, enum.Enum):
    active = "active"
    past_due = "past_due"  # payment overdue — flagged but can still log in
    suspended = "suspended"  # blocked at login until reactivated
    cancelled = "cancelled"


class UserRole(str, enum.Enum):
    super_admin = "super_admin"  # platform owner; not tied to one org
    owner = "owner"
    admin = "admin"
    viewer = "viewer"


class UserStatus(str, enum.Enum):
    active = "active"
    invited = "invited"
    inactive = "inactive"


class StorePlatform(str, enum.Enum):
    shopify = "shopify"
    woocommerce = "woocommerce"
    custom = "custom"


class ConnectionStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    available = "available"
    error = "error"
    coming_soon = "coming-soon"


class IntegrationCategory(str, enum.Enum):
    ecommerce = "ecommerce"
    ads = "ads"
    shipping = "shipping"
    payments = "payments"
    ai = "ai"  # internal: per-org AI provider key (not shown in the catalog)
    backup = "backup"  # off-site NAS backup connector


class ProductStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    draft = "draft"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class CustomerSegment(str, enum.Enum):
    vip = "vip"
    regular = "regular"
    new = "new"
    at_risk = "at-risk"


class AdPlatform(str, enum.Enum):
    meta = "meta"
    google = "google"


class SettlementStatus(str, enum.Enum):
    settled = "settled"
    pending = "pending"
    processing = "processing"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
