import { AdminHeader } from "../_components/geral/admin-header";
import { StatCards } from "../_components/geral/stat-cards";
import { RecentActivity } from "../_components/geral/recent-activity";
import { OverviewChart } from "../_components/geral/overview-chart";

export const metadata = {
  title: "Overview | System Admin",
};

export default function DashboardHomePage() {
  return (
    <div className="flex w-full flex-col pb-12">
      {/* O Cabeçalho Global do Admin */}
      <AdminHeader
        title="System Overview"
        description="Métricas em tempo real, status da infraestrutura e logs recentes."
      />

      {/* Os 4 Cards de Topo (Analytics Dinâmicos) */}
      <StatCards />

      {/* Grid Inferior dividido em 2 colunas */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Coluna Esquerda: Linha do Tempo */}
        <RecentActivity />

        {/* Coluna Direita: O Gráfico Real (Recharts) */}
        <OverviewChart />
      </div>
    </div>
  );
}
