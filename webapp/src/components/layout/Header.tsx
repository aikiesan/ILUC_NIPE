import { Github, BookText, Menu } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="rounded p-1.5 text-muted hover:bg-highlight hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-baseline gap-2">
          <span className="mono text-sm font-bold text-foreground">ILUC_NIPE</span>
          <span className="hidden text-xs text-muted sm:inline">
            Mudança de uso da terra · Brasil 2008–2024
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:inline-flex">
          FAPESP 2025/08745-2
        </Badge>
        <a
          href="https://github.com/aikiesan/ILUC_NIPE"
          target="_blank"
          rel="noreferrer"
          aria-label="Repositório GitHub"
          className="rounded p-1.5 text-muted hover:bg-highlight hover:text-foreground"
        >
          <Github className="h-4 w-4" />
        </a>
        <a
          href="https://github.com/aikiesan/ILUC_NIPE/blob/master/PROJETO_STATUS_HANDOFF.md"
          target="_blank"
          rel="noreferrer"
          aria-label="Documentação"
          className="rounded p-1.5 text-muted hover:bg-highlight hover:text-foreground"
        >
          <BookText className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
