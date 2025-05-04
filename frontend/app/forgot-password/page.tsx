"use client";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { logUserAction } from "@/lib/logUserAction";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    logUserAction({
      action: "[FRONTEND ACTION] [PASSWORD RESET ATTEMPT]",
      level: "info",
      component: "ForgotPasswordPage",
      details: { email }
    });
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Please check your inbox.");
      logUserAction({
        action: "[FRONTEND ACTION] [PASSWORD RESET SUCCESS]",
        level: "info",
        component: "ForgotPasswordPage",
        details: { email }
      });
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
      logUserAction({
        action: "[FRONTEND ACTION] [PASSWORD RESET FAILURE]",
        level: "error",
        component: "ForgotPasswordPage",
        details: { email, error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleReset}>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Button className="w-full" type="submit" disabled={loading || !email}>
              {loading ? "Sending..." : "Send Reset Email"}
            </Button>
            {message && <div className="text-green-600 text-sm text-center">{message}</div>}
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          </form>
          <div className="text-sm text-center mt-4">
            <Link href="/login" className="text-primary underline underline-offset-4 hover:text-primary/90">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
