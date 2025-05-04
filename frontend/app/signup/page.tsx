"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { createUserInFirestore } from "@/lib/firestore-utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logUserAction } from "@/lib/logUserAction"

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      logUserAction({
        action: "[FRONTEND ACTION] [SIGNUP FAILURE]",
        component: "SignUpPage",
        details: { email, name, error: "Passwords do not match" }
      });
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      logUserAction({
        action: "[FRONTEND ACTION] [SIGNUP FAILURE]",
        component: "SignUpPage",
        details: { email, error: "Name is required" }
      });
      return;
    }
    setLoading(true);
    logUserAction({
      action: "[FRONTEND ACTION] [SIGNUP ATTEMPT]",
      level: "info",
      component: "SignUpPage",
      details: { email, name }
    });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user in Firestore with name
      await createUserInFirestore({
        uid: userCredential.user.uid,
        email: userCredential.user.email || "",
        name: name.trim(),
      });
      logUserAction({
        action: "[FRONTEND ACTION] [SIGNUP SUCCESS]",
        level: "info",
        component: "SignUpPage",
        details: { email, name }
      });
      router.replace("/login");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      logUserAction({
        action: "[FRONTEND ACTION] [SIGNUP FAILURE]",
        component: "SignUpPage",
        details: { email, name, error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-2">
            <img
              src="/EinsteinAI.png"
              alt="EinsteinAI Logo"
              className="h-20 w-20 rounded-lg border-2 border-gray-200 object-cover bg-white"
              //style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Sign up</CardTitle>
          <CardDescription className="text-center">Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
            </div>
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/90">
              Log in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
