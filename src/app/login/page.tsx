"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, UserRole } from "@/providers/AuthProvider";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AlertCircle, Terminal, ShieldAlert, Mail, Lock, User, Eye, EyeOff, Sparkles } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "qa", "developer", "viewer"]),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  qa: "QA",
  developer: "Developer",
  viewer: "Viewer",
};

export default function LoginPage() {
  const { firebaseConfigured } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", role: "viewer" },
  });

  const handleLogin = async (data: LoginFormValues) => {
    if (!firebaseConfigured) {
      toast.error("Firebase is not configured yet. Check .env.local file.");
      return;
    }
    setLoading(true);
    try {
      if (!auth) throw new Error("Firebase not configured");
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Successfully logged in!");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormValues) => {
    if (!firebaseConfigured) {
      toast.error("Firebase is not configured yet. Check .env.local file.");
      return;
    }
    setLoading(true);
    try {
      if (!auth) throw new Error("Firebase not configured");
      await createUserWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Account created successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-200 overflow-hidden relative">
      {/* Glow decorative effects for the background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.02),transparent_60%)] pointer-events-none" />

      {/* LEFT PANE - Branding, Features & Stats (Hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-[50%] bg-neutral-950 text-white flex-col justify-between p-16 relative overflow-hidden border-r border-neutral-900 select-none">
        {/* Animated backdrop grid & blobs */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-sky-500/10 blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="inline-flex h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 items-center justify-center shadow-lg shadow-indigo-500/10 text-white">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            QABug Workspace
          </span>
        </div>

        {/* Middle Value Proposition */}
        <div className="space-y-4">
          <span className="px-2.5 py-1 rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-400 text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            API Quality Assurance
          </span>
          <h2 className="text-4xl font-extrabold tracking-tight leading-[1.15] bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
            Track bugs, sync specs, and elevate API health.
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed font-semibold">
            The internal QA workspace that unifies OpenAPI specs, automated developer task routing, and clear issue diagnosis.
          </p>
        </div>

        {/* Footer Area */}
        <div className="text-neutral-500 text-xs font-semibold relative z-10">
          &copy; 2026 QABug Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANE - Interactive Form Container */}
      <div className="w-full lg:w-[50%] flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 overflow-y-auto">

        {/* Glow backdrop for mobile screens */}
        <div className="lg:hidden absolute top-10 left-10 w-[250px] h-[250px] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

        <div className="w-full max-w-[400px] space-y-6">
          {/* Logo element for smaller screens (Mobile view only) */}
          <div className="lg:hidden text-center space-y-3 mb-6">
            <div className="inline-flex h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-400 via-indigo-500 to-purple-600 items-center justify-center shadow-lg text-white mx-auto">
              <Terminal className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              QABug Workspace
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
              Internal API bug tracking and QA management platform.
            </p>
          </div>

          {!firebaseConfigured && (
            <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-md rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2 text-sm font-bold">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  Configuration Required
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs leading-relaxed">
                  Your Firebase client setup variables in <code className="bg-neutral-100 dark:bg-neutral-850 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> are missing.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground/80 leading-relaxed pb-4">
                Open <code className="bg-neutral-150 dark:bg-neutral-850 text-foreground px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> and enter your keys, then restart the server.
              </CardContent>
            </Card>
          )}

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-muted-foreground text-xs font-semibold leading-relaxed">
              {activeTab === "login"
                ? "Enter your credentials to access your quality workspace"
                : "Register a profile to collaborate and log project issues"}
            </p>
          </div>

          <Card className="border border-border/80 bg-card shadow-xl shadow-neutral-200/20 dark:shadow-none rounded-2xl overflow-hidden p-1">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <div className="px-4 pt-4 pb-2">
                <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-900 border border-border/80 rounded-xl !h-fit">
                  <TabsTrigger value="login" className="text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground py-1.5 rounded-lg font-bold transition-all shadow-xs">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground py-1.5 rounded-lg font-bold transition-all shadow-xs">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="login" className="mt-0">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-foreground/85 font-semibold">Email Address</Label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 rounded-xl text-xs h-10"
                        {...loginForm.register("email")}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs text-foreground/85 font-semibold">Password</Label>
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-background border-border text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 rounded-xl text-xs h-10"
                        {...loginForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs h-10 shadow-sm rounded-xl cursor-pointer transition-opacity mt-2"
                    disabled={loading || !firebaseConfigured}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4 p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-xs text-foreground/85 font-semibold">Full Name</Label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        id="signup-name"
                        placeholder="Alex Mercer"
                        className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 rounded-xl text-xs h-10"
                        {...signupForm.register("name")}
                      />
                    </div>
                    {signupForm.formState.errors.name && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-xs text-foreground/85 font-semibold">Email Address</Label>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@company.com"
                        className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 rounded-xl text-xs h-10"
                        {...signupForm.register("email")}
                      />
                    </div>
                    {signupForm.formState.errors.email && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-xs text-foreground/85 font-semibold">Password</Label>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-muted-foreground/70" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10 bg-background border-border text-foreground placeholder-muted-foreground/60 focus-visible:ring-sky-500/20 focus-visible:border-sky-500 rounded-xl text-xs h-10"
                        {...signupForm.register("password")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {signupForm.formState.errors.password && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1.5 mt-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-role" className="text-xs text-foreground/85 font-semibold">Workspace Role</Label>
                    <Select
                      onValueChange={(val) => signupForm.setValue("role", val as UserRole)}
                      defaultValue={signupForm.getValues("role")}
                    >
                      <SelectTrigger id="signup-role" className="bg-background border-border text-foreground focus:ring-sky-500/10 focus-visible:ring-sky-500/20 rounded-xl text-xs h-10 cursor-pointer w-full">
                        <SelectValue placeholder="Select workspace role">
                          {roleLabels[signupForm.watch("role")]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground text-xs rounded-xl">
                        <SelectItem value="admin" className="rounded-lg">Admin (Manage projects & sync)</SelectItem>
                        <SelectItem value="qa" className="rounded-lg">QA (Create & edit bugs)</SelectItem>
                        <SelectItem value="developer" className="rounded-lg">Developer (Update bugs status)</SelectItem>
                        <SelectItem value="viewer" className="rounded-lg">Viewer (Read-only access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 hover:opacity-95 text-white font-bold text-xs h-10 shadow-sm rounded-xl cursor-pointer transition-opacity mt-2"
                    disabled={loading || !firebaseConfigured}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating Profile...
                      </span>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
