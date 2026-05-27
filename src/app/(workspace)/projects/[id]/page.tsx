"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, orderBy, writeBatch, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EndpointTable } from "@/components/workspace/EndpointTable";
import { BugCard } from "@/components/workspace/BugCard";
import { BugDialog } from "@/components/workspace/BugDialog";
import {
  Globe,
  ExternalLink,
  RefreshCw,
  Plus,
  Search,
  Terminal,
  Bug,
  ArrowLeft,
  Loader2,
  Lock,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { getSwaggerUiUrl } from "@/lib/swaggerParser";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const projectId = params.id as string;
  const isAdmin = profile?.role === "admin";
  const isQA = profile?.role === "qa" || profile?.role === "admin";

  const [activeTab, setActiveTab] = useState("endpoints");
  const [endpointSearch, setEndpointSearch] = useState("");
  const [bugSearch, setBugSearch] = useState("");

  const [syncing, setSyncing] = useState(false);
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);

  // 1. Fetch Project Details
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Project not found");
      }
      return docSnap.data();
    },
  });

  // 2. Fetch Endpoints
  const { data: endpoints = [], isLoading: loadingEndpoints, refetch: refetchEndpoints } = useQuery<any[]>({
    queryKey: ["endpoints", projectId],
    queryFn: async () => {
      const q = query(collection(db, "endpoints"), where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a: any, b: any) => {
        const pathA = (a.path || "").toLowerCase();
        const pathB = (b.path || "").toLowerCase();
        return pathA.localeCompare(pathB);
      });
    },
  });

  // 3. Fetch Bugs
  const { data: bugs = [], isLoading: loadingBugs, refetch: refetchBugs } = useQuery<any[]>({
    queryKey: ["bugs", projectId],
    queryFn: async () => {
      const q = query(collection(db, "bugs"), where("projectId", "==", projectId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return list.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
    },
  });

  // 4. Fetch Users list (to map assigned IDs to names)
  const { data: usersMap = {} } = useQuery({
    queryKey: ["usersMap"],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const map: Record<string, string> = {};
      snapshot.forEach(doc => {
        const u = doc.data();
        map[u.id] = u.name;
      });
      return map;
    },
  });

  // Filter Endpoints
  const filteredEndpoints = endpoints.filter((ep: any) =>
    ep.path?.toLowerCase().includes(endpointSearch.toLowerCase()) ||
    ep.method?.toLowerCase().includes(endpointSearch.toLowerCase()) ||
    ep.tag?.toLowerCase().includes(endpointSearch.toLowerCase()) ||
    ep.summary?.toLowerCase().includes(endpointSearch.toLowerCase())
  );

  // Filter Bugs
  const filteredBugs = bugs.filter((bug: any) =>
    bug.title?.toLowerCase().includes(bugSearch.toLowerCase()) ||
    bug.description?.toLowerCase().includes(bugSearch.toLowerCase())
  );

  const handleEndpointClick = (path: string) => {
    setEndpointSearch(path);
    setActiveTab("endpoints");
  };

  // Handle Sync Swagger button click
  const handleSyncSwagger = async () => {
    if (!user || !project) return;
    if (!isAdmin) {
      toast.error("Unauthorized: Only Admins can sync Swagger specs.");
      return;
    }
    setSyncing(true);
    const toastId = toast.loading("Fetching Swagger spec and updating endpoints...");

    try {
      // 1. Call server API to fetch and parse the Swagger spec
      const res = await fetch("/api/sync-swagger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ swaggerUrl: project.swaggerUrl }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Sync failed");
      }

      const parsedEndpoints = result.endpoints || [];
      if (parsedEndpoints.length === 0) {
        throw new Error("No endpoints found in the specification");
      }

      // 2. Fetch existing endpoints for this project
      const endpointsRef = collection(db, "endpoints");
      const q = query(endpointsRef, where("projectId", "==", projectId));
      const querySnapshot = await getDocs(q);

      // Map: `${method.toUpperCase()}:${path}` -> { id, ref, data }
      const existingEndpointsMap = new Map<string, any>();
      for (const d of querySnapshot.docs) {
        const data = d.data();
        const key = `${(data.method || "").toUpperCase()}:${data.path}`;
        existingEndpointsMap.set(key, { id: d.id, ref: d.ref, data });
      }

      let batch = writeBatch(db);
      let operationCount = 0;
      const keepIds = new Set<string>();

      // 3. Upsert new/updated endpoints
      for (const ep of parsedEndpoints) {
        const key = `${ep.method.toUpperCase()}:${ep.path}`;
        const existing = existingEndpointsMap.get(key);

        if (existing) {
          batch.update(existing.ref, {
            tag: ep.tag,
            summary: ep.summary || "",
            description: ep.description || "",
            swaggerLink: ep.swaggerLink || "",
            updatedAt: serverTimestamp(),
          });
          keepIds.add(existing.id);
        } else {
          const newDocRef = doc(endpointsRef);
          batch.set(newDocRef, {
            id: newDocRef.id,
            projectId,
            tag: ep.tag,
            method: ep.method,
            path: ep.path,
            summary: ep.summary || "",
            description: ep.description || "",
            swaggerLink: ep.swaggerLink || "",
            createdAt: serverTimestamp(),
          });
        }

        operationCount++;
        if (operationCount >= 450) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }

      // 4. Delete existing endpoints that are no longer in the Swagger specification
      for (const [key, existing] of existingEndpointsMap.entries()) {
        if (!keepIds.has(existing.id)) {
          batch.delete(existing.ref);
          operationCount++;

          if (operationCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      // 4. Create activity log
      const activitiesRef = collection(db, "activities");
      const activityDocRef = doc(activitiesRef);
      await setDoc(activityDocRef, {
        id: activityDocRef.id,
        projectId,
        action: `Synced Swagger: imported ${parsedEndpoints.length} endpoints`,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success(`Synced Swagger successfully! Imported ${parsedEndpoints.length} endpoints.`, { id: toastId });
      refetchEndpoints();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync Swagger spec", { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const handleReportBugOnEndpoint = (endpoint: any) => {
    if (!isQA) {
      toast.error("Only QA engineers can report bugs.");
      return;
    }
    setSelectedEndpoint(endpoint);
    setBugDialogOpen(true);
  };

  const handleCreateBugGeneral = () => {
    setSelectedEndpoint(null);
    setBugDialogOpen(true);
  };

  if (loadingProject) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-3 animate-pulse">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 bg-card border border-border rounded-2xl">
        <h3 className="text-base font-bold text-foreground">Project not found</h3>
        <Button variant="link" onClick={() => router.push("/projects")} className="text-sky-500 dark:text-sky-400 mt-2 font-semibold text-xs">
          Back to Projects
        </Button>
      </div>
    );
  }

  const getEnvBadgeColor = (env: string) => {
    switch (env) {
      case "production":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20";
      case "staging":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-450 border-amber-500/20";
      default:
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to projects link */}
      <a
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to projects
      </a>

      {/* Project Meta Details Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b border-neutral-250/20 dark:border-white/5 pb-6">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
            <Badge variant="outline" className={`px-2 py-0.5 text-[8px] uppercase font-extrabold tracking-wider rounded-md ${getEnvBadgeColor(project.environment)}`}>
              {project.environment}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs max-w-3xl leading-relaxed font-semibold">
            {project.description || "No project description provided."}
          </p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-muted-foreground font-semibold">
            {project.baseUrl && (
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                <span className="text-muted-foreground/60">Server:</span>
                <span className="truncate max-w-xs text-foreground/80 font-mono font-bold">{project.baseUrl}</span>
              </div>
            )}
            {project.swaggerUrl && (
              <div className="flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/75 shrink-0" />
                <span className="text-muted-foreground/60">Swagger URL:</span>
                <a href={getSwaggerUiUrl(project.swaggerUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline text-sky-400 font-bold truncate max-w-xs font-mono">
                  {getSwaggerUiUrl(project.swaggerUrl)}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-auto">
          {isAdmin && (
            <Button
              onClick={() => router.push(`/projects/${projectId}/settings`)}
              className="bg-card border border-neutral-250/25 dark:border-white/5 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs gap-1.5 shadow-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Form Settings
            </Button>
          )}

          {isAdmin ? (
            <Button
              onClick={handleSyncSwagger}
              disabled={syncing || !project.swaggerUrl}
              className="bg-card border border-neutral-250/25 dark:border-white/5 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-xs gap-1.5 shadow-xs px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-sky-400" : ""}`} />
              Sync Swagger
            </Button>
          ) : (
            <Button
              disabled
              variant="outline"
              className="border-neutral-250/20 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-950/20 text-muted-foreground/70 text-xs gap-1.5 rounded-xl"
            >
              <Lock className="h-3.5 w-3.5" />
              Sync Swagger (Admin Only)
            </Button>
          )}

          {isQA && (
            <Button
              onClick={handleCreateBugGeneral}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs gap-1.5 shadow-sm px-4 py-1.5 rounded-xl cursor-pointer transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              Report Bug
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-250/20 dark:border-white/5 gap-1 rounded-xl w-full sm:w-auto flex sm:inline-flex p-1">
          <TabsTrigger value="endpoints" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground py-1.5 px-4 h-fit text-xs font-bold rounded-lg shadow-xs flex-1 sm:flex-none cursor-pointer">
            Endpoints ({endpoints.length})
          </TabsTrigger>
          <TabsTrigger value="bugs" className="text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground py-1.5 px-4 h-fit text-xs font-bold rounded-lg shadow-xs flex-1 sm:flex-none cursor-pointer">
            Bugs & Issues ({bugs.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Endpoints */}
        <TabsContent value="endpoints" className="space-y-4">
          <div className="flex items-center bg-card border border-neutral-250/20 dark:border-white/5 rounded-xl px-3 py-1.5 max-w-sm shadow-xs focus-within:ring-2 focus-within:ring-sky-500/10 focus-within:border-sky-500/35 transition-all duration-200">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              type="text"
              placeholder="Search endpoints..."
              value={endpointSearch}
              onChange={(e) => setEndpointSearch(e.target.value)}
              className="bg-transparent border-none text-foreground placeholder-muted-foreground/80 focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-0 text-xs w-full font-semibold"
            />
          </div>

          {loadingEndpoints ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-7 w-7 text-sky-500 animate-spin" />
            </div>
          ) : (
            <EndpointTable
              data={filteredEndpoints}
              onReportBug={handleReportBugOnEndpoint}
            />
          )}
        </TabsContent>

        {/* Tab 2: Bugs */}
        <TabsContent value="bugs" className="space-y-4">
          <div className="flex items-center bg-card border border-border rounded-xl px-3 py-1.5 max-w-sm shadow-xs focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500/50 transition-all duration-200">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              type="text"
              placeholder="Search bugs..."
              value={bugSearch}
              onChange={(e) => setBugSearch(e.target.value)}
              className="bg-transparent border-none text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-0 text-xs w-full"
            />
          </div>

          {loadingBugs ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-7 w-7 text-sky-500 animate-spin" />
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-border/80 rounded-2xl bg-card/30">
              <Bug className="h-10 w-10 text-muted-foreground/60 mb-3" />
              <h3 className="text-sm font-bold text-foreground">No bug reports</h3>
              <p className="text-muted-foreground text-xs mt-1 max-w-xs leading-relaxed">
                {bugSearch ? "No reports match your filters." : "All systems nominal! No bugs recorded on this project."}
              </p>
              {isQA && !bugSearch && (
                <Button
                  onClick={handleCreateBugGeneral}
                  variant="outline"
                  className="mt-4 border-border text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-xs"
                >
                  Log First Bug
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBugs.map((bug: any) => {
                // Find endpoint info if linked
                const linkedEp = endpoints.find((ep: any) => ep.id === bug.endpointId);
                return (
                  <BugCard
                    key={bug.id}
                    bug={{
                      id: bug.id,
                      title: bug.title,
                      description: bug.description,
                      status: bug.status,
                      severity: bug.severity,
                      priority: bug.priority,
                      endpointPath: linkedEp?.path || bug.endpointPath,
                      endpointMethod: linkedEp?.method || bug.endpointMethod,
                      httpStatus: bug.httpStatus,
                      assignedToName: usersMap[bug.assignedTo],
                      createdAt: bug.createdAt,
                    }}
                    onEndpointClick={handleEndpointClick}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Report Bug Dialog */}
      <BugDialog
        open={bugDialogOpen}
        onOpenChange={setBugDialogOpen}
        projectId={projectId}
        bugToEdit={null}
        initialEndpointId={selectedEndpoint?.id}
        onSuccess={() => {
          refetchBugs();
        }}
      />
    </div>
  );
}
