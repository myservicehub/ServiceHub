from decimal import Decimal, InvalidOperation
import os
from typing import Optional, Dict

COIN_VALUE_NAIRA = Decimal("100")
DEFAULT_VAT_RATE = Decimal(str(os.environ.get("VAT_RATE", "0.075")))


def to_decimal(value, default: str = "0") -> Decimal:
    """Safely convert unknown numeric input to Decimal."""
    try:
        if value is None:
            return Decimal(default)
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(default)


def naira_to_coins(amount_naira) -> Decimal:
    """Convert naira amount to coins using exact decimal math."""
    naira = max(to_decimal(amount_naira, "0"), Decimal("0"))
    return naira / COIN_VALUE_NAIRA


def coins_to_naira(amount_coins) -> Decimal:
    """Convert coins amount to naira using exact decimal math."""
    coins = max(to_decimal(amount_coins, "0"), Decimal("0"))
    return coins * COIN_VALUE_NAIRA


def vat_inclusive_breakdown(base_naira, vat_rate: Optional[Decimal] = None) -> Dict[str, Decimal]:
    """Return exact VAT breakdown for a base naira amount."""
    base = max(to_decimal(base_naira, "0"), Decimal("0"))
    rate = vat_rate if vat_rate is not None else DEFAULT_VAT_RATE
    vat = base * rate
    total = base + vat
    return {
        "base_naira": base,
        "vat_rate": rate,
        "vat_naira": vat,
        "total_naira": total,
        "total_coins": naira_to_coins(total),
    }


def to_float(value) -> float:
    """Serialize Decimal-like values to float for JSON/Pydantic payloads."""
    return float(to_decimal(value, "0"))
