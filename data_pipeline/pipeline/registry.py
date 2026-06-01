"""SourceRegistry — OCP-compliant adapter registry.

New sources extend via register(), never by editing dispatch logic.
"""

from sources.base import ITimeSeriesSource


class SourceRegistry:
    def __init__(self):
        self._adapters: list = []

    def register(self, adapter: ITimeSeriesSource) -> None:
        self._adapters.append(adapter)

    def adapters_for(self, class_name: str) -> list:
        return [a for a in self._adapters if a.available_for(class_name)]

    @classmethod
    def from_quality_rules(cls, pam=None, lapig=None, cafe_uf=None,
                           milho_split_uf=None, cruzamento=None, rgint_index=None):
        """Build registry with all known adapters, optionally injecting DataFrames."""
        from sources.mapbiomas import MapBiomasAdapter
        from sources.pam_ibge import PamIbgeAdapter
        from sources.lapig import LapigAdapter
        from sources.conab import ConabCafeAdapter
        from sources.terraclass import (
            MbPastagemAdapter, TcPastagemAdapter,
            MbFlorestaAdapter, TcFlorestaPrimAdapter, TcFlorestaSecAdapter,
            MbSavanaAdapter, TcNaoFlorestalAdapter,
        )

        registry = cls()
        registry.register(MapBiomasAdapter())
        registry.register(PamIbgeAdapter(pam=pam, milho_split_uf=milho_split_uf, rgint_index=rgint_index))
        registry.register(LapigAdapter(lapig=lapig))
        registry.register(ConabCafeAdapter(pam=pam, cafe_uf=cafe_uf, rgint_index=rgint_index))
        registry.register(MbPastagemAdapter(cruzamento=cruzamento))
        registry.register(TcPastagemAdapter(cruzamento=cruzamento))
        registry.register(MbFlorestaAdapter(cruzamento=cruzamento))
        registry.register(TcFlorestaPrimAdapter(cruzamento=cruzamento))
        registry.register(TcFlorestaSecAdapter(cruzamento=cruzamento))
        registry.register(MbSavanaAdapter(cruzamento=cruzamento))
        registry.register(TcNaoFlorestalAdapter(cruzamento=cruzamento))
        return registry
