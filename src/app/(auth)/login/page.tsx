// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

import AuthLayout from "../../../components/layout/AuthLayout";
import { Form, FormGroup } from "../../../components/ui/Form";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import {
  Sparkles,
  Mail,
  ArrowLeft,
  User,
  Briefcase,
  Building,
} from "lucide-react";

import { LoadingOverlay } from "../../../components/ui/LoadingOverlay";

type Role = "borrower" | "advisor" | "lender";

const EmailForm = () => {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { login, isLoading: authLoading } = useAuth();

  const router = useRouter();
  const searchParams = useSearchParams();
  const [loginSource, setLoginSource] = useState<"direct" | "lenderline">(
    "direct"
  );

  // Determine login source from query parameter on mount
  useEffect(() => {
    const sourceParam = searchParams.get("from");
    if (sourceParam === "lenderline") {
      setLoginSource("lenderline");
      console.log("Login source detected: lenderline");
    } else {
      setLoginSource("direct");
      console.log("Login source detected: direct");
    }
  }, [searchParams]);

  // The new <AuthRedirector /> component now handles redirecting logged-in users.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Determine role based on email. Default to 'borrower'.
      let finalRole: "borrower" | "advisor" | "lender" | "admin" = "borrower";
      if (email === 'admin@capmatch.com') {
        finalRole = 'admin';
      } else if (email === 'advisor1@capmatch.com') {
        finalRole = 'advisor';
      } else if (email.endsWith('@capmatch.com')) { // Catch-all for other advisors
        finalRole = 'advisor';
      }
      await login(email, loginSource, finalRole);

      // For non-demo accounts, show the "Check your email" message.
      // The demo accounts log in instantly, so the useEffect will catch the state change and redirect.
      if (!email.endsWith("@example.com") && !email.endsWith("@capmatch.com")) {
        setEmailSent(true);
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

  if (emailSent) {
    return (
      <div className="bg-white rounded-xl shadow-xl overflow-hidden p-6 text-center animate-fadeIn">
        <Sparkles className="h-12 w-12 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800">
          Check your email
        </h3>
        <p className="text-gray-600 mt-2">
          We've sent a magic link to <strong>{email}</strong>. Click the link to
          sign in.
        </p>
        <Button
          variant="outline"
          onClick={() => setEmailSent(false)}
          className="mt-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="p-8">
        <div>
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 text-center">
              Sign In / Sign Up
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              Enter your email to continue
            </p>
          </div>

          <Form onSubmit={handleLogin} className="space-y-4">
            <FormGroup>
              <Input
                id="email"
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={validationError || undefined}
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                required
              />
            </FormGroup>

            {/* Quick Login Buttons */}
            <div className="space-y-3 pt-2">
              <p className="text-center text-xs text-gray-500">Or use a demo account:</p>
              <div className="flex space-x-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 max-w-[calc(50%-6px)] h-12"
                  onClick={() =>
                    login("borrower1@example.com", loginSource, "borrower")
                  }
                  disabled={authLoading}
                >
                  {authLoading ? "..." : "Demo Borrower 1"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 max-w-[calc(50%-6px)] h-12"
                  onClick={() =>
                    login("borrower2@example.com", loginSource, "borrower")
                  }
                  disabled={authLoading}
                >
                  {authLoading ? "..." : "Demo Borrower 2"}
                </Button>
              </div>
              <div className="flex space-x-3 text-xs text-center text-gray-500">
                <div className="flex-1 max-w-[calc(50%-6px)]">
                  Full profile w/ Live OM
                </div>
                <div className="flex-1 max-w-[calc(50%-6px)]">
                  Partial profile
                </div>
              </div>
              <div className="flex space-x-3 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 max-w-[calc(50%-6px)] h-12"
                  onClick={() =>
                    login("advisor1@capmatch.com", loginSource, "advisor")
                  }
                  disabled={authLoading}
                >
                  {authLoading ? "..." : "Demo Advisor"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 max-w-[calc(50%-6px)] h-12"
                  onClick={() => login("admin@capmatch.com", loginSource, "admin")}
                  disabled={authLoading}
                >
                  {authLoading ? "..." : "Demo Admin"}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={authLoading || isSubmitting}
            >
              Continue
            </Button>

            <p className="text-center text-xs text-gray-500 pt-2">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </Form>
        </div>
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
        <div className="w-full max-w-md"><EmailForm /></div>
      </Suspense>
    </AuthLayout>
  );
}
