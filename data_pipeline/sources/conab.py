"""CONAB café series adapter — culturas perenes (class 1)."""

from sources.base import BaseTimeSeriesAdapter
from utils import YEARS, _nan_to_none


class ConabCafeAdapter(BaseTimeSeriesAdapter):
    source_key = "conab_cafe"

    def __init__(self, pam=None, cafe_uf=None, rgint_index=None, rules=None):
        super().__init__(rules)
        self._pam = pam
        self._cafe_uf = cafe_uf
        self._uf_map: dict = {}
        if rgint_index:
            self._uf_map = {m["rgint"]: m["uf"] for m in rgint_index}

    def available_for(self, class_name: str) -> bool:
        return class_name == "1 - Culturas perenes"

    def get_series(self, rgint_id: str, class_name: str) -> list:
        if class_name != "1 - Culturas perenes":
            return [None] * len(YEARS)
        uf = self._uf_map.get(rgint_id)
        return self._cafe_rgint_series(rgint_id, uf)

    def _cafe_rgint_series(self, rgint_id: str, uf) -> list:
        if self._pam is not None:
            cafe_col = next(
                (c for c in self._pam["crop"].unique() if "caf" in str(c).lower()), None
            )
            if cafe_col:
                sub = self._pam[
                    (self._pam["rgint_id"] == rgint_id) &
                    (self._pam["crop"].str.lower() == cafe_col.lower())
                ]
                sub = sub.set_index("year")["area_ha"].reindex(YEARS)
                return _nan_to_none(sub.tolist())

        if self._cafe_uf is None or uf is None:
            return [None] * len(YEARS)

        pam_milho = self._milho_pam_series(rgint_id)
        result = []
        for i, year in enumerate(YEARS):
            uf_cafe_row = self._cafe_uf[
                (self._cafe_uf["uf"] == uf) & (self._cafe_uf["year"] == year)
            ]
            uf_cafe_val = float(uf_cafe_row["area_ha"].iloc[0]) if len(uf_cafe_row) else None
            if uf_cafe_val is None:
                result.append(None)
                continue
            uf_milho_total = self._pam[
                (self._pam["uf"] == uf) &
                (self._pam["year"] == year) &
                (self._pam["crop"].str.lower() == "milho")
            ]["area_ha"].sum() if self._pam is not None else 0
            rgint_milho = pam_milho[i]
            if uf_milho_total and rgint_milho is not None and uf_milho_total > 0:
                result.append(round(uf_cafe_val * rgint_milho / uf_milho_total, 2))
            else:
                n_rgints = self._pam[
                    (self._pam["uf"] == uf) & (self._pam["year"] == year)
                ]["rgint_id"].nunique() if self._pam is not None else 0
                result.append(round(uf_cafe_val / max(n_rgints, 1), 2) if n_rgints else None)
        return result

    def _milho_pam_series(self, rgint_id: str) -> list:
        if self._pam is None:
            return [None] * len(YEARS)
        sub = self._pam[
            (self._pam["rgint_id"] == rgint_id) &
            (self._pam["crop"].str.lower() == "milho")
        ]
        sub = sub.set_index("year")["area_ha"].reindex(YEARS)
        return _nan_to_none(sub.tolist())
