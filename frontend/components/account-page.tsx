"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { auth } from "@/lib/firebase"
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { logUserAction } from "@/lib/logUserAction"

export function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Password validation
  const passwordsMatch = newPassword === confirmPassword
  const passwordIsStrong = newPassword.length >= 8
  const canSubmit = currentPassword && newPassword && confirmPassword && passwordsMatch && passwordIsStrong

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    setError("")
    setSuccess(false)
    const user = auth.currentUser;
    logUserAction({
      action: "[FRONTEND ACTION] [ACCOUNT UPDATE ATTEMPT]",
      level: "info",
      component: "AccountPage",
      details: { email: user?.email }
    });
    try {
      if (!user || !user.email) throw new Error("Not authenticated");
      // Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Update password
      await updatePassword(user, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      logUserAction({
        action: "[FRONTEND ACTION] [ACCOUNT UPDATE SUCCESS]",
        level: "info",
        component: "AccountPage",
        details: { email: user.email }
      });
    } catch (err) {
      let msg = err.message || "Failed to update password";
      // Firebase returns this for wrong password
      if (msg.includes("auth/invalid-credential")) {
        msg = "Your current password is incorrect";
      }
      setError(msg);
      logUserAction({
        action: "[FRONTEND ACTION] [ACCOUNT UPDATE FAILURE]",
        level: "error",
        component: "AccountPage",
        details: { email: user?.email, error: msg }
      });
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertDescription>Your password has been updated successfully.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                {newPassword && !passwordIsStrong && (
                  <p className="text-xs text-destructive mt-1">Password must be at least 8 characters long</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={!canSubmit || isSubmitting} className="w-full">
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
