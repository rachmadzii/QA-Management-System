'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/providers/AuthProvider';
import { db } from '@/lib/firebase';
import {
  doc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const projectSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().optional(),
  baseUrl: z
    .string()
    .url('Must be a valid URL starting with http/https')
    .or(z.literal('')),
  swaggerUrl: z
    .string()
    .url('Must be a valid URL starting with http/https')
    .or(z.literal('')),
  environment: z.enum(['development', 'staging', 'production']),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const envLabels: Record<string, string> = {
  development: 'Development',
  staging: 'Staging',
  production: 'Production',
};

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectToEdit?: any;
  onSuccess: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  projectToEdit,
  onSuccess,
}: ProjectDialogProps) {
  const { user } = useAuth();
  const isEditing = !!projectToEdit;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      baseUrl: '',
      swaggerUrl: '',
      environment: 'development',
    },
  });

  const selectedEnvironment = useWatch({
    control,
    name: 'environment',
  });

  useEffect(() => {
    if (open) {
      if (projectToEdit) {
        reset({
          name: projectToEdit.name || '',
          description: projectToEdit.description || '',
          baseUrl: projectToEdit.baseUrl || '',
          swaggerUrl: projectToEdit.swaggerUrl || '',
          environment: projectToEdit.environment || 'development',
        });
      } else {
        reset({
          name: '',
          description: '',
          baseUrl: '',
          swaggerUrl: '',
          environment: 'development',
        });
      }
    }
  }, [open, projectToEdit, reset]);

  const onSubmit = async (values: ProjectFormValues) => {
    if (!user) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      if (isEditing) {
        // Edit project
        const projectRef = doc(db, 'projects', projectToEdit.id);
        await updateDoc(projectRef, {
          name: values.name,
          description: values.description,
          baseUrl: values.baseUrl,
          swaggerUrl: values.swaggerUrl,
          environment: values.environment,
          updatedAt: serverTimestamp(),
        });
        toast.success('Project updated successfully!');
      } else {
        // Create project
        const projectsRef = collection(db, 'projects');
        const docRef = await addDoc(projectsRef, {
          name: values.name,
          description: values.description,
          baseUrl: values.baseUrl,
          swaggerUrl: values.swaggerUrl,
          environment: values.environment,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });

        // Save the generated document ID inside the document as well for clean queries
        await updateDoc(docRef, { id: docRef.id });
        toast.success('Project created successfully!');
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save project');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground rounded-2xl shadow-lg p-6">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-foreground text-base font-bold">
            {isEditing ? 'Edit API Project' : 'Create API Project'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
            {isEditing
              ? 'Update the details and environments for this project.'
              : 'Set up a new API project. Connect your OpenAPI / Swagger documentation to enable syncing.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-2 text-xs"
        >
          <div className="space-y-1.5">
            <Label
              htmlFor="name"
              className="text-muted-foreground font-semibold"
            >
              Project Name
            </Label>
            <Input
              id="name"
              placeholder="E-Commerce API"
              className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs h-9"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-500 font-semibold mt-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="description"
              className="text-muted-foreground font-semibold"
            >
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Internal endpoints for shopping cart, payment, and catalog routing."
              className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs min-h-[70px] leading-relaxed"
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="environment"
              className="text-muted-foreground font-semibold"
            >
              Environment
            </Label>
            <Select
              onValueChange={(val) => setValue('environment', val as any)}
              defaultValue={projectToEdit?.environment || 'development'}
            >
              <SelectTrigger
                id="environment"
                className="bg-card border-border text-foreground focus:ring-sky-500/20 rounded-lg text-xs h-9 w-full"
              >
                <SelectValue placeholder="Select environment">
                  {envLabels[selectedEnvironment || 'development']}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground text-xs rounded-xl shadow-md">
                <SelectItem value="development" className="rounded-lg">
                  Development
                </SelectItem>
                <SelectItem value="staging" className="rounded-lg">
                  Staging
                </SelectItem>
                <SelectItem value="production" className="rounded-lg">
                  Production
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="baseUrl"
              className="text-muted-foreground font-semibold"
            >
              Base Server URL
            </Label>
            <Input
              id="baseUrl"
              placeholder="https://api.staging.com/v1"
              className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs h-9"
              {...register('baseUrl')}
            />
            {errors.baseUrl && (
              <p className="text-xs text-red-500 font-semibold mt-1">
                {errors.baseUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="swaggerUrl"
              className="text-muted-foreground font-semibold"
            >
              Swagger / OpenAPI URL
            </Label>
            <Input
              id="swaggerUrl"
              placeholder="https://api.staging.com/v1/swagger.json"
              className="bg-card border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500/20 rounded-xl text-xs h-9"
              {...register('swaggerUrl')}
            />
            {errors.swaggerUrl && (
              <p className="text-xs text-red-500 font-semibold mt-1">
                {errors.swaggerUrl.message}
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-border text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-xs px-4 h-9 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-semibold shadow-xs rounded-lg text-xs px-4 h-9 cursor-pointer transition-opacity"
            >
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
