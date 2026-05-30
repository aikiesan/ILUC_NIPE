import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartSkeleton, EmptyState, ErrorState } from "@/components/common/StateBlocks";
import { RegionSummary } from "@/components/region/RegionSummary";
import { TabTransitions } from "@/components/region/TabTransitions";
import { TabTimeseries } from "@/components/region/TabTimeseries";
import { TabMatrix } from "@/components/region/TabMatrix";
import { TabPam } from "@/components/region/TabPam";
import { useAsync } from "@/lib/useAsync";
import { loadIndicators, loadMeta, loadRegionSeries } from "@/lib/data";

export default function Region() {
  const { id = "" } = useParams();
  const meta = useAsync(loadMeta, []);
  const indicators = useAsync(loadIndicators, []);
  const series = useAsync(() => loadRegionSeries(id), [id]);

  const region = useMemo(
    () => meta.data?.find((m) => m.id === id),
    [meta.data, id],
  );
  const indicator = useMemo(
    () => indicators.data?.find((i) => String(i.rgint_id) === id),
    [indicators.data, id],
  );

  if (meta.loading) return <ChartSkeleton height={500} />;
  if (meta.error) return <ErrorState error={meta.error} />;
  if (!region) {
    return (
      <EmptyState title="Região não encontrada">
        Nenhuma RGINT com o identificador {id}.
      </EmptyState>
    );
  }

  return (
    <div>
      <Link
        to="/ranking"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao ranking
      </Link>

      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <RegionSummary meta={region} indicator={indicator} />

        <Card>
          <CardHeader>
            <CardTitle>Análise detalhada</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="transicoes">
              <TabsList>
                <TabsTrigger value="transicoes">Transições</TabsTrigger>
                <TabsTrigger value="serie">Série temporal</TabsTrigger>
                <TabsTrigger value="matriz">Matriz</TabsTrigger>
                <TabsTrigger value="pam">Produção (PAM)</TabsTrigger>
              </TabsList>

              <TabsContent value="transicoes">
                <TabTransitions regionId={id} />
              </TabsContent>

              <TabsContent value="serie">
                {series.loading ? (
                  <ChartSkeleton height={300} />
                ) : series.error || !series.data ? (
                  <EmptyState title="Série temporal indisponível" />
                ) : (
                  <TabTimeseries series={series.data} />
                )}
              </TabsContent>

              <TabsContent value="matriz">
                <TabMatrix regionId={id} />
              </TabsContent>

              <TabsContent value="pam">
                <TabPam regionId={id} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
