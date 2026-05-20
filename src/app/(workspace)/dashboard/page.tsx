"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from "recharts";
import { 
  FolderKanban, 
  Terminal, 
  Bug, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2, 
  ShieldCheck 
} from "lucide-react";

export default function DashboardPage() {
  // 1. Fetch Projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["dashboard-projects"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "projects"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // 2. Fetch Endpoints
  const { data: endpoints = [], isLoading: loadingEndpoints } = useQuery({
    queryKey: ["dashboard-endpoints"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "endpoints"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // 3. Fetch Bugs
  const { data: bugs = [], isLoading: loadingBugs } = useQuery({
    queryKey: ["dashboard-bugs"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "bugs"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // 4. Fetch Users
  const { data: users = [] } = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  // 5. Fetch Recent Activities
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["dashboard-activities"],
    queryFn: async () => {
      const q = query(collection(db, "activities"), orderBy("createdAt", "desc"), limit(6));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  });

  const usersMap = useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach((u: any) => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  const projectsMap = useMemo(() => {
    const map: Record<string, any> = {};
    projects.forEach((p: any) => {
      map[p.id] = p;
    });
    return map;
  }, [projects]);

  // Compute Metrics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const totalEndpoints = endpoints.length;
    const totalBugs = bugs.length;

    let openBugs = 0;
    let resolvedBugs = 0;
    let criticalCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    let lowCount = 0;

    const projectBugCounts: Record<string, number> = {};

    bugs.forEach((bug: any) => {
      // Status counting
      if (bug.status === "resolved" || bug.status === "closed") {
        resolvedBugs++;
      } else {
        openBugs++;
      }

      // Severity counting
      if (bug.severity === "critical") criticalCount++;
      else if (bug.severity === "major") majorCount++;
      else if (bug.severity === "minor") minorCount++;
      else if (bug.severity === "low") lowCount++;

      // Project bugs grouping
      if (bug.projectId) {
        projectBugCounts[bug.projectId] = (projectBugCounts[bug.projectId] || 0) + 1;
      }
    });

    // Format charts data
    const severityData = [
      { name: "Critical", value: criticalCount, color: "#ef4444" },
      { name: "Major", value: majorCount, color: "#f59e0b" },
      { name: "Minor", value: minorCount, color: "#3b82f6" },
      { name: "Low", value: lowCount, color: "#6b7280" },
    ].filter(item => item.value > 0);

    const projectData = Object.entries(projectBugCounts).map(([projId, count]) => ({
      name: projectsMap[projId]?.name || "Unknown Project",
      bugs: count,
    }));

    return {
      totalProjects,
      totalEndpoints,
      totalBugs,
      openBugs,
      resolvedBugs,
      severityData,
      projectData,
    };
  }, [projects, endpoints, bugs, projectsMap]);

  const isLoadingAll = loadingProjects || loadingEndpoints || loadingBugs || loadingActivities;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (isLoadingAll) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-3 animate-pulse">Loading dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-sky-500" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            A high-level view of API endpoints coverage, system integrity, and reported logs.
          </p>
        </div>
      </div>

      {/* Summary statistics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Projects */}
        <Card className="border-border bg-card/65 shadow-xs rounded-2xl hover:shadow-md hover:bg-card transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              Total Projects
            </span>
            <div className="h-7 w-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <FolderKanban className="h-4 w-4 text-sky-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalProjects}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Active workspaces logged</p>
          </CardContent>
        </Card>

        {/* Card 2: Endpoints */}
        <Card className="border-border bg-card/65 shadow-xs rounded-2xl hover:shadow-md hover:bg-card transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              Endpoints Synced
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.totalEndpoints}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Parsed from Swagger specs</p>
          </CardContent>
        </Card>

        {/* Card 3: Open Bugs */}
        <Card className="border-border bg-card/65 shadow-xs rounded-2xl hover:shadow-md hover:bg-card transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              Active Bugs
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.openBugs}</div>
            <p className="text-[10px] text-rose-500 dark:text-rose-450 mt-1 font-medium">Require developer review</p>
          </CardContent>
        </Card>

        {/* Card 4: Resolved Bugs */}
        <Card className="border-border bg-card/65 shadow-xs rounded-2xl hover:shadow-md hover:bg-card transition-all duration-300">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              Resolved / Closed
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{stats.resolvedBugs}</div>
            <p className="text-[10px] text-emerald-500 dark:text-emerald-450 mt-1 font-medium font-sans">Successfully mitigated</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Grid: Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Distribution Chart */}
          <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
              <CardTitle className="text-sm font-bold text-foreground">Project Bug Distribution</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Number of reported bug issues mapped per active project.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 pt-6">
              {stats.projectData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No project bugs logged yet to display.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.projectData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "11px", color: "var(--foreground)" }}
                      itemStyle={{ color: "var(--foreground)" }}
                    />
                    <Bar dataKey="bugs" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Severity chart widget */}
          <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="pb-2 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
              <CardTitle className="text-sm font-bold text-foreground">Active Bug Severity Breakdown</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Classification of issues based on system operations impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-56 flex flex-col md:flex-row items-center justify-around gap-6 pt-6">
              {stats.severityData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No issues recorded.
                </div>
              ) : (
                <>
                  <div className="h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {stats.severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "11px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-4 w-full md:max-w-xs text-xs">
                    {stats.severityData.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 border border-border/30 rounded-lg p-2 bg-neutral-50/20 dark:bg-neutral-950/25">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">{item.name}</span>
                          <span className="text-sm font-bold text-foreground">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Grid: Recent Activity Feed */}
        <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
            <CardTitle className="text-sm font-bold text-foreground">Recent Activities</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Live updates of actions executed across the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 px-4">
            {activities.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-10">
                No recent workspace actions logged.
              </p>
            ) : (
              <div className="space-y-4">
                {activities.map((act: any, idx: number) => {
                  const u = usersMap[act.userId];
                  const proj = projectsMap[act.projectId];
                  const timestampStr = act.createdAt ? formatDate(act.createdAt) : "";
                  const isComment = act.action.startsWith("added comment:");
                  const cleanAction = isComment
                    ? act.action.replace(/^added comment:\s*"(.*)"$/, 'commented: "$1"')
                    : act.action;

                  return (
                    <div key={idx} className="flex items-start gap-3 text-xs leading-normal pb-3.5 border-b border-border last:border-0 last:pb-0">
                      <div className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-border flex items-center justify-center shrink-0 text-foreground font-bold uppercase">
                        {u?.name?.charAt(0) || "S"}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-foreground/90">
                          <span className="font-bold text-foreground">{u?.name || "System"}</span>{" "}
                          <span className="text-muted-foreground font-normal">{cleanAction}</span>
                          {proj && (
                            <>
                              {" on "}
                              <a href={`/projects/${act.projectId}`} className="text-sky-500 dark:text-sky-400 hover:underline font-bold transition-all">
                                {proj.name}
                              </a>
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{timestampStr}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
