"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { ProjectCard } from "@/components/workspace/ProjectCard";
import { ProjectDialog } from "@/components/workspace/ProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FolderKanban, Loader2 } from "lucide-react";

export default function ProjectsPage() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  // TanStack Query to fetch all projects
  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }
  });

  const filteredProjects = projects.filter((project: any) =>
    project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClick = () => {
    setEditingProject(null);
    setDialogOpen(true);
  };

  const handleEditClick = (project: any) => {
    setEditingProject(project);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="h-6 w-6 text-sky-500" />
            API Projects
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Create, manage, and inspect multi-environment API integrations.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={handleCreateClick}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-semibold gap-2 self-start sm:self-auto shrink-0 shadow-sm rounded-xl py-2 cursor-pointer transition-opacity text-xs"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {/* Filter and Search controls */}
      <div className="flex items-center bg-card border border-border rounded-xl px-3 py-1.5 max-w-sm shadow-xs focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:border-sky-500/50 transition-all duration-200">
        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-foreground placeholder-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 h-7 p-0 text-xs w-full"
        />
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
          <p className="text-muted-foreground text-xs mt-3">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-border/80 rounded-2xl bg-card/30">
          <div className="h-12 w-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-border flex items-center justify-center mb-4 text-muted-foreground">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No projects found</h3>
          <p className="text-muted-foreground text-xs mt-1 max-w-xs leading-relaxed">
            {searchQuery
              ? "No projects match your search query."
              : "Create your first API project and connect Swagger documentation."}
          </p>
          {isAdmin && !searchQuery && (
            <Button
              onClick={handleCreateClick}
              variant="outline"
              className="mt-4 border-border text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-xs"
            >
              Get Started
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project: any) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => handleEditClick(project)}
              onRefresh={refetch}
            />
          ))}
        </div>
      )}

      {/* Dialog for CRUD operations */}
      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectToEdit={editingProject}
        onSuccess={refetch}
      />
    </div>
  );
}
