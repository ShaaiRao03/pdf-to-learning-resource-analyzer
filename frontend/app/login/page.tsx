"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { logUserAction } from "@/lib/logUserAction"

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    logUserAction({
      action: "[FRONTEND ACTION] [LOGIN ATTEMPT]",
      level: "info",
      component: "LoginPage",
      details: { email }
    });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      logUserAction({
        action: "[FRONTEND ACTION] [LOGIN SUCCESS]",
        level: "info",
        component: "LoginPage",
        details: { email }
      });
      router.replace("/");
    } catch (err: any) {
      setError("Invalid email or password");
      logUserAction({
        action: "[FRONTEND ACTION] [LOGIN FAILURE]",
        level: "error",
        component: "LoginPage",
        details: { email, error: err.message }
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
          <CardTitle className="text-2xl font-bold text-center">Log in</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary underline underline-offset-4 hover:text-primary/90">Forgot password?</Link>
            </div>
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary underline underline-offset-4 hover:text-primary/90">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
