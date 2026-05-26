"""MapBiomas pipeline diagonal adapter — available for all 15 classes."""

from sources.base import BaseTimeSeriesAdapter
from utils import YEARS, _nan_to_none


class MapBiomasAdapter(BaseTimeSeriesAdapter):
    source_key = "pipeline_diagonal"

    def __init__(self, rules=None):
        super().__init__(rules)
        self._cache: dict = {}

    def available_for(self, class_name: str) -> bool:
        return True

    def get_series(self, rgint_id: str, class_name: str) -> list:
        if rgint_id not in self._cache:
            from utils import load_existing_diagonal
            self._cache[rgint_id] = load_existing_diagonal(rgint_id)
        diagonal = self._cache[rgint_id]
        year_dict = diagonal.get(class_name, {})
        val_map = {}
        for k, v in year_dict.items():
            try:
                val_map[int(k)] = v
            except (ValueError, TypeError):
                pass
        return _nan_to_none([val_map.get(y) for y in YEARS])
