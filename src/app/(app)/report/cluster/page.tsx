import ClusterDashboard from "@/components/report/ClusterDashboard";

export const metadata = {
  title: "Report Cluster Analysis | Jira Cross",
  description: "Analisi delle cause sistemiche dei ticket di supporto",
};

export default function ClusterReportPage() {
  return <ClusterDashboard />;
}
