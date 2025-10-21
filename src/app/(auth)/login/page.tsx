// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";

import AuthLayout from "../../../components/layout/AuthLayout";
import { Form, FormGroup } from "../../../components/ui/Form";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Sparkles, Mail, Lock, Chrome } from "lucide-react";

import { LoadingOverlay } from "../../../components/ui/LoadingOverlay";

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    signInWithPassword,
    signUp,
    signInWithGoogle,
    isLoading: authLoading,
  } = useAuth();
  const searchParams = useSearchParams();
  const [loginSource, setLoginSource] = useState<"direct" | "lenderline">(
    "direct"
  );

  // Determine login source from query parameter on mount
  useEffect(() => {
    const sourceParam = searchParams.get("from");
    if (sourceParam === "lenderline") {
      setLoginSource("lenderline");
    } else {
      setLoginSource("direct");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }
    if (password.length < 6) {
      setValidationError("Password must be at least 6 characters long.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (isSignUp) {
        await signUp(email, password, loginSource);
      } else {
        await signInWithPassword(email, password, loginSource);
      }
    } catch (err) {
      console.error("Login Error:", err);
      setValidationError(
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome to CapMatch
          </h2>
        </div>
        <p className="text-gray-600">
          {isSignUp
            ? "Create an account to get started."
            : "Sign in to access your dashboard."}
        </p>
      </div>
      <div>
        <Form onSubmit={handleLogin} className="space-y-6">
          <FormGroup>
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              required
            />
          </FormGroup>
          <FormGroup>
            <Input
              id="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={validationError || undefined}
              leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
              required
            />
          </FormGroup>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            isLoading={authLoading || isSubmitting}
          >
            Continue with Email
          </Button>

          {/* Quick Login Buttons */}
          <div className="space-y-3 pt-2">
            <p className="text-center text-xs text-gray-500">
              Or use a test account (password: password123):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setEmail("owner@test.com");
                  setPassword("password123");
                }}
                disabled={authLoading}
              >
                Test Owner
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setEmail("member@test.com");
                  setPassword("password123");
                }}
                disabled={authLoading}
              >
                Test Member
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setEmail("advisor@test.com");
                  setPassword("password123");
                }}
                disabled={authLoading}
              >
                Test Advisor
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setEmail("borrower1@example.com");
                  setPassword("password123");
                }}
                disabled={authLoading}
              >
                Demo Borrower
              </Button>
            </div>
          </div>

          <div className="relative my-4">
            <div
              className="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            fullWidth
            size="lg"
            onClick={() => signInWithGoogle(loginSource)}
            leftIcon={<Chrome className="h-5 w-5" />}
            isLoading={authLoading}
          >
            Sign in with Google
          </Button>

          <p className="text-center text-sm text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>

          <p className="text-center text-xs text-gray-500 pt-2">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Form>
      </div>
    </div>
  );
};

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <AuthLayout>
      <LoadingOverlay isLoading={false} />
      <Suspense
        fallback={
          <div className="w-full max-w-md animate-pulse bg-gray-200 h-96 rounded-xl"></div>
        }
      >
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </Suspense>
    </AuthLayout>
  );
}
