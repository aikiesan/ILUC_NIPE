import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Download, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartSkeleton, ErrorState } from "@/components/common/StateBlocks";
import { useAsync } from "@/lib/useAsync";
import { downloadCsv, loadIndicators } from "@/lib/data";
import { formatHa, formatSignedHa } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RegionIndicator } from "@/lib/types";

type SortKey = keyof Pick<
  RegionIndicator,
  "ranking_pressao" | "nome" | "uf" | "bioma" | "pressao_ha" | "regeneracao_ha" | "balanco_ha" | "soja_2024_ha"
>;

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "ranking_pressao", label: "#", numeric: true },
  { key: "nome", label: "RGINT" },
  { key: "uf", label: "UF" },
  { key: "bioma", label: "Bioma" },
  { key: "pressao_ha", label: "Pressão (ha)", numeric: true },
  { key: "regeneracao_ha", label: "Regeneração (ha)", numeric: true },
  { key: "balanco_ha", label: "Balanço (ha)", numeric: true },
  { key: "soja_2024_ha", label: "Soja (ha)", numeric: true },
];

export default function Ranking() {
  const { data, loading, error } = useAsync(loadIndicators, []);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ranking_pressao");
  const [asc, setAsc] = useState(true);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.filter(
          (r) => r.nome.toLowerCase().includes(q) || r.uf.toLowerCase().includes(q),
        )
      : data;
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "pt-BR");
      return asc ? cmp : -cmp;
    });
    return sorted;
  }, [data, query, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "nome" || key === "uf" || key === "bioma" || key === "ranking_pressao");
    }
  };

  if (loading) return <ChartSkeleton height={500} />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      <PageHeader
        title="Ranking de Pressão por RGINT"
        description="As 133 Regiões Geográficas Intermediárias ordenadas por pressão antrópica acumulada sobre a vegetação nativa (2008–2024)."
        actions={
          <button
            onClick={() => downloadCsv("ranking_rgint.csv", rows as unknown as Record<string, unknown>[])}
            className="flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-highlight"
          >
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
        }
      />

      <div className="mb-4 flex max-w-sm items-center gap-2 rounded border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou UF…"
          className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn("cursor-pointer select-none", col.numeric && "text-right")}
                  onClick={() => toggleSort(col.key)}
                >
                  <span className={cn("inline-flex items-center gap-1", col.numeric && "flex-row-reverse")}>
                    {col.label}
                    <ArrowUpDown className={cn("h-3 w-3", sortKey === col.key ? "text-foreground" : "text-border")} />
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.rgint_id}
                onClick={() => navigate(`/region/${r.rgint_id}`)}
                className={cn(
                  "cursor-pointer",
                  r.ranking_pressao <= 10 && "bg-highlight font-medium",
                )}
              >
                <TableCell className="mono text-right text-muted">{r.ranking_pressao}</TableCell>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell><Badge variant="outline">{r.uf}</Badge></TableCell>
                <TableCell className="text-muted">{r.bioma}</TableCell>
                <TableCell className="text-right tnum">{formatHa(r.pressao_ha)}</TableCell>
                <TableCell className="text-right tnum">{formatHa(r.regeneracao_ha)}</TableCell>
                <TableCell className="text-right tnum">{formatSignedHa(r.balanco_ha)}</TableCell>
                <TableCell className="text-right tnum">{formatHa(r.soja_2024_ha)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="mt-3 text-xs text-muted">
        {rows.length} regiões · linhas destacadas = 10 maiores pressões · clique para abrir a ficha analítica.
      </p>
    </div>
  );
}
