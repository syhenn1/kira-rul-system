"""Factory helpers for building fixture rows matching the shape consumed by
``build_prompt`` / ``_rule_based_summary`` in summarizer.py:

    (id, asset_name, brand, category, status, maintenance_count,
     average_down_time, total_maintenance_cost, max_maintenance_cost,
     mode_severity, predicted_rul, recorded_at)

Index 10 is ``predicted_rul`` and index 3 is ``category`` — both are referenced
directly by index in summarizer.py (_rule_based_summary, build_prompt), so the
factory below preserves that exact tuple shape rather than using a dataclass.

``make_asset_dict`` / ``row_to_asset_dict`` mirror the same fixture in the shape
the summarizer now actually receives over the wire: the `asset_insights` records
from the backend's aggregated dashboard payload (see /api/dashboard and
/api/summarize in kira-backend, and `rows_from_dashboard_assets` in summarizer.py).
"""
from datetime import datetime


def make_row(
    id="asset-1",
    name="AC Split Lobby",
    brand="Sharp",
    category="Mechanical",
    status="Active",
    maintenance_count=3,
    average_down_time=12.5,
    total_cost=1_500_000.0,
    max_cost=800_000.0,
    mode_severity="normal",
    pred_rul=1000,
    recorded_at=None,
):
    if recorded_at is None:
        recorded_at = datetime(2026, 1, 1, 8, 0, 0)
    return (
        id,
        name,
        brand,
        category,
        status,
        maintenance_count,
        average_down_time,
        total_cost,
        max_cost,
        mode_severity,
        pred_rul,
        recorded_at,
    )


def make_rows(*overrides_list):
    """Build a list of rows from a list of dicts of overrides for make_row."""
    return [make_row(**overrides) for overrides in overrides_list]


def row_to_asset_dict(row):
    """Convert a `make_row` tuple into the `asset_insights` dict shape the
    summarizer receives from the backend's dashboard payload."""
    (id, name, brand, category, status, maintenance_count, average_down_time,
     total_cost, max_cost, mode_severity, pred_rul, recorded_at) = row
    return {
        "id": id,
        "name": name,
        "brand": brand,
        "category": category,
        "status": status,
        "maintenance_count": maintenance_count,
        "average_down_time": average_down_time,
        "total_maintenance_cost": total_cost,
        "max_maintenance_cost": max_cost,
        "mode_severity": mode_severity,
        "predicted_rul": pred_rul,
        "recorded_at": recorded_at,
    }


def make_asset_dict(**overrides):
    """Build a single `asset_insights`-shaped dict directly (uses make_row's
    defaults/overrides, then converts to the dict shape)."""
    return row_to_asset_dict(make_row(**overrides))


def make_asset_dicts(*overrides_list):
    """Build a list of `asset_insights`-shaped dicts from a list of override dicts."""
    return [make_asset_dict(**overrides) for overrides in overrides_list]
