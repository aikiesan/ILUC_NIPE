"""LAPIG pasture vigor adapter — degradação baixa / média / alta."""

from sources.base import BaseTimeSeriesAdapter
from utils import YEARS, _nan_to_none

_CLASS_TO_VIGOR = {
    "7 - Pastagem deg. média":  "Intermediário",
    "8 - Pastagem deg. alta":   "Severa",
    "9 - Pastagem deg. baixa":  "Ausente",
}


class LapigAdapter(BaseTimeSeriesAdapter):
    source_key = "lapig_vigor"

    def __init__(self, lapig=None, rules=None):
        super().__init__(rules)
        self._lapig = lapig

    def available_for(self, class_name: str) -> bool:
        return class_name in _CLASS_TO_VIGOR

    def get_series(self, rgint_id: str, class_name: str) -> list:
        if self._lapig is None or class_name not in _CLASS_TO_VIGOR:
            return [None] * len(YEARS)
        vigor = _CLASS_TO_VIGOR[class_name]
        sub = self._lapig[
            (self._lapig["rgint_id"] == rgint_id) &
            (self._lapig["classe"] == vigor)
        ]
        sub = sub.set_index("year")["area_past_ha"].reindex(YEARS)
        return _nan_to_none(sub.tolist())
