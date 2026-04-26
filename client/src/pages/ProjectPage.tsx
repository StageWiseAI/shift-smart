import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Layout from "./Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Truck, HardHat, ClipboardList, Building2, Hash, ArrowRight } from "lucide-react";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const pid = parseInt(id);

  const { data: project, isLoading } = useQuery<any>({ queryKey: [`/api/projects/${pid}`] });

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground text-sm">Loading…</div></Layout>;
  if (!project) return <Layout><div className="p-8 text-muted-foreground text-sm">Project not found.</div></Layout>;

  const modules = [
    {
      href: `/projects/${pid}/programme`,
      icon: <CalendarDays className="h-6 w-6" />,
      label: "Programme",
      desc: "Upload baseline, apply EOT delays, manage cycle overrides and look-ahead views",
      color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    },
    {
      href: `/projects/${pid}/materials`,
      icon: <Truck className="h-6 w-6" />,
      label: "Material Handling",
      desc: "Schedule and track deliveries — forklifts, cranes and hand unloads",
      color: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    {
      href: `/projects/${pid}/prestart`,
      icon: <HardHat className="h-6 w-6" />,
      label: "Pre-Start Meetings",
      desc: "Site plans, active zones, exclusion zones, attendance and photos",
      color: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    },
    {
      href: `/projects/${pid}/meetings`,
      icon: <ClipboardList className="h-6 w-6" />,
      label: "Meetings & Minutes",
      desc: "Record subbie notes, programme meetings — free text or audio recording",
      color: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    },
  ];

  return (
    <Layout projectId={pid} projectName={project.name}>
      <div className="px-6 py-6">
        {/* Project header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">{project.name}</h1>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
            {project.contractNumber && (
              <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{project.contractNumber}</span>
            )}
            {project.client && (
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{project.client}</span>
            )}
            {project.startDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(project.startDate).toLocaleDateString("en-AU")}
                {project.endDate && ` – ${new Date(project.endDate).toLocaleDateString("en-AU")}`}
              </span>
            )}
          </div>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map(m => (
            <Card
              key={m.href}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => navigate(m.href)}
              data-testid={`card-module-${m.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${m.color}`}>{m.icon}</div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
                <CardTitle className="text-base mt-2">{m.label}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
