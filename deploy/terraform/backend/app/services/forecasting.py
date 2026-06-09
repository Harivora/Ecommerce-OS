"""MVP revenue forecasting: linear trend + confidence band.

Pure functions over a monthly revenue history. Phase-5 will replace this with
a proper time-series model.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ForecastPoint:
    month: str
    actual: float | None
    predicted: float
    lower: float
    upper: float


def _linear_fit(values: list[float]) -> tuple[float, float]:
    """Ordinary least squares slope/intercept over x = 0..n-1."""
    n = len(values)
    if n == 0:
        return 0.0, 0.0
    if n == 1:
        return 0.0, values[0]
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    denom = sum((x - mean_x) ** 2 for x in xs) or 1.0
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values)) / denom
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _next_months(last_label: str, count: int) -> list[str]:
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    try:
        idx = months.index(last_label[:3])
    except ValueError:
        idx = -1
    return [months[(idx + i) % 12] for i in range(1, count + 1)]


def generate_forecast(
    history: list[tuple[str, float]], periods: int = 3
) -> list[ForecastPoint]:
    """history is [(month_label, revenue), ...] in chronological order."""
    points: list[ForecastPoint] = []
    if not history:
        return points

    values = [v for _, v in history]
    slope, intercept = _linear_fit(values)

    # Residual std for the confidence band; fall back to 12% of mean.
    n = len(values)
    fitted = [intercept + slope * i for i in range(n)]
    if n >= 2:
        resid = [values[i] - fitted[i] for i in range(n)]
        variance = sum(r * r for r in resid) / n
        std = variance**0.5
    else:
        std = 0.0
    band = max(std * 1.96, (sum(values) / n) * 0.12)

    # Actuals (predicted == actual, tight band).
    for i, (label, val) in enumerate(history):
        points.append(ForecastPoint(month=label, actual=val, predicted=round(val, 2),
                                     lower=round(val, 2), upper=round(val, 2)))

    # Future predictions.
    future_labels = _next_months(history[-1][0], periods)
    for j, label in enumerate(future_labels, start=1):
        pred = intercept + slope * (n - 1 + j)
        pred = max(pred, 0.0)
        widening = band * (1 + 0.25 * (j - 1))
        points.append(
            ForecastPoint(
                month=label,
                actual=None,
                predicted=round(pred, 2),
                lower=round(max(pred - widening, 0.0), 2),
                upper=round(pred + widening, 2),
            )
        )
    return points
