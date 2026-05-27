"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { getSwaggerUiUrl } from "@/lib/swaggerParser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/workspace/StatusBadge";
import { SeverityBadge } from "@/components/workspace/SeverityBadge";
import { BugDialog } from "@/components/workspace/BugDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft,
  User,
  Clock,
  ExternalLink,
  Edit,
  Send,
  MessageSquare,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  need_confirmation: "Need Confirmation",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened"
};

export default function BugDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const bugId = params.id as string;
  const isDeveloperOrAdmin = profile?.role === "developer" || profile?.role === "admin";
  const isQAOrAdmin = profile?.role === "qa" || profile?.role === "admin";

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // 1. Fetch Bug Details
  const { data: bug, isLoading: loadingBug, refetch: refetchBug } = useQuery({
    queryKey: ["bug", bugId],
    queryFn: async () => {
      if (!db) throw new Error("Firebase not configured");
      const docRef = doc(db, "bugs", bugId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error("Bug report not found");
      }
      return { id: docSnap.id, ...docSnap.data() } as any;
    },
  });

  const projectId = bug?.projectId;

  // 2. Fetch Project details (to get Name)
  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId || !db) return null;
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    },
    enabled: !!projectId && !!db,
  });

  // 3. Fetch Linked Endpoint (if any)
  const { data: endpoint } = useQuery({
    queryKey: ["endpoint", bug?.endpointId],
    queryFn: async () => {
      if (!bug?.endpointId || !db) return null;
      const docRef = doc(db, "endpoints", bug.endpointId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    },
    enabled: !!bug?.endpointId && !!db,
  });

  // 4. Fetch Users list
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      if (!db) return [];
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(d => d.data());
    },
  });

  // 5. Fetch Activities list
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ["activities", bugId],
    queryFn: async () => {
      if (!db) return [];
      const q = query(
        collection(db, "activities"),
        where("bugId", "==", bugId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    },
    enabled: !!bugId,
  });

  const usersMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    users.forEach((u: any) => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  // Handle updating bug status (permitted for developers & admins)
  const handleStatusChange = async (newStatus: string) => {
    if (!user || !profile) return;

    if (!isDeveloperOrAdmin) {
      toast.error("Unauthorized: Only Developers and Admins can update bug status.");
      return;
    }

    try {
      if (!db) throw new Error("Firebase not configured");
      const bugRef = doc(db, "bugs", bugId);
      const oldStatus = bug.status;

      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp(),
      };

      if (newStatus === "resolved") {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(bugRef, updateData);

      // Create activity record
      const activitiesRef = collection(db, "activities");
      await addDoc(activitiesRef, {
        id: "",
        bugId,
        action: `changed status from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()}`,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Bug status updated.");
      refetchBug();
      refetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Handle updating assignee
  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!user || !profile) return;

    if (!isDeveloperOrAdmin) {
      toast.error("Unauthorized: Only Developers and Admins can assign bugs.");
      return;
    }

    try {
      if (!db) throw new Error("Firebase not configured");
      const bugRef = doc(db, "bugs", bugId);
      const assignedId = newAssigneeId === "unassigned" ? null : newAssigneeId;
      const oldAssigneeName = usersMap[bug.assignedTo]?.name || "Unassigned";
      const newAssigneeName = usersMap[assignedId || ""]?.name || "Unassigned";

      await updateDoc(bugRef, {
        assignedTo: assignedId,
        updatedAt: serverTimestamp(),
      });

      // Create activity record
      const activitiesRef = collection(db, "activities");
      await addDoc(activitiesRef, {
        id: "",
        bugId,
        action: `reassigned from ${oldAssigneeName} to ${newAssigneeName}`,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Assignee updated.");
      refetchBug();
      refetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Failed to update assignee");
    }
  };

  // Submit text comment to timeline activity feed
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const activitiesRef = collection(db, "activities");
      await addDoc(activitiesRef, {
        id: "",
        bugId,
        action: `added comment: "${commentText.trim()}"`,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });

      setCommentText("");
      toast.success("Comment added.");
      refetchActivities();
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loadingBug) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-3 animate-pulse">Loading issue details...</p>
      </div>
    );
  }

  if (!bug) {
    return (
      <div className="text-center py-20 bg-card border border-border rounded-2xl">
        <h3 className="text-sm font-bold text-foreground">Bug report not found</h3>
        <Button variant="link" onClick={() => router.push("/projects")} className="text-sky-500 dark:text-sky-400 mt-2 font-semibold text-xs">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <a
        href={projectId ? `/projects/${projectId}` : "/projects"}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold group"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back to project Workspace
      </a>

      {/* Header Info */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase bg-neutral-100 dark:bg-neutral-900 border border-border/80 px-2 py-0.5 rounded-md">
              BUG-{bugId.substring(0, 5).toUpperCase()}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">
              Project: {project?.name || "General"}
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{bug.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-0.5 font-semibold">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/75" />
              <span>Created {formatDate(bug.createdAt)}</span>
            </div>
            <span>•</span>
            <div>
              <span>Reported by: </span>
              <span className="font-bold text-foreground/80">
                {usersMap[bug.reporterId]?.name || "Loading..."}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Button */}
        {isQAOrAdmin && (
          <Button
            onClick={() => setEditDialogOpen(true)}
            className="bg-card border border-border text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 font-semibold text-xs gap-1.5 shadow-xs self-start shrink-0 rounded-lg px-3 py-1.5 cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Bug Details
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Diagnostics details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Main Info Card */}
          <Card className="border border-border/80 bg-card/60 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
              <CardTitle className="text-foreground text-sm font-bold">Diagnostic details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5 text-xs text-foreground/90">
              {/* Linked Endpoint */}
              {(endpoint || bug?.endpointPath) && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 rounded-xl border border-border flex items-center justify-between gap-4 font-mono">
                  <div className="text-[11px] truncate font-semibold">
                    <span className="font-extrabold text-sky-600 dark:text-sky-400 mr-2">
                      {endpoint?.method || bug?.endpointMethod}
                    </span>
                    <span className="text-foreground/85 font-semibold">
                      {endpoint?.path || bug?.endpointPath}
                    </span>
                  </div>
                  {(endpoint?.swaggerLink || bug?.swaggerLink) && (
                    <a
                      href={getSwaggerUiUrl(endpoint?.swaggerLink || bug?.swaggerLink)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                      title="Inspect endpoint Swagger docs"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Description
                </h4>
                <p className="leading-relaxed bg-neutral-50/50 dark:bg-neutral-950/20 p-3.5 rounded-xl border border-border/60 whitespace-pre-wrap">
                  {bug.description}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Steps to Reproduce
                </h4>
                <div className="leading-relaxed bg-neutral-50/50 dark:bg-neutral-950/20 p-3.5 rounded-xl border border-border/60 whitespace-pre-wrap">
                  {bug.stepsToReproduce}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Expected Outcome
                  </h4>
                  <div className="leading-relaxed bg-neutral-50/50 dark:bg-neutral-950/20 p-3.5 rounded-xl border border-border/60 whitespace-pre-wrap">
                    {bug.expectedResult}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Actual Outcome
                  </h4>
                  <div className="leading-relaxed bg-neutral-50/50 dark:bg-neutral-950/20 p-3.5 rounded-xl border border-border/60 whitespace-pre-wrap">
                    {bug.actualResult}
                  </div>
                </div>
              </div>

              {/* Screenshots Gallery */}
              {bug.screenshotUrls && bug.screenshotUrls.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Attached Evidence ({bug.screenshotUrls.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {bug.screenshotUrls.map((url: string, index: number) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl overflow-hidden border border-border bg-neutral-100 dark:bg-neutral-950 aspect-video flex items-center justify-center cursor-zoom-in hover:border-neutral-400 dark:hover:border-neutral-700 transition-colors"
                      >
                        <img src={url} alt={`Evidence #${index + 1}`} className="object-cover w-full h-full" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Feed Card */}
          <Card className="border border-border/80 bg-card/60 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
              <CardTitle className="text-foreground text-sm font-bold flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-sky-500" />
                Timeline & Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Timeline feed */}
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-xs text-center py-6">
                  No activity logged on this ticket yet.
                </p>
              ) : (
                <div className="relative border-l border-border pl-4 ml-2 space-y-6">
                  {activities.map((act: any, idx: number) => {
                    const u = usersMap[act.userId];
                    const timestampStr = act.createdAt ? formatDate(act.createdAt) : "";
                    const isComment = act.action.startsWith('added comment:');
                    const cleanComment = isComment
                      ? act.action.replace(/^added comment:\s*"(.*)"$/, '$1')
                      : act.action;

                    return (
                      <div key={idx} className="relative">
                        {/* Dot */}
                        <div className="absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-background border border-border" />

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-foreground/80">
                              {u?.name || "System"}
                            </span>
                            <span className="text-[9px] bg-neutral-100 dark:bg-neutral-900 border border-border text-muted-foreground px-1 py-0.2 rounded font-mono font-semibold uppercase tracking-wider">
                              {u?.role || "user"}
                            </span>
                            <span className="text-muted-foreground text-[10px] font-semibold">{timestampStr}</span>
                          </div>

                          {isComment ? (
                            <p className="text-xs text-foreground/90 bg-neutral-50 dark:bg-neutral-950/80 p-2.5 rounded-xl border border-border mt-1 whitespace-pre-wrap">
                              {cleanComment}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic mt-0.5">
                              {cleanComment}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Comment submission form */}
              <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-4 border-t border-border">
                <Input
                  placeholder="Add a developer comment or verify resolution..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/30 text-xs h-9 rounded-lg"
                  disabled={submittingComment}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingComment || !commentText.trim()}
                  className="bg-sky-500 hover:bg-sky-400 text-white font-semibold h-9 px-3 gap-1 shrink-0 rounded-lg cursor-pointer transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Metadata status parameters */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-card/60 rounded-2xl shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-neutral-50/20 dark:bg-neutral-900/10">
              <CardTitle className="text-foreground text-sm font-bold">Triage parameters</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Current Status</Label>
                {isDeveloperOrAdmin ? (
                  <Select onValueChange={handleStatusChange} value={bug.status}>
                    <SelectTrigger className="bg-card border border-border text-foreground focus:ring-sky-500/20 rounded-lg w-full">
                      <SelectValue>
                        {STATUS_LABELS[bug.status] || bug.status}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border text-foreground text-xs rounded-xl shadow-md">
                      <SelectItem value="open" className="rounded-lg font-semibold">Open</SelectItem>
                      <SelectItem value="in_progress" className="rounded-lg font-semibold">In Progress</SelectItem>
                      <SelectItem value="need_confirmation" className="rounded-lg font-semibold">Need Confirmation</SelectItem>
                      <SelectItem value="resolved" className="rounded-lg font-semibold">Resolved</SelectItem>
                      <SelectItem value="closed" className="rounded-lg font-semibold">Closed</SelectItem>
                      <SelectItem value="reopened" className="rounded-lg font-semibold">Reopened</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="pt-1 flex">
                    <StatusBadge status={bug.status} />
                  </div>
                )}
              </div>

              {/* Assignee Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Assignee</Label>
                {isDeveloperOrAdmin ? (
                  <Select onValueChange={handleAssigneeChange} value={bug.assignedTo || "unassigned"}>
                    <SelectTrigger className="bg-card border border-border text-foreground focus:ring-sky-500/20 rounded-lg w-full">
                      <SelectValue>
                        {usersMap[bug.assignedTo]?.name || "Unassigned"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border text-foreground text-xs rounded-xl shadow-md">
                      <SelectItem value="unassigned" className="rounded-lg font-semibold">Unassigned</SelectItem>
                      {users
                        .filter(u => u.role === "developer" || u.role === "admin")
                        .map(u => (
                          <SelectItem key={u.id} value={u.id} className="rounded-lg font-semibold">
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-2 bg-neutral-50/50 dark:bg-neutral-950/60 rounded-lg border border-border text-xs text-foreground/80">
                    <User className="h-4 w-4 text-muted-foreground/75" />
                    <span className="font-semibold">{usersMap[bug.assignedTo]?.name || "Unassigned"}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Severity Info */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Severity</Label>
                  <div className="pt-0.5 flex">
                    <SeverityBadge severity={bug.severity} />
                  </div>
                </div>

                {/* Priority Info */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Priority</Label>
                  <div className="pt-0.5 flex">
                    <Badge variant="outline" className="px-2 py-0.5 text-[9px] uppercase font-extrabold tracking-wider bg-neutral-50/40 dark:bg-neutral-950/40 border-border text-muted-foreground w-fit justify-center rounded-md">
                      {bug.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Permission info block */}
          {!isDeveloperOrAdmin && (
            <div className="bg-neutral-50 dark:bg-neutral-950/20 border border-border/80 p-4 rounded-xl flex gap-3 text-xs text-muted-foreground">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-muted-foreground/70 mt-0.5" />
              <p className="leading-relaxed font-semibold">
                Status changes and user assignment tools are restricted to <strong>Developers</strong> and <strong>Admins</strong>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Bug Dialog */}
      {projectId && (
        <BugDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          projectId={projectId}
          bugToEdit={bug}
          onSuccess={refetchBug}
        />
      )}
    </div>
  );
}
