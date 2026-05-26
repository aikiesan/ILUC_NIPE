"""TerraClass + MapBiomas cruzamento adapters (MB/TC cross-validation sources)."""

from sources.base import BaseTimeSeriesAdapter
from utils import YEARS, _nan_to_none


class _CruzamentoAdapter(BaseTimeSeriesAdapter):
    """Base for all cruzamento_rgint column-based adapters."""

    _classes: tuple
    _cols: list      # column(s) to sum from cruzamento_rgint

    def __init__(self, cruzamento=None, rules=None):
        super().__init__(rules)
        self._cruzamento = cruzamento

    def available_for(self, class_name: str) -> bool:
        return class_name in self._classes

    def get_series(self, rgint_id: str, class_name: str) -> list:
        if self._cruzamento is None:
            return [None] * len(YEARS)
        sub = self._cruzamento[self._cruzamento["rgint_id"] == rgint_id].set_index("year")
        valid_cols = [c for c in self._cols if c in sub.columns]
        if not valid_cols:
            return [None] * len(YEARS)
        return _nan_to_none(sub[valid_cols].sum(axis=1).reindex(YEARS).tolist())


_PASTURE_CLASSES = (
    "7 - Pastagem deg. média",
    "8 - Pastagem deg. alta",
    "9 - Pastagem deg. baixa",
)

_FOREST_CLASSES = (
    "11 - Veg. prim. florestal",
    "12 - Veg. sec. florestal",
)

_SAVANA_CLASSES = (
    "13 - Veg. prim. não-florestal",
    "14 - Veg. sec. não-florestal",
)


class MbPastagemAdapter(_CruzamentoAdapter):
    source_key = "mb_pastagem_total"
    _classes = _PASTURE_CLASSES
    _cols = ["MB_Pastagem_ha"]


class TcPastagemAdapter(_CruzamentoAdapter):
    source_key = "tc_pastagem"
    _classes = _PASTURE_CLASSES
    _cols = ["Pastagem_Herbacea", "Pastagem_Arbustiva_Arborea"]


class MbFlorestaAdapter(_CruzamentoAdapter):
    source_key = "mb_floresta_total"
    _classes = _FOREST_CLASSES
    _cols = ["MB_Floresta_ha"]


class TcFlorestaPrimAdapter(_CruzamentoAdapter):
    source_key = "tc_floresta_prim"
    _classes = ("11 - Veg. prim. florestal",)
    _cols = ["Veg_Florestal_Primaria"]


class TcFlorestaSecAdapter(_CruzamentoAdapter):
    source_key = "tc_floresta_sec"
    _classes = ("12 - Veg. sec. florestal",)
    _cols = ["Veg_Florestal_Secundaria"]


class MbSavanaAdapter(_CruzamentoAdapter):
    source_key = "mb_savana_total"
    _classes = _SAVANA_CLASSES
    _cols = ["MB_Savana_ha"]


class TcNaoFlorestalAdapter(_CruzamentoAdapter):
    source_key = "tc_nao_florestal"
    _classes = _SAVANA_CLASSES
    _cols = ["Natural_Nao_Florestal"]
