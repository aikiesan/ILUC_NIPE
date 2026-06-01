"""Abstract interfaces for data source adapters (ISP / DIP)."""

from abc import ABC, abstractmethod


class ITimeSeriesSource(ABC):
    """Produces a time-series list of area values per RGINT and class."""

    source_key: str

    @abstractmethod
    def available_for(self, class_name: str) -> bool: ...

    @abstractmethod
    def get_series(self, rgint_id: str, class_name: str) -> list:
        """Return area values aligned to YEARS (2008-2024), None for missing."""

    @abstractmethod
    def get_quality(self, class_name: str) -> str:
        """Return 'primary' or 'fallback'."""

    @abstractmethod
    def get_notes(self, class_name: str) -> str: ...


class IMatrixSource(ABC):
    """Produces a full 15×15 transition matrix per RGINT for given years."""

    source_key: str

    @abstractmethod
    def get_matrix(self, rgint_id: str, year: int) -> dict:
        """Return {from_class: {to_class: area_ha}}. Missing cells = 0.0."""

    @abstractmethod
    def available_years(self) -> list: ...


class BaseTimeSeriesAdapter(ITimeSeriesSource):
    """Mixin: loads quality/notes from quality_rules.yaml."""

    def __init__(self, rules=None):
        if rules is None:
            from utils import load_quality_rules
            rules = load_quality_rules()
        self._rules = rules

    def get_quality(self, class_name: str) -> str:
        rule = self._rules.get(class_name, {})
        primary = rule.get("primary", "pipeline_diagonal")
        return "primary" if primary == self.source_key else "fallback"

    def get_notes(self, class_name: str) -> str:
        quality = self.get_quality(class_name)
        rule = self._rules.get(class_name, {})
        key = "notes_primary" if quality == "primary" else "notes_fallback"
        return rule.get(key, self.source_key)
