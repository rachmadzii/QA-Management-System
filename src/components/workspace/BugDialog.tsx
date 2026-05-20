"use client";

import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, addDoc, collection, serverTimestamp, updateDoc, getDocs, query, where } from "firebase/firestore";
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
  Check
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const bugSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  stepsToReproduce: z.string().min(10, "Steps to reproduce must be at least 10 characters"),
  expectedResult: z.string().min(5, "Expected result must be at least 5 characters"),
  actualResult: z.string().min(5, "Actual result must be at least 5 characters"),
  severity: z.enum(["critical", "major", "minor", "low"]),
  priority: z.enum(["high", "medium", "low"]),
  httpStatus: z.string().optional().refine((val) => {
    if (!val) return true;
    const num = parseInt(val);
    return !isNaN(num) && num >= 100 && num <= 599;
  }, "Must be a valid HTTP status code (100-599)"),
  endpointId: z.string().optional(),
  assignedTo: z.string().optional(),
});

type BugFormValues = z.infer<typeof bugSchema>;

interface BugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  bugToEdit?: any;
  initialEndpointId?: string;
  onSuccess: () => void;
}

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BugFormValues>({
    resolver: zodResolver(bugSchema),
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
        const usersList = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
        });
        setScreenshotUrls([]);
      }
    }
  }, [open, bugToEdit, initialEndpointId, reset]);

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
        stepsToReproduce: values.stepsToReproduce,
        expectedResult: values.expectedResult,
        actualResult: values.actualResult,
        severity: values.severity,
        priority: values.priority,
        httpStatus: values.httpStatus ? parseInt(values.httpStatus) : null,
        endpointId: values.endpointId || null,
        endpointPath: selectedEp?.path || null,
        endpointMethod: selectedEp?.method || null,
        swaggerLink: selectedEp?.swaggerLink || null,
        assignedTo: values.assignedTo || null,
        screenshotUrls,
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

        {profile?.role !== "qa" && profile?.role !== "admin" ? (
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
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">

            {/* Scrollable Content Viewport */}
            <div className="p-6 space-y-6 flex-1 max-h-[calc(90vh-200px)] overflow-y-auto pr-4 scrollbar-thin">

              {/* Section 1: Bug Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 1: Bug Information</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="bug-title" className="text-xs text-foreground font-semibold">Bug Title</Label>
                    <Input
                      id="bug-title"
                      placeholder="e.g. 500 Internal Server Error on Authentication"
                      className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs h-9"
                      {...register("title")}
                    />
                    {errors.title && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="bug-http" className="text-xs text-foreground font-semibold">HTTP Status Code</Label>
                    <Input
                      id="bug-http"
                      placeholder="e.g. 500"
                      type="number"
                      className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs h-9 font-mono"
                      {...register("httpStatus")}
                    />
                    {errors.httpStatus && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.httpStatus.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Severity Badge Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-semibold">Severity Level</Label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { key: "critical", label: "Critical", dot: "bg-red-500", active: "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/35" },
                        { key: "major", label: "Major", dot: "bg-orange-500", active: "bg-orange-500/10 text-orange-650 dark:text-orange-400 border-orange-500/35" },
                        { key: "minor", label: "Minor", dot: "bg-yellow-500", active: "bg-yellow-500/10 text-yellow-650 dark:text-yellow-400 border-yellow-500/35" },
                        { key: "low", label: "Low", dot: "bg-neutral-400", active: "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-border" }
                      ].map((item) => {
                        const isSel = selectedSeverity === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setValue("severity", item.key as any)}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors cursor-pointer",
                              isSel && item.active
                            )}
                          >
                            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", item.dot)} />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Priority Badge Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-semibold">Priority Level</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { key: "high", label: "High", active: "bg-red-500/10 text-red-650 dark:text-red-400 border-red-500/30" },
                        { key: "medium", label: "Medium", active: "bg-sky-500/10 text-sky-650 dark:text-sky-400 border-sky-500/30" },
                        { key: "low", label: "Low", active: "bg-neutral-100 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-border" }
                      ].map((item) => {
                        const isSel = selectedPriority === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setValue("priority", item.key as any)}
                            className={cn(
                              "flex items-center justify-center px-2 py-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors cursor-pointer",
                              isSel && item.active
                            )}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Issue Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 2: Issue Details</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bug-desc" className="text-xs text-foreground font-semibold">Problem Description</Label>
                  <Textarea
                    id="bug-desc"
                    placeholder="Describe the issue in detail, including any specific payloads, request headers, or context."
                    className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.description.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bug-steps" className="text-xs text-foreground font-semibold">Steps to Reproduce</Label>
                  <Textarea
                    id="bug-steps"
                    placeholder="1. Post invalid authorization credentials to /auth/login&#13;2. Observe return payload structures..."
                    className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3"
                    {...register("stepsToReproduce")}
                  />
                  {errors.stepsToReproduce && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.stepsToReproduce.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bug-expected" className="text-xs text-foreground font-semibold">Expected Result</Label>
                    <Textarea
                      id="bug-expected"
                      placeholder="e.g. 401 Unauthorized status with a JSON error payload."
                      className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3"
                      {...register("expectedResult")}
                    />
                    {errors.expectedResult && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.expectedResult.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bug-actual" className="text-xs text-foreground font-semibold">Actual Result</Label>
                    <Textarea
                      id="bug-actual"
                      placeholder="e.g. 500 Server Error showing a DB execution stacktrace."
                      className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed p-3"
                      {...register("actualResult")}
                    />
                    {errors.actualResult && (
                      <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.actualResult.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Assignment & Endpoint */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 3: Assignment & Endpoint</span>
                </div>

                <div className="grid grid-cols-1 gap-4">

                  {/* Custom Searchable Endpoint Selector */}
                  <div className="space-y-1.5" ref={dropdownRef}>
                    <Label className="text-xs text-foreground font-semibold flex items-center gap-1">
                      <LinkIcon className="h-3 w-3 text-muted-foreground" />
                      Linked API Endpoint
                    </Label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setEndpointSearchOpen(!endpointSearchOpen)}
                        className="flex h-9 w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/10 cursor-pointer"
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
                            className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg p-2 space-y-2 max-h-[220px] flex flex-col"
                          >
                            <div className="relative flex items-center shrink-0">
                              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search endpoints..."
                                value={endpointSearchText}
                                onChange={(e) => setEndpointSearchText(e.target.value)}
                                className="h-8 pl-8 text-xs bg-card border-border rounded-lg"
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
                  </div>

                  {/* Assignee Custom Dropdown */}
                  <div className="space-y-1.5" ref={assigneeDropdownRef}>
                    <Label className="text-xs text-foreground font-semibold flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      Assignee
                    </Label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setAssigneeSearchOpen(!assigneeSearchOpen)}
                        className="flex h-9 w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/10 cursor-pointer"
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
                            className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg p-2 space-y-1 max-h-[180px] overflow-y-auto"
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

                            {users
                              .filter((u) => u.role === "developer" || u.role === "admin")
                              .map((u) => {
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
                                      <div className="h-4.5 w-4.5 rounded-full bg-neutral-100 dark:bg-neutral-950 border border-border flex items-center justify-center text-[9px] font-extrabold">
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
                              })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                </div>
              </div>

              {/* Section 4: Attachments */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Section 4: Attachments</span>
                </div>

                <div className="space-y-2.5">
                  <Label className="text-xs text-foreground font-semibold">Screenshots & Evidence</Label>
                  <UploadDropzone
                    projectId={projectId}
                    onUploadSuccess={(url) => setScreenshotUrls(prev => [...prev, url])}
                  />

                  {screenshotUrls.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                      {screenshotUrls.map((url, idx) => (
                        <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-border bg-card flex items-center justify-center">
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

            </div>

            {/* Sticky Footer Action Bar */}
            <DialogFooter className="pt-4 pb-8 px-6 border-t border-border/80 bg-neutral-50/20 dark:bg-neutral-900/10 gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-transparent border-border text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl text-xs px-4 h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-semibold shadow-xs rounded-xl text-xs px-4 h-9 cursor-pointer transition-opacity"
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
