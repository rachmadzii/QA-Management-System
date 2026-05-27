'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  Undo2,
  RefreshCcw,
  Loader2,
  ShieldAlert,
  Eye,
  Asterisk,
  Settings,
  AlertCircle,
} from 'lucide-react';
import { BugFormConfig, DEFAULT_BUG_FORM_CONFIG } from '@/lib/bugFormUtils';

interface FieldMeta {
  key: keyof BugFormConfig;
  label: string;
  description: string;
  canDisableVisibility: boolean;
}

const FIELD_METADATA: FieldMeta[] = [
  {
    key: 'title',
    label: 'Bug Title',
    description:
      'The primary headline summarizing the issue. Essential for lists and dashboard view.',
    canDisableVisibility: false,
  },
  {
    key: 'description',
    label: 'Problem Description',
    description:
      'Detailed context, request payloads, response bodies, or textual descriptions of the error.',
    canDisableVisibility: false,
  },
  {
    key: 'stepsToReproduce',
    label: 'Steps to Reproduce',
    description:
      'Numbered or bulleted list of commands, actions, or steps to reproduce the bug.',
    canDisableVisibility: true,
  },
  {
    key: 'expectedResult',
    label: 'Expected Result',
    description:
      'What the API or application should have returned under nominal circumstances.',
    canDisableVisibility: true,
  },
  {
    key: 'actualResult',
    label: 'Actual Result',
    description:
      'What was actually returned (e.g. error payloads, stacktraces, or wrong status codes).',
    canDisableVisibility: true,
  },
  {
    key: 'severity',
    label: 'Severity Level',
    description:
      'Categorize the issue impact (Critical, Major, Minor, Low) using color-coded badge selectors.',
    canDisableVisibility: true,
  },
  {
    key: 'priority',
    label: 'Priority Level',
    description:
      'Define the resolution urgency (High, Medium, Low) to schedule developer triage.',
    canDisableVisibility: true,
  },
  {
    key: 'httpStatus',
    label: 'HTTP Status Code',
    description:
      'Numerical input field validating status codes (e.g. 500, 404, 400).',
    canDisableVisibility: true,
  },
  {
    key: 'endpointId',
    label: 'Linked API Endpoint',
    description:
      'Connect reports to specific route paths retrieved from the Swagger specification.',
    canDisableVisibility: true,
  },
  {
    key: 'assignedTo',
    label: 'Assignee',
    description:
      'Directly assign developer resources or project managers to take ownership.',
    canDisableVisibility: true,
  },
  {
    key: 'screenshots',
    label: 'Screenshots & Evidence',
    description:
      'Allow uploading diagnostic image files to visually confirm structural failures.',
    canDisableVisibility: true,
  },
];

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const projectId = params.id as string;
  const isAdmin = profile?.role === 'admin';

  const [localConfig, setLocalConfig] = useState<BugFormConfig | null>(null);

  // 1. Fetch Project Details
  const {
    data: project,
    isLoading: loadingProject,
    refetch,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Project not found');
      }
      return docSnap.data();
    },
  });

  // Populate local config state when project loads
  useEffect(() => {
    if (project) {
      setLocalConfig({
        ...DEFAULT_BUG_FORM_CONFIG,
        ...project.bugFormConfig,
      });
    }
  }, [project]);

  // 2. Save Config Mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: BugFormConfig) => {
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, {
        bugFormConfig: newConfig,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Bug form configuration updated successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save configuration.');
    },
  });

  const handleToggleVisibility = (
    key: keyof BugFormConfig,
    checked: boolean,
  ) => {
    if (!localConfig) return;

    setLocalConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          enabled: checked,
          // Crucial rule: If disabled, field cannot be required
          required: checked ? prev[key].required : false,
        },
      };
    });
  };

  const handleToggleRequired = (key: keyof BugFormConfig, checked: boolean) => {
    if (!localConfig) return;

    setLocalConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          required: checked,
        },
      };
    });
  };

  const handleResetToDefaults = () => {
    setLocalConfig(DEFAULT_BUG_FORM_CONFIG);
    toast.info(
      "Form configuration reset to defaults. Click 'Save Changes' to commit.",
    );
  };

  const handleDiscardChanges = () => {
    if (project) {
      setLocalConfig({
        ...DEFAULT_BUG_FORM_CONFIG,
        ...project.bugFormConfig,
      });
      toast.info('Changes discarded.');
    }
  };

  const handleSaveChanges = () => {
    if (!localConfig) return;
    saveMutation.mutate(localConfig);
  };

  // Loading indicator for fetching project details
  if (loadingProject) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-3 animate-pulse">
          Loading settings...
        </p>
      </div>
    );
  }

  // Handle case where project is missing
  if (!project) {
    return (
      <div className="text-center py-20 bg-card border border-border rounded-2xl">
        <h3 className="text-base font-bold text-foreground">
          Project not found
        </h3>
        <Button
          variant="link"
          onClick={() => router.push('/projects')}
          className="text-sky-500 mt-2 text-xs"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  // Access check: Admins only
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <a
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to project
        </a>

        <div className="bg-card border border-border rounded-2xl p-8 max-w-2xl mx-auto shadow-sm text-center">
          <div className="mx-auto w-12 h-12 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-center text-red-500 mb-4">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-base font-extrabold text-foreground tracking-tight">
            Access Denied
          </h2>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-sm mx-auto mt-2 font-semibold">
            Only project Administrators possess permission to modify bug form
            fields and validation rules.
          </p>
          <Button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mt-5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 border border-border text-foreground font-semibold text-xs rounded-xl"
          >
            Return to Project
          </Button>
        </div>
      </div>
    );
  }

  const hasChanges =
    localConfig &&
    JSON.stringify(localConfig) !==
      JSON.stringify({ ...DEFAULT_BUG_FORM_CONFIG, ...project.bugFormConfig });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <a
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to {project.name}
        </a>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={handleResetToDefaults}
            className="text-muted-foreground hover:text-foreground text-xs gap-1.5 h-8 px-3 rounded-lg"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Main header block */}
      <div className="border-b border-border/40 pb-6 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500">
            <Settings className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Bug Form Configuration
          </h1>
        </div>
        <p className="text-muted-foreground text-xs max-w-2xl leading-relaxed">
          Customize visibility and requirement rules for the bug report dialog
          in <strong>{project.name}</strong>. Core fields are locked to visible.
        </p>
      </div>

      {/* Settings Grid list */}
      <div className="space-y-4">
        {localConfig &&
          FIELD_METADATA.map((field) => {
            const configVal = localConfig[field.key] || {
              enabled: true,
              required: false,
            };
            const isVisible = configVal.enabled;
            const isRequired = configVal.required;

            return (
              <div
                key={field.key}
                className="bg-card hover:bg-neutral-50/20 dark:hover:bg-neutral-900/10 border border-border/50 hover:border-border transition-all duration-200 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Field Details */}
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-foreground">
                      {field.label}
                    </span>
                    {!field.canDisableVisibility && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 border border-sky-500/20 text-sky-650 dark:text-sky-400 font-extrabold uppercase tracking-wide">
                        Core Field
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                    {field.description}
                  </p>
                </div>

                {/* Configuration Controls */}
                <div className="flex items-center gap-6 shrink-0 sm:self-center border-t sm:border-t-0 border-border/30 pt-3 sm:pt-0">
                  {/* Visibility toggle (Hide if core) */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Visible
                    </span>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={(checked) =>
                        handleToggleVisibility(field.key, checked)
                      }
                      disabled={!field.canDisableVisibility}
                    />
                  </div>

                  {/* Required state toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
                      <Asterisk className="h-3 w-3" />
                      Required
                    </span>
                    <Switch
                      checked={isRequired}
                      onCheckedChange={(checked) =>
                        handleToggleRequired(field.key, checked)
                      }
                      disabled={!isVisible} // Disabled if hidden
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Sticky Bottom Actions Bar */}
      {localConfig && (
        <div className="sticky bottom-4 z-40 bg-card/90 backdrop-blur-md border border-border p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
            {hasChanges ? (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertCircle className="h-4 w-4" />
                Unsaved changes pending
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500">
                <AlertCircle className="h-4 w-4" />
                Config matches Firestore
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={!hasChanges || saveMutation.isPending}
              onClick={handleDiscardChanges}
              className="bg-transparent border-border hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl text-xs h-9 px-4 cursor-pointer gap-1.5"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Discard
            </Button>
            <Button
              disabled={!hasChanges || saveMutation.isPending}
              onClick={handleSaveChanges}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 disabled:opacity-50 text-white font-semibold shadow-xs rounded-xl text-xs h-9 px-4 cursor-pointer gap-1.5 transition-opacity"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
