"""Payment settlements: report + manual entry (until Razorpay connector exists)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.ads import _enqueue_recompute
from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.models.finance import PaymentFee
from app.schemas.finance import PaymentFeeCreate, PaymentSettlementOut

router = APIRouter()


def _to_settlement(p: PaymentFee) -> PaymentSettlementOut:
    return PaymentSettlementOut(
        id=p.id,
        gateway=p.gateway,
        amount=p.amount,
        fees=p.fees,
        net_amount=p.net_amount,
        date=p.date.isoformat() if p.date else None,
        status=p.status,
        method=p.method,
    )


@router.get("", response_model=list[PaymentSettlementOut])
async def list_settlements(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[PaymentSettlementOut]:
    rows = (
        await db.scalars(
            select(PaymentFee)
            .where(PaymentFee.organization_id == org_id)
            .order_by(PaymentFee.date.desc().nullslast())
        )
    ).all()
    return [_to_settlement(p) for p in rows]


@router.post("", response_model=PaymentSettlementOut, status_code=201)
async def create_payment_fee(
    payload: PaymentFeeCreate,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> PaymentSettlementOut:
    data = payload.model_dump()
    row = PaymentFee(
        organization_id=org_id,
        net_amount=data["amount"] - data["fees"],
        **data,
    )
    db.add(row)
    await db.flush()
    _enqueue_recompute(org_id)
    return _to_settlement(row)
