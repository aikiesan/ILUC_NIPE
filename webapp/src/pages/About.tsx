import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLASS_META } from "@/lib/classes";

const SOURCES = [
  { name: "MapBiomas Col. 10.1", desc: "Cobertura e uso da terra anual (2008–2024), 30 m. Base das 12 classes originais." },
  { name: "TerraClass / INPE-Embrapa", desc: "Proporção vegetação primária/secundária na Amazônia (2008–2022) e Cerrado (2018–2024)." },
  { name: "LAPIG / UFG", desc: "Vigor e degradação de pastagens por município (col. 9, 2008–2023)." },
  { name: "PAM / IBGE", desc: "Produção Agrícola Municipal — área plantada por cultura (Tabela 5457)." },
  { name: "CONAB", desc: "Série histórica de grãos por UF — split milho 1ª/2ª safra (2008–2024)." },
  { name: "PRODES / INPE", desc: "Desmatamento de referência para os flags de qualidade do TerraClass." },
];

const PIPELINE = [
  { n: 1, t: "Matrizes-base 12 classes", d: "ArcGIS Pro (Zonal Histogram) sobre MapBiomas Col. 10.1 — 133 matrizes 12×12 por par de anos." },
  { n: 2, t: "Lookups espaciais", d: "Mapeamento município → RGINT (composição IBGE 2017)." },
  { n: 3, t: "Subdivisão da pastagem", d: "Proporções de vigor LAPIG aplicadas à pastagem MapBiomas → classes 7, 8, 9." },
  { n: 4, t: "Subdivisão agrícola", d: "Split soja/safrinha via CONAB (classes 2, 3) e milho 1ª safra via PAM (classe 4)." },
  { n: 5, t: "Subdivisão da vegetação", d: "Proporções primária/secundária TerraClass → classes 11–14." },
  { n: 6, t: "Matrizes finais & validação", d: "133 matrizes 15×15; LOG_AUDITORIA verifica conservação de área, soja e pastagem." },
];

/** Limitações e pendências metodológicas — D1 §13. */
const LIMITS = [
  { ref: "L1", lim: "TerraClass Cerrado inicia em 2018; 2008–2017 extrapolado com o valor de 2018.", mit: "Extrapolação conservadora; sinalizada nas fichas do Cerrado." },
  { ref: "L2", lim: "MT TerraClass 2008–2010 extrapolado via máscara PRODES — não confiável.", mit: "FLAG=2 EXCLUDE; fallback MapBiomas para MT 2008–2010." },
  { ref: "L3", lim: "LAPIG disponível até 2023; 2024 usa proxy de 2023.", mit: "Proxy documentado no LOG_AUDITORIA." },
  { ref: "L4", lim: "Milho 1ª safra (classe 4) sem base raster — estimado via PAM/CONAB.", mit: "Diagonal only; validação pelo ratio PAM/CONAB." },
  { ref: "L5", lim: "RGINTs multi-UF: pct_2a aplica a UF principal uniformemente.", mit: "Ponderação por área municipal por UF — pendência futura." },
  { ref: "L6", lim: "Mata Atlântica, Caatinga e Pampa sem TerraClass: 100% primária no fallback.", mit: "Validação com módulo MapBiomas Regeneração — pendente." },
  { ref: "L7", lim: "Dados HARVEX aguardando reprocessamento (escala de biomas).", mit: "131/133 RGINTs em draft; 2 validados como golden standard." },
  { ref: "L8", lim: "Join PAM × municípios por nome (não por código IBGE).", mit: "Adotar CD_MUN como chave primária em versão futura." },
];

