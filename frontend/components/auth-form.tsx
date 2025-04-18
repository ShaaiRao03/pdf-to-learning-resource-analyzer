"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
  title: string;
  buttonLabel: string;
  subtitle?: string;
};

export default function AuthForm({ onSubmit, title, buttonLabel, subtitle }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit(email, password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-center text-3xl font-bold tracking-tight text-gray-900">{title}</CardTitle>
          {subtitle && <p className="mt-1 text-center text-gray-500 text-base">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-11 text-base font-semibold">{buttonLabel}</Button>
            {error && <div className="text-red-500 text-sm text-center mt-2">{error}</div>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}