"""
Matrix validation: mass-balance checks and coverage reporting.
Pure computation — no file I/O. Callers load data and pass dicts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class MassBalanceError:
    year: int
    from_class: str
    row_sum: float
    reference_area: float
    error_pct: float


@dataclass
class ValidationResult:
    rgint_id: str
    is_valid: bool
    has_negatives: bool
    has_nulls: bool
    mass_balance_errors: list[MassBalanceError] = field(default_factory=list)
    error_count: int = 0
    warning_messages: list[str] = field(default_factory=list)


@dataclass
class CoverageReport:
    total_rgints: int
    present_ids: list[str]
    missing_ids: list[str]
    coverage_pct: float


def _is_null(v) -> bool:
    if v is None:
        return True
    if isinstance(v, float) and math.isnan(v):
        return True
    return False


class MatrixValidator:
    def validate_mass_balance(
        self,
        matrix_data: dict,
        diagonal: Optional[dict] = None,
        tolerance_pct: float = 5.0,
    ) -> ValidationResult:
        """
        Validates a single matrix JSON dict (as returned by /api/rgint_matrix/{id}).

        Checks:
        - All cell values >= 0 and not NaN/None
        - If diagonal provided: row_sum vs diagonal area within tolerance_pct
        """
        rgint_id = matrix_data.get("metadata", {}).get("rgint", "unknown")
        has_negatives = False
        has_nulls = False
        mass_balance_errors: list[MassBalanceError] = []
        warnings: list[str] = []

        matrices = matrix_data.get("matrices", {})

        for year_str, year_matrix in matrices.items():
            if not isinstance(year_matrix, dict):
                warnings.append(f"Year {year_str}: expected dict, got {type(year_matrix).__name__}")
                continue

            for from_cls, row in year_matrix.items():
                if not isinstance(row, dict):
                    warnings.append(f"Year {year_str}, class {from_cls}: expected dict row")
                    continue

                row_sum = 0.0
                for to_cls, val in row.items():
                    if _is_null(val):
                        has_nulls = True
                        continue
                    if not isinstance(val, (int, float)):
                        has_nulls = True
                        continue
                    if val < 0:
                        has_negatives = True
                    else:
                        row_sum += val

                if diagonal is not None:
                    cls_diag = diagonal.get(from_cls, {})
                    ref = cls_diag.get(year_str) if isinstance(cls_diag, dict) else None
                    if ref is not None and not _is_null(ref) and ref > 0:
                        err_pct = abs(row_sum - ref) / ref * 100.0
                        if err_pct > tolerance_pct:
                            mass_balance_errors.append(MassBalanceError(
                                year=int(year_str),
                                from_class=from_cls,
                                row_sum=round(row_sum, 4),
                                reference_area=round(float(ref), 4),
                                error_pct=round(err_pct, 2),
                            ))

        is_valid = not has_negatives and not has_nulls and len(mass_balance_errors) == 0
        return ValidationResult(
            rgint_id=rgint_id,
            is_valid=is_valid,
            has_negatives=has_negatives,
            has_nulls=has_nulls,
            mass_balance_errors=mass_balance_errors,
            error_count=len(mass_balance_errors),
            warning_messages=warnings,
        )

    def validate_coverage(
        self,
        matrix_dir: Path,
        rgint_index: list[dict],
    ) -> CoverageReport:
        """
        Checks which RGINTs from rgint_index have a matrix JSON in matrix_dir.
        """
        all_ids = [str(r.get("rgint", r.get("id", ""))) for r in rgint_index]
        total = len(all_ids)

        present_ids = []
        missing_ids = []
        for rgint_id in all_ids:
            if (matrix_dir / f"{rgint_id}.json").exists():
                present_ids.append(rgint_id)
            else:
                missing_ids.append(rgint_id)

        coverage_pct = (len(present_ids) / total * 100.0) if total > 0 else 0.0
        return CoverageReport(
            total_rgints=total,
            present_ids=present_ids,
            missing_ids=missing_ids,
            coverage_pct=round(coverage_pct, 2),
        )
