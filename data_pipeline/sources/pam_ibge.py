"""PAM/IBGE crop area adapter — soja, milho splits, cana."""

from sources.base import BaseTimeSeriesAdapter
from utils import YEARS, _nan_to_none

_CROP_CLASSES = {
    "2 - Soja":                  ("soja",    None),
    "3 - Soja + Milho 2ª safra": ("milho",   "2a"),
    "4 - Milho 1ª safra":        ("milho",   "1a"),
    "5 - Cana-de-açúcar":        ("cana",    None),
}


class PamIbgeAdapter(BaseTimeSeriesAdapter):
    source_key = "conab_pam"

    def __init__(self, pam=None, milho_split_uf=None, rgint_index=None, rules=None):
        super().__init__(rules)
        self._pam = pam
        self._milho_split_uf = milho_split_uf
        self._uf_map: dict = {}
        if rgint_index:
            self._uf_map = {m["rgint"]: m["uf"] for m in rgint_index}

    def available_for(self, class_name: str) -> bool:
        return class_name in _CROP_CLASSES

    def get_series(self, rgint_id: str, class_name: str) -> list:
        if self._pam is None or class_name not in _CROP_CLASSES:
            return [None] * len(YEARS)
        crop, safra = _CROP_CLASSES[class_name]
        if safra is not None:
            return self._milho_split(rgint_id, crop, safra)
        return self._pam_series(rgint_id, crop)

    def _pam_series(self, rgint_id: str, crop: str) -> list:
        sub = self._pam[
            (self._pam["rgint_id"] == rgint_id) &
            (self._pam["crop"].str.lower() == crop.lower())
        ]
        sub = sub.set_index("year")["area_ha"].reindex(YEARS)
        return _nan_to_none(sub.tolist())

    def _milho_split(self, rgint_id: str, crop: str, safra: str) -> list:
        pam_vals = self._pam_series(rgint_id, crop)
        uf = self._uf_map.get(rgint_id)
        result = []
        for i, year in enumerate(YEARS):
            v = pam_vals[i]
            pct = self._pct_2a(uf, year) if uf else None
            if v is None or pct is None:
                result.append(v)
            else:
                frac = pct if safra == "2a" else (1 - pct)
                result.append(round(v * frac, 4))
        return result

    def _pct_2a(self, uf: str, year: int):
        if self._milho_split_uf is None or uf is None:
            return None
        row = self._milho_split_uf[
            (self._milho_split_uf["uf"] == uf) &
            (self._milho_split_uf["year"] == year)
        ]
        return float(row["pct_2a"].iloc[0]) if len(row) else None
