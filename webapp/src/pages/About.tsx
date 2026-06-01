import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLASS_ORDER } from "@/lib/classes";

const SOURCES = [
  { name: "MapBiomas Col. 10.1", desc: "Cobertura e uso da terra anual (2008–2024)." },
  { name: "TerraClass / INPE-Embrapa", desc: "Vegetação secundária e uso agropecuário na Amazônia e Cerrado." },
  { name: "LAPIG / UFG", desc: "Vigor e degradação de pastagens (col. 9)." },
  { name: "PAM / IBGE", desc: "Produção Agrícola Municipal — área plantada por cultura." },
  { name: "CONAB", desc: "Levantamentos de safra de grãos por UF (2008–2024)." },
  { name: "PRODES / INPE", desc: "Desmatamento de referência para conciliação." },
];

const PIPELINE = [
  { n: 1, t: "Carga de fontes", d: "Ingestão harmonizada de MapBiomas, TerraClass, LAPIG, PAM e CONAB." },
  { n: 2, t: "Lookups espaciais", d: "Mapeamento município → RGINT (composição IBGE 2017)." },
  { n: 3, t: "Subdivisão agrícola", d: "Desagregação de lavouras por RGINT a partir da PAM e CONAB." },
  { n: 4, t: "Conciliação", d: "Cruzamento TerraClass × MapBiomas para classes de vegetação." },
  { n: 5, t: "Matrizes de transição", d: "15×15 classes por RGINT nos anos-âncora 2008, 2017, 2024." },
  { n: 6, t: "Síntese & indicadores", d: "Pressão antrópica, regeneração e balanço líquido por região." },
];

const DOCS = [
  { id: "D1", label: "Dicionário & Pipeline", href: "https://github.com/aikiesan/ILUC_NIPE/blob/master/README_DICIONARIO_PIPELINE.md" },
  { id: "D3", label: "Relatório Metodológico", href: "https://github.com/aikiesan/ILUC_NIPE/blob/master/data_pipeline/RELATORIO_METODOLOGICO.md" },
  { id: "D4", label: "Status & Handoff", href: "https://github.com/aikiesan/ILUC_NIPE/blob/master/PROJETO_STATUS_HANDOFF.md" },
];

export default function About() {
  return (
    <div>
      <PageHeader
        title="Metodologia e Fontes"
        description="Base de dados de mudança de uso e cobertura da terra para as 133 Regiões Geográficas Intermediárias do Brasil, 2008–2024."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fontes de dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{s.name}</span>
                <span className="text-xs text-muted">{s.desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline de processamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PIPELINE.map((p) => (
              <div key={p.n} className="flex gap-3">
                <span className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {p.n}
                </span>
                <div>
                  <span className="text-sm font-medium text-foreground">{p.t}</span>
                  <p className="text-xs text-muted">{p.d}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sistema de 15 classes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Código</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Grupo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLASS_ORDER.map((cls) => {
                const [code, ...rest] = cls.split(" - ");
                const num = Number(code);
                const grupo =
                  num >= 11 ? "Vegetação nativa" : num >= 7 && num <= 9 ? "Pastagem" : "Antrópico";
                return (
                  <TableRow key={cls}>
                    <TableCell className="mono text-muted">{code}</TableCell>
                    <TableCell className="font-medium">{rest.join(" - ")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{grupo}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DOCS.map((d) => (
              <a
                key={d.id}
                href={d.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-accent underline-offset-2 hover:underline"
              >
                <Badge variant="solid">{d.id}</Badge>
                {d.label}
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Citação e contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted">
            <p className="rounded bg-highlight p-3 text-xs leading-relaxed text-foreground">
              CP2B/NIPE-UNICAMP (2026). <em>Mudança de uso e cobertura da terra nas Regiões
              Geográficas Intermediárias do Brasil, 2008–2024.</em> ABIOVE Biocombustíveis 2026,
              FAPESP 2025/08745-2. Dados: MapBiomas Col. 10.1.
            </p>
            <p>
              <strong className="text-foreground">CP2B / NIPE — UNICAMP</strong>
              <br />
              FAPESP 2025/08745-2
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