/** Roteamento das classes de vegetação nativa por bioma — D4 §7. */
const BIOME_ROUTING = [
  { biome: "Amazônia", n: 23, veg: "TerraClass AMZ (pct prim./sec.)", years: "2008–2022 bianual; ímpares interpolados" },
  { biome: "Cerrado", n: 29, veg: "TerraClass CER (pct prim./sec.)", years: "2018–2024 bianual; 2008–2017 extrapolado" },
  { biome: "Mata Atlântica", n: 53, veg: "Fallback MapBiomas (sem prim./sec.)", years: "2008–2024 direto" },
  { biome: "Caatinga", n: 25, veg: "Fallback MapBiomas (sem prim./sec.)", years: "2008–2024 direto" },
  { biome: "Pampa", n: 3, veg: "Fallback MapBiomas (sem prim./sec.)", years: "2008–2024 direto" },
  { biome: "Pantanal", n: null, veg: "Fallback MapBiomas parcial", years: "2008–2024 direto" },
];

const DOCS = [
  { id: "D1", label: "Nota Técnica — Fontes e Metodologia LULC" },
  { id: "D3", label: "Atividade 1-3 — Desmatamento 2008–2024" },
  { id: "D4", label: "Dicionário de Dados e Pipeline" },
];

function groupVariant(group: string): "solid" | "outline" {
  return group === "Vegetação nativa" ? "solid" : "outline";
}

export default function About() {
  return (
    <div>
      <PageHeader
        title="Metodologia e Fontes"
        description="Base de dados de mudança de uso e cobertura da terra para as 133 Regiões Geográficas Intermediárias do Brasil, 2008–2024. Insumo para o modelo GTAP — ABIOVE Biocombustíveis 2026."
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
          <CardTitle>Sistema de 15 classes-alvo</CardTitle>
          <p className="text-xs text-muted">
            Referência normativa (D4). "Diagonal" = alocada apenas na permanência; "Proporcional" =
            subdividida por fontes auxiliares; "Completa" = participa de transições off-diagonal.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Cód.</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>IDs MapBiomas</TableHead>
                <TableHead>Fontes adicionais</TableHead>
                <TableHead>Alocação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLASS_META.map((c) => (
                <TableRow key={c.code}>
                  <TableCell className="mono text-muted">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={groupVariant(c.group)}>{c.group}</Badge>
                  </TableCell>
                  <TableCell className="mono text-xs text-muted">{c.mapbiomas}</TableCell>
                  <TableCell className="text-xs text-muted">{c.sources}</TableCell>
                  <TableCell className="text-xs">{c.allocation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Roteamento da vegetação nativa por bioma</CardTitle>
          <p className="text-xs text-muted">
            A disponibilidade do TerraClass determina o tratamento das classes 11–14 (D4 §7).
            Pastagem (classes 7–9) usa LAPIG 2008–2023 em todos os biomas.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bioma</TableHead>
                <TableHead className="w-20">Nº RGINTs</TableHead>
                <TableHead>Classes 11–14 — fonte</TableHead>
                <TableHead>Anos cobertos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BIOME_ROUTING.map((b) => (
                <TableRow key={b.biome}>
                  <TableCell className="font-medium">{b.biome}</TableCell>
                  <TableCell className="mono text-muted">{b.n ?? "—"}</TableCell>
                  <TableCell className="text-xs">{b.veg}</TableCell>
                  <TableCell className="text-xs text-muted">{b.years}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Limitações e pendências metodológicas</CardTitle>
          <p className="text-xs text-muted">
            Transparência das incertezas conhecidas e mitigações adotadas (D1 §13).
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ref.</TableHead>
                <TableHead>Limitação</TableHead>
                <TableHead>Mitigação adotada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LIMITS.map((l) => (
                <TableRow key={l.ref}>
                  <TableCell className="mono text-muted">{l.ref}</TableCell>
                  <TableCell className="text-xs">{l.lim}</TableCell>
                  <TableCell className="text-xs text-muted">{l.mit}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos técnicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {DOCS.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm text-foreground">
                <Badge variant="solid">{d.id}</Badge>
                {d.label}
              </div>
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
              FAPESP 2025/08745-2. Dados: MapBiomas Col. 10.1 (DOI 10.58053/MapBiomas/JNJGVT).
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
