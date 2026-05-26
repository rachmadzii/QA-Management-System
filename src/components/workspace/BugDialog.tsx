"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, getDocs, query, where } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadDropzone } from "./UploadDropzone";
import {
  X,
  AlertCircle,
  ChevronDown,
  Search,
  User,
  Terminal,
  Sparkles,
  Link as LinkIcon,
  Check,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { DEFAULT_BUG_FORM_CONFIG, generateBugSchema } from "@/lib/bugFormUtils";

export interface BugFormValues {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  severity: "critical" | "major" | "minor" | "low" | "";
  priority: "high" | "medium" | "low" | "";
  httpStatus: string;
  endpointId: string;
  assignedTo: string;
  screenshots?: string[];
}

interface BugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bugToEdit?: any;
  initialEndpointId?: string;
  onSuccess: () => void;
}

const normalizeRole = (role: unknown) => String(role || "").trim().toLowerCase();
const getUserRole = (userData: any) => {
  const roles = Array.isArray(userData.roles) ? userData.roles : [];
  return userData.role || userData.userRole || userData.profile?.role || roles[0];
};
const isAssignableRole = (role: unknown) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === "developer" || normalizedRole === "admin";
};

export function BugDialog({ open, onOpenChange, projectId, bugToEdit, initialEndpointId, onSuccess }: BugDialogProps) {
  const { user, profile } = useAuth();
  const isEditing = !!bugToEdit;

  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Searchable endpoint states
  const [endpointSearchOpen, setEndpointSearchOpen] = useState(false);
  const [endpointSearchText, setEndpointSearchText] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Searchable assignee states
  const [assigneeSearchOpen, setAssigneeSearchOpen] = useState(false);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Project Details for Bug Form Configuration
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
    enabled: open,
  });

  const config = useMemo(() => {
    return project?.bugFormConfig
      ? { ...DEFAULT_BUG_FORM_CONFIG, ...project.bugFormConfig }
      : DEFAULT_BUG_FORM_CONFIG;
  }, [project]);

  const dynamicSchema = useMemo(() => {
    return generateBugSchema(config);
  }, [config]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BugFormValues>({
    resolver: ((values: any, context: any, options: any) => {
      return zodResolver(dynamicSchema)(values, context, options);
    }) as any,
    defaultValues: {
      title: "",
      description: "",
      stepsToReproduce: "",
      expectedResult: "",
      actualResult: "",
      severity: "minor",
      priority: "medium",
      httpStatus: "",
      endpointId: "",
      assignedTo: "",
      screenshots: [],
    },
  });

  const selectedSeverity = watch("severity");
  const selectedPriority = watch("priority");
  const selectedEndpointId = watch("endpointId");
  const selectedAssignedTo = watch("assignedTo");

  // Fetch project endpoints and workspace users for dropdown selectors
  useEffect(() => {
    if (!open) return;

    const fetchConfigData = async () => {
      setLoadingConfig(true);
      try {
        // Fetch project endpoints
        const epQuery = query(collection(db, "endpoints"), where("projectId", "==", projectId));
        const epSnapshot = await getDocs(epQuery);
        const epList = epSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort alphabetically by path (A-Z)
        epList.sort((a: any, b: any) => {
          const pathA = (a.path || "").toLowerCase();
          const pathB = (b.path || "").toLowerCase();
          return pathA.localeCompare(pathB);
        });
        setEndpoints(epList);

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersList = usersSnapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: data.id || d.id,
            role: normalizeRole(getUserRole(data)),
          };
        });
        setUsers(usersList);
      } catch (err) {
        console.error("Failed to load dialog configs:", err);
      } finally {
        setLoadingConfig(false);
      }
    };

    fetchConfigData();
  }, [open, projectId]);

  // Handle setting initial values for Edit mode
  useEffect(() => {
    if (open) {
      if (bugToEdit) {
        reset({
          title: bugToEdit.title || "",
          description: bugToEdit.description || "",
          stepsToReproduce: bugToEdit.stepsToReproduce || "",
          expectedResult: bugToEdit.expectedResult || "",
          actualResult: bugToEdit.actualResult || "",
          severity: bugToEdit.severity || "minor",
          priority: bugToEdit.priority || "medium",
          httpStatus: bugToEdit.httpStatus ? String(bugToEdit.httpStatus) : "",
          endpointId: bugToEdit.endpointId || "",
          assignedTo: bugToEdit.assignedTo || "",
          screenshots: bugToEdit.screenshotUrls || [],
        });
        setScreenshotUrls(bugToEdit.screenshotUrls || []);
      } else {
        reset({
          title: "",
          description: "",
          stepsToReproduce: "",
          expectedResult: "",
          actualResult: "",
          severity: "minor",
          priority: "medium",
          httpStatus: "",
          endpointId: initialEndpointId || "",
          assignedTo: "",
          screenshots: [],
        });
        setScreenshotUrls([]);
      }
    }
  }, [open, bugToEdit, initialEndpointId, reset]);

  // Update screenshots field in react-hook-form whenever files are uploaded/removed
  useEffect(() => {
    setValue("screenshots", screenshotUrls, { shouldValidate: true });
  }, [screenshotUrls, setValue]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setEndpointSearchOpen(false);
      }
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(event.target as Node)) {
        setAssigneeSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveScreenshot = (urlToRemove: string) => {
    setScreenshotUrls(prev => prev.filter(u => u !== urlToRemove));
  };

  const onSubmit = async (values: BugFormValues) => {
    if (!user || !profile) {
      toast.error("Authentication required.");
      return;
    }

    // Role Rule Check: Only QA can create/edit bugs. Admins are also allowed as standard.
    if (profile.role !== "qa" && profile.role !== "admin") {
      toast.error("Unauthorized: Only users with the QA role can report or edit bugs.");
      return;
    }

    try {
      const selectedEp = endpoints.find(e => e.id === values.endpointId);
      const bugData = {
        projectId,
        title: values.title,
        description: values.description,
        // Nullify fields if they are disabled in project configuration
        stepsToReproduce: config.stepsToReproduce.enabled ? (values.stepsToReproduce || null) : null,
        expectedResult: config.expectedResult.enabled ? (values.expectedResult || null) : null,
        actualResult: config.actualResult.enabled ? (values.actualResult || null) : null,
        severity: config.severity.enabled ? (values.severity || null) : null,
        priority: config.priority.enabled ? (values.priority || null) : null,
        httpStatus: (config.httpStatus.enabled && values.httpStatus) ? parseInt(values.httpStatus) : null,
        endpointId: config.endpointId.enabled ? (values.endpointId || null) : null,
        endpointPath: (config.endpointId.enabled && selectedEp) ? (selectedEp.path || null) : null,
        endpointMethod: (config.endpointId.enabled && selectedEp) ? (selectedEp.method || null) : null,
        swaggerLink: (config.endpointId.enabled && selectedEp) ? (selectedEp.swaggerLink || null) : null,
        assignedTo: config.assignedTo.enabled ? (values.assignedTo || null) : null,
        screenshotUrls: config.screenshots.enabled ? screenshotUrls : [],
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const bugRef = doc(db, "bugs", bugToEdit.id);
        await updateDoc(bugRef, bugData);

        // Add activity log
        const activityRef = collection(db, "activities");
        await addDoc(activityRef, {
          id: "",
          bugId: bugToEdit.id,
          action: "updated bug details",
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        toast.success("Bug report updated successfully.");
      } else {
        const bugsRef = collection(db, "bugs");
        const docRef = await addDoc(bugsRef, {
          ...bugData,
          status: "open", // Default status
          reporterId: user.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(docRef, { id: docRef.id });

        // Add activity log
        const activityRef = collection(db, "activities");
        await addDoc(activityRef, {
          id: "",
          bugId: docRef.id,
          action: "created bug report",
          userId: user.uid,
          createdAt: serverTimestamp(),
        });

        toast.success("Bug report logged successfully.");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit bug report");
    }
  };

  // Helper colors for methods
  const getMethodColor = (method: string) => {
    switch (method?.toUpperCase()) {
      case "GET":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "POST":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "DELETE":
        return "bg-red-500/10 text-red-650 dark:text-red-400 border border-red-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20";
    }
  };

  // Filtered lists
  const filteredEndpoints = endpoints.filter((ep: any) =>
    ep.path?.toLowerCase().includes(endpointSearchText.toLowerCase()) ||
    ep.tag?.toLowerCase().includes(endpointSearchText.toLowerCase()) ||
    ep.method?.toLowerCase().includes(endpointSearchText.toLowerCase())
  );

  const selectedEndpointObj = endpoints.find(e => e.id === selectedEndpointId);
  const selectedAssigneeObj = users.find(u => u.id === selectedAssignedTo);
  const assignableUsers = useMemo(() => {
    return users
      .filter((u) => isAssignableRole(u.role))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [users]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col bg-card border border-border text-foreground rounded-2xl shadow-xl p-0 overflow-hidden">
        {/* Sticky Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 bg-neutral-50/20 dark:bg-neutral-900/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">
              {isEditing ? "Edit Bug Report" : "Report API Bug"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed mt-1">
            Provide details of the API failure, associate it with a specific endpoint, and attach diagnostic evidence.
          </DialogDescription>
        </DialogHeader>

        {loadingProject || loadingConfig ? (
          <div className="flex flex-col items-center justify-center py-20 flex-1">
            <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
            <p className="text-muted-foreground text-xs mt-3 animate-pulse">Loading form settings...</p>
          </div>
        ) : profile?.role !== "qa" && profile?.role !== "admin" ? (
          <div className="p-6">
            <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-650 dark:text-red-400">Permission Denied</h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-semibold">
                  Your role is set to <strong>{profile?.role}</strong>. Only QA engineers are allowed to log or modify bugs.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">

            {/* Scrollable Content Viewport */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto pr-4 scrollbar-thin">

              {/* Section 1: Bug Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 1: Bug Information</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={cn("space-y-1.5", config.httpStatus?.enabled ? "md:col-span-2" : "md:col-span-3")}>
                    <Label htmlFor="bug-title" className="text-xs text-foreground font-semibold">
                      Bug Title {config.title?.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="bug-title"
                      placeholder="e.g. 500 Internal Server Error on Authentication"
                      className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs h-9 font-semibold"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {config.httpStatus?.enabled && (
                    <div className="space-y-1.5">
                      <Label htmlFor="bug-http" className="text-xs text-foreground font-semibold">
                        HTTP Status Code {config.httpStatus?.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id="bug-http"
                        placeholder="e.g. 500"
                        type="number"
                        className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs h-9 font-mono font-bold"
                        {...register("httpStatus")}
                      />
                      {errors.httpStatus && (
                        <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.httpStatus.message}</p>
                      )}
                    </div>
                  )}
                </div>

                {(config.severity?.enabled || config.priority?.enabled) && (
                  <div className={cn("grid grid-cols-1 gap-4 pt-1", 
                    config.severity?.enabled && config.priority?.enabled ? "md:grid-cols-2" : "md:grid-cols-1"
                  )}>
                    {/* Severity Badge Selector */}
                    {config.severity?.enabled && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-semibold">
                          Severity Level {config.severity?.required && <span className="text-red-500">*</span>}
                        </Label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { key: "critical", label: "Critical", dot: "bg-red-500", active: "bg-red-500/10 text-red-400 border-red-500/35 shadow-[0_0_8px_rgba(239,68,68,0.15)]" },
                            { key: "major", label: "Major", dot: "bg-orange-500", active: "bg-orange-500/10 text-orange-400 border-orange-500/35 shadow-[0_0_8px_rgba(245,158,11,0.15)]" },
                            { key: "minor", label: "Minor", dot: "bg-yellow-500", active: "bg-yellow-500/10 text-yellow-400 border-yellow-500/35 shadow-[0_0_8px_rgba(234,179,8,0.15)]" },
                            { key: "low", label: "Low", dot: "bg-neutral-400", active: "bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-white/10 text-neutral-600 dark:text-neutral-300" }
                          ].map((item) => {
                             const isSel = selectedSeverity === item.key;
                             return (
                               <button
                                 key={item.key}
                                 type="button"
                                 onClick={() => setValue("severity", item.key as any)}
                                 className={cn(
                                   "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border border-neutral-250/20 dark:border-white/5 bg-neutral-100/50 dark:bg-neutral-900/60 text-[10px] font-bold text-muted-foreground hover:bg-neutral-150 dark:hover:bg-neutral-900 transition-all cursor-pointer",
                                   isSel && item.active
                                 )}
                               >
                                 <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", item.dot)} />
                                 {item.label}
                               </button>
                             );
                          })}
                        </div>
                        {errors.severity && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.severity.message}</p>
                        )}
                      </div>
                    )}

                    {/* Priority Badge Selector */}
                    {config.priority?.enabled && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-semibold">
                          Priority Level {config.priority?.required && <span className="text-red-500">*</span>}
                        </Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { key: "high", label: "High", active: "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" },
                            { key: "medium", label: "Medium", active: "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_8px_rgba(56,189,248,0.15)]" },
                            { key: "low", label: "Low", active: "bg-neutral-100 dark:bg-neutral-900 border-neutral-355 dark:border-white/10 text-neutral-600 dark:text-neutral-300" }
                          ].map((item) => {
                            const isSel = selectedPriority === item.key;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setValue("priority", item.key as any)}
                                className={cn(
                                  "flex items-center justify-center px-2 py-1.5 rounded-xl border border-neutral-250/20 dark:border-white/5 bg-neutral-100/50 dark:bg-neutral-900/60 text-[10px] font-bold text-muted-foreground hover:bg-neutral-150 dark:hover:bg-neutral-900 transition-all cursor-pointer",
                                  isSel && item.active
                                )}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>
                        {errors.priority && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.priority.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: Issue Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-neutral-250/20 dark:border-white/5 pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 2: Issue Details</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bug-desc" className="text-xs text-foreground font-semibold">
                    Problem Description {config.description?.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Textarea
                    id="bug-desc"
                    placeholder="Describe the issue in detail, including any specific payloads, request headers, or context."
                    className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3 font-semibold"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.description.message}</p>
                  )}
                </div>

                {config.stepsToReproduce?.enabled && (
                  <div className="space-y-1.5">
                    <Label htmlFor="bug-steps" className="text-xs text-foreground font-semibold">
                      Steps to Reproduce {config.stepsToReproduce?.required && <span className="text-red-500">*</span>}
                    </Label>
                    <Textarea
                      id="bug-steps"
                      placeholder="1. Post invalid credentials to /auth/login&#13;2. Observe returned structural validation failure..."
                      className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3 font-semibold"
                      {...register("stepsToReproduce")}
                    />
                    {errors.stepsToReproduce && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.stepsToReproduce.message}</p>
                    )}
                  </div>
                )}

                {(config.expectedResult?.enabled || config.actualResult?.enabled) && (
                  <div className="grid grid-cols-1 gap-4">
                    {config.expectedResult?.enabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="bug-expected" className="text-xs text-foreground font-semibold">
                          Expected Result {config.expectedResult?.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                          id="bug-expected"
                          placeholder="e.g. 401 Unauthorized status with a JSON error payload."
                          className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3 font-semibold"
                          {...register("expectedResult")}
                        />
                        {errors.expectedResult && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.expectedResult.message}</p>
                        )}
                      </div>
                    )}
                    {config.actualResult?.enabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="bug-actual" className="text-xs text-foreground font-semibold">
                          Actual Result {config.actualResult?.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                          id="bug-actual"
                          placeholder="e.g. 500 Server Error showing a DB execution stacktrace."
                          className="bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3 font-semibold"
                          {...register("actualResult")}
                        />
                        {errors.actualResult && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.actualResult.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Assignment & Endpoint */}
              {(config.endpointId?.enabled || config.assignedTo?.enabled) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-250/20 dark:border-white/5 pb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 3: Assignment & Endpoint</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">

                    {/* Custom Searchable Endpoint Selector */}
                    {config.endpointId?.enabled && (
                      <div className="space-y-1.5" ref={dropdownRef}>
                        <Label className="text-xs text-foreground font-semibold flex items-center gap-1">
                          <LinkIcon className="h-3 w-3 text-muted-foreground" />
                          Linked API Endpoint {config.endpointId?.required && <span className="text-red-500">*</span>}
                        </Label>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setEndpointSearchOpen(!endpointSearchOpen)}
                            className="flex h-9 w-full items-center justify-between rounded-xl border border-neutral-250/20 dark:border-white/5 bg-neutral-100/50 dark:bg-neutral-900/60 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/10 cursor-pointer"
                          >
                            {selectedEndpointObj ? (
                              <div className="flex items-center gap-2 truncate">
                                <span className={cn("px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold tracking-wide", getMethodColor(selectedEndpointObj.method))}>
                                  {selectedEndpointObj.method}
                                </span>
                                <span className="font-mono text-[11px] text-foreground truncate">{selectedEndpointObj.path}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">None (General Bug)</span>
                            )}
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          </button>

                          <AnimatePresence>
                            {endpointSearchOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-50 mt-1 w-full rounded-xl border border-neutral-250/20 dark:border-white/10 bg-card shadow-lg p-2 space-y-2 max-h-[220px] flex flex-col"
                              >
                                <div className="relative flex items-center shrink-0">
                                  <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                  <Input
                                    placeholder="Search endpoints..."
                                    value={endpointSearchText}
                                    onChange={(e) => setEndpointSearchText(e.target.value)}
                                    className="h-8 pl-8 text-xs bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-250/20 dark:border-white/5 rounded-lg"
                                  />
                                </div>
                                <div className="overflow-y-auto space-y-0.5 flex-1 pr-1 scrollbar-thin">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setValue("endpointId", "");
                                      setEndpointSearchOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 font-semibold cursor-pointer text-muted-foreground"
                                  >
                                    <span>None (General Bug)</span>
                                    {!selectedEndpointId && <Check className="h-3.5 w-3.5 text-sky-500" />}
                                  </button>

                                  {filteredEndpoints.length === 0 ? (
                                    <p className="text-[10px] text-center text-muted-foreground py-4">No matching endpoints found</p>
                                  ) : (
                                    filteredEndpoints.map((ep) => {
                                      const isSel = selectedEndpointId === ep.id;
                                      return (
                                        <button
                                          key={ep.id}
                                          type="button"
                                          onClick={() => {
                                            setValue("endpointId", ep.id);
                                            setEndpointSearchOpen(false);
                                          }}
                                          className="flex w-full flex-col text-left px-2 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer group"
                                        >
                                          <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 truncate">
                                              <span className={cn("px-1 py-0.2 rounded font-mono text-[8px] font-extrabold", getMethodColor(ep.method))}>
                                                {ep.method}
                                              </span>
                                              <span className="font-mono text-[11px] truncate text-foreground group-hover:text-sky-500 transition-colors">{ep.path}</span>
                                              <span className="bg-neutral-100 dark:bg-neutral-950 px-1 py-0.2 rounded text-[8px] font-semibold text-muted-foreground uppercase border border-border">
                                                {ep.tag}
                                              </span>
                                            </div>
                                            {isSel && <Check className="h-3.5 w-3.5 text-sky-500" />}
                                          </div>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {errors.endpointId && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.endpointId.message}</p>
                        )}
                      </div>
                    )}

                    {/* Assignee Custom Dropdown */}
                    {config.assignedTo?.enabled && (
                      <div className="space-y-1.5" ref={assigneeDropdownRef}>
                        <Label className="text-xs text-foreground font-semibold flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          Assignee {config.assignedTo?.required && <span className="text-red-500">*</span>}
                        </Label>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setAssigneeSearchOpen(!assigneeSearchOpen)}
                            className="flex h-9 w-full items-center justify-between rounded-xl border border-neutral-250/20 dark:border-white/5 bg-neutral-100/50 dark:bg-neutral-900/60 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/10 cursor-pointer"
                          >
                            {selectedAssigneeObj ? (
                              <div className="flex items-center gap-2">
                                <div className="h-4.5 w-4.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-[10px] text-indigo-500 uppercase font-extrabold font-mono">
                                  {selectedAssigneeObj.name?.substring(0, 2)}
                                </div>
                                <span className="font-semibold text-foreground">{selectedAssigneeObj.name}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Unassigned</span>
                            )}
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                          </button>

                          <AnimatePresence>
                            {assigneeSearchOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-50 mt-1 w-full rounded-xl border border-neutral-250/20 dark:border-white/10 bg-card shadow-lg p-2 space-y-1 max-h-[180px] overflow-y-auto"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValue("assignedTo", "");
                                    setAssigneeSearchOpen(false);
                                  }}
                                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 font-semibold cursor-pointer text-muted-foreground"
                                >
                                  <span>Unassigned</span>
                                  {!selectedAssignedTo && <Check className="h-3.5 w-3.5 text-sky-500" />}
                                </button>

                                {assignableUsers.length === 0 ? (
                                  <p className="text-[10px] text-center text-muted-foreground py-4">
                                    No developers or admins found
                                  </p>
                                ) : (
                                  assignableUsers.map((u) => {
                                    const isSel = selectedAssignedTo === u.id;
                                    return (
                                      <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => {
                                          setValue("assignedTo", u.id);
                                          setAssigneeSearchOpen(false);
                                        }}
                                        className="flex w-full items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="h-4.5 w-4.5 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-neutral-250/20 dark:border-white/5 flex items-center justify-center text-[9px] font-extrabold">
                                            {u.name?.substring(0, 2).toUpperCase()}
                                          </div>
                                          <span className="font-semibold text-foreground">{u.name}</span>
                                          <span className="text-[9px] text-muted-foreground bg-neutral-100 dark:bg-neutral-950 px-1 py-0.2 rounded border border-border">
                                            {u.role}
                                          </span>
                                        </div>
                                        {isSel && <Check className="h-3.5 w-3.5 text-sky-500" />}
                                      </button>
                                    );
                                  })
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {errors.assignedTo && (
                          <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.assignedTo.message}</p>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Section 4: Attachments */}
              {config.screenshots?.enabled && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-250/20 dark:border-white/5 pb-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 4: Attachments</span>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-xs text-foreground font-semibold">
                      Screenshots & Evidence {config.screenshots?.required && <span className="text-red-500">*</span>}
                    </Label>
                    <UploadDropzone
                      projectId={projectId}
                      onUploadSuccess={(url) => setScreenshotUrls(prev => [...prev, url])}
                    />
                    {errors.screenshots && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.screenshots.message}</p>
                    )}

                    {screenshotUrls.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                        {screenshotUrls.map((url, idx) => (
                          <div key={idx} className="relative group rounded-2xl overflow-hidden aspect-video border border-neutral-250/20 dark:border-white/5 bg-card flex items-center justify-center">
                            <img src={url} alt="screenshot" className="object-cover w-full h-full" />
                            <button
                              type="button"
                              onClick={() => handleRemoveScreenshot(url)}
                              className="absolute top-1.5 right-1.5 bg-neutral-900/90 dark:bg-black/90 hover:bg-red-500 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Sticky Footer Action Bar */}
            <DialogFooter className="pt-4 pb-8 px-6 border-t border-neutral-250/20 dark:border-white/5 bg-neutral-50/20 dark:bg-neutral-900/10 gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-neutral-250/20 dark:border-white/5 text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl text-xs px-4 h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs px-4 h-9 cursor-pointer transition-opacity rounded-xl"
              >
                {isSubmitting ? "Logging Bug..." : isEditing ? "Save Changes" : "Submit Bug Report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
