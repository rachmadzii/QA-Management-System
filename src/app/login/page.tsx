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
import { AlertCircle, Terminal, ShieldAlert } from "lucide-react";
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
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast.success("Successfully logged in!");
    } catch (error: any) {
      console.error(error);
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
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: data.name });

      // Save user profile details with chosen role in Firestore
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: serverTimestamp(),
      });

      toast.success("Account created successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative transition-colors duration-200">
      {/* Background design */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.04),transparent_60%)] pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_right,rgba(168,85,247,0.03),transparent_70%)] pointer-events-none" />

      {/* Main Logo Container */}
      <div className="mb-8 text-center relative z-10">
        <div className="inline-flex h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 items-center justify-center shadow-md mb-4 text-white">
          <Terminal className="h-5.5 w-5.5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          QABug
        </h1>
        <p className="text-muted-foreground text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
          Internal API bug tracking and QA management platform integrated with Swagger/OpenAPI.
        </p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {!firebaseConfigured && (
          <Card className="border-amber-500/20 bg-amber-500/5 backdrop-blur-md mb-6 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-amber-600 dark:text-amber-500 flex items-center gap-2 text-sm font-bold">
                <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                Firebase Configuration Required
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs leading-relaxed">
                We detected that your Firebase variables in <code className="bg-neutral-100 dark:bg-neutral-800 text-amber-600 dark:text-amber-400 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> are not set up.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground leading-relaxed pb-3">
              To proceed, open the <code className="bg-neutral-100 dark:bg-neutral-800 text-foreground px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> file in your editor, enter your Firebase Client SDK configuration, and restart the development server.
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card shadow-lg rounded-2xl">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-900 border border-border rounded-xl p-1">
                <TabsTrigger value="login" className="text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground rounded-lg py-1.5 font-semibold transition-all">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-xs text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground rounded-lg py-1.5 font-semibold transition-all">
                  Create Account
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(handleLogin)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-foreground font-bold">Welcome back</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Sign in to your QA management workspace
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs text-foreground font-semibold">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500 rounded-lg text-xs"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs text-foreground font-semibold">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500 rounded-lg text-xs"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-semibold text-xs py-2 shadow-sm rounded-lg cursor-pointer transition-opacity"
                    disabled={loading || !firebaseConfigured}
                  >
                    {loading ? "Authenticating..." : "Sign In"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signupForm.handleSubmit(handleSignup)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-foreground font-bold">Create workspace profile</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Register a new user and assign a QA/Developer/Admin role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-xs text-foreground font-semibold">Full Name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Alex Mercer"
                      className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500 rounded-lg text-xs"
                      {...signupForm.register("name")}
                    />
                    {signupForm.formState.errors.name && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-xs text-foreground font-semibold">Email Address</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@company.com"
                      className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500 rounded-lg text-xs"
                      {...signupForm.register("email")}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-xs text-foreground font-semibold">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-sky-500 rounded-lg text-xs"
                      {...signupForm.register("password")}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1 mt-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-role" className="text-xs text-foreground font-semibold">Workspace Role</Label>
                    <Select
                      onValueChange={(val) => signupForm.setValue("role", val as UserRole)}
                      defaultValue={signupForm.getValues("role")}
                    >
                      <SelectTrigger id="signup-role" className="bg-background border-border text-foreground focus:ring-sky-500 rounded-lg text-xs">
                        <SelectValue placeholder="Select workspace role" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground text-xs">
                        <SelectItem value="admin">Admin (Manage projects & Swagger sync)</SelectItem>
                        <SelectItem value="qa">QA (Create and edit bugs)</SelectItem>
                        <SelectItem value="developer">Developer (Update bug status & assignments)</SelectItem>
                        <SelectItem value="viewer">Viewer (Read-only view access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:opacity-95 text-white font-semibold text-xs py-2 shadow-sm rounded-lg cursor-pointer transition-opacity"
                    disabled={loading || !firebaseConfigured}
                  >
                    {loading ? "Creating Profile..." : "Create Account"}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
