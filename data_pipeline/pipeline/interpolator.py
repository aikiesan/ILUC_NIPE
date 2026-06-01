"""Linear matrix interpolator (SRP): interpolates 15×15 transition matrices between anchor years."""

from utils import YEARS

ANCHOR_YEARS = [2008, 2017, 2024]


def interpolate_matrix(
    m_start: dict, m_end: dict,
    year_start: int, year_end: int, year_target: int,
) -> dict:
    """
    Per-cell linear interpolation between two anchor matrices.
    t = (year_target - year_start) / (year_end - year_start)
    value = m_start[i][j] + t * (m_end[i][j] - m_start[i][j])
    """
    if year_end == year_start:
        return {fc: dict(row) for fc, row in m_start.items()}

    t = (year_target - year_start) / (year_end - year_start)
    all_from = set(m_start) | set(m_end)
    result = {}
    for from_cls in all_from:
        row_start = m_start.get(from_cls, {})
        row_end   = m_end.get(from_cls, {})
        all_to    = set(row_start) | set(row_end)
        result[from_cls] = {
            to_cls: row_start.get(to_cls, 0.0) + t * (row_end.get(to_cls, 0.0) - row_start.get(to_cls, 0.0))
            for to_cls in all_to
        }
    return result


def build_annual_matrices(anchor_map: dict) -> dict:
    """
    Given {anchor_year: matrix}, produce {year: matrix} for every year in YEARS
    by linear interpolation between adjacent anchors.
    Years before the first anchor or after the last are clamped (no extrapolation).
    """
    anchor_years = sorted(anchor_map)
    result = {}
    for year in YEARS:
        if year in anchor_map:
            result[year] = anchor_map[year]
        elif year < anchor_years[0]:
            result[year] = anchor_map[anchor_years[0]]
        elif year > anchor_years[-1]:
            result[year] = anchor_map[anchor_years[-1]]
        else:
            lower = max(y for y in anchor_years if y <= year)
            upper = min(y for y in anchor_years if y >= year)
            result[year] = interpolate_matrix(
                anchor_map[lower], anchor_map[upper], lower, upper, year
            )
    return result
