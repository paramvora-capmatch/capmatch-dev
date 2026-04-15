// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";

import AuthLayout from "../../../components/layout/AuthLayout";
import { Form, FormGroup } from "../../../components/ui/Form";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Sparkles, Mail, Lock, Chrome, User, Building2 } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginForm = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sign-up fields
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupOrgName, setSignupOrgName] = useState("");
  const [wantsCreateOrg, setWantsCreateOrg] = useState(true);
  const [signupError, setSignupError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    signInWithPassword,
    signUp,
    signInWithGoogle,
    isLoading: authLoading,
    user,
    isAuthenticated,
  } = useAuth();
  const [loginSource, setLoginSource] = useState<"direct" | "lenderline">(
    "direct"
  );
  const isLenderline = loginSource === "lenderline";

  // Determine login source from query parameter on mount
  useEffect(() => {
    const sourceParam = searchParams.get("from");
    if (sourceParam === "lenderline") {
      setLoginSource("lenderline");
    } else {
      setLoginSource("direct");
    }
  }, [searchParams]);

  // Handle redirection after successful authentication
  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;

    const redirectUrl = searchParams.get("redirect");
    if (redirectUrl) {
      router.replace(redirectUrl);
      return;
    }

    switch (user.role) {
      case "borrower":
        router.replace("/dashboard");
        break;
      case "advisor":
        router.replace("/advisor/dashboard");
        break;
      case "lender":
        router.replace("/lender/dashboard");
        break;
      default:
        router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, user, router, searchParams]);

  const switchToSignup = () => {
    setMode("signup");
    setValidationError(null);
    setSignupError(null);
    setSignupEmail(email);
    setWantsCreateOrg(true);
  };

  const switchToLogin = () => {
    setMode("login");
    setValidationError(null);
    setSignupError(null);
    setEmail(signupEmail);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsSubmitting(true);

    if (!EMAIL_REGEX.test(email)) {
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
      await signInWithPassword(email, password, loginSource);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(
        msg || "Could not sign you in. Please check your email and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupFullName.trim()) {
      setSignupError("Please enter your full name.");
      return;
    }
    if (!EMAIL_REGEX.test(signupEmail)) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (signupPassword.length < 8) {
      setSignupError("Password must be at least 8 characters long.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(
        signupEmail.trim(),
        signupPassword,
        signupFullName.trim(),
        wantsCreateOrg ? signupOrgName.trim() || undefined : undefined,
        loginSource
      );
      const redirectUrl = searchParams.get("redirect");
      router.replace(redirectUrl || "/dashboard");
    } catch (err) {
      console.error("[Login] Sign-up failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setSignupError(msg || "Could not create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle =
    mode === "login"
      ? isLenderline
        ? "Sign in to your CapMatch account to access LenderLine."
        : "Sign in to your account."
      : isLenderline
        ? "Create your CapMatch account to access LenderLine."
        : "Create your CapMatch account.";

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            {isLenderline ? "Access LenderLine" : "Welcome to CapMatch"}
          </h2>
        </div>
        <p className="text-gray-600">{subtitle}</p>
      </div>

      {mode === "login" ? (
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
                autoComplete="email"
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
                autoComplete="current-password"
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
              {isLenderline ? "Sign in to LenderLine" : "Sign In"}
            </Button>

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
              {isLenderline
                ? "Sign in with Google to access LenderLine"
                : "Sign in with Google"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={switchToSignup}
                className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
              >
                Sign up
              </button>
            </p>

            <p className="text-center text-xs text-gray-500 pt-2">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </Form>
        </div>
      ) : (
        <div>
          <Form onSubmit={handleSignup} className="space-y-5">
            <FormGroup>
              <Input
                id="signupFullName"
                type="text"
                label="Full Name"
                placeholder="Jane Doe"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
                autoComplete="name"
                required
              />
            </FormGroup>
            <FormGroup>
              <Input
                id="signupEmail"
                type="email"
                label="Email Address"
                placeholder="you@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                autoComplete="email"
                required
              />
            </FormGroup>
            <FormGroup>
              <Input
                id="signupPassword"
                type="password"
                label="Password"
                placeholder="At least 8 characters"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                autoComplete="new-password"
                required
              />
            </FormGroup>
            <FormGroup>
              <Input
                id="signupConfirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                autoComplete="new-password"
                required
              />
            </FormGroup>
            <FormGroup>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={wantsCreateOrg}
                  onChange={(e) => {
                    setWantsCreateOrg(e.target.checked);
                    if (!e.target.checked) setSignupOrgName("");
                  }}
                />
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">
                    Create a new organization
                  </span>
                  <span className="block text-gray-600 mt-0.5">
                    We&apos;ll set up a borrower organization for your account. You
                    can optionally choose a display name below.
                  </span>
                </span>
              </label>
            </FormGroup>
            {wantsCreateOrg && (
              <FormGroup>
                <Input
                  id="signupOrgName"
                  type="text"
                  label="Organization name (optional)"
                  placeholder="e.g., Acme Capital LLC"
                  value={signupOrgName}
                  onChange={(e) => setSignupOrgName(e.target.value)}
                  leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
                  autoComplete="organization"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave blank to use a default name based on your full name.
                </p>
              </FormGroup>
            )}

            {signupError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {signupError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={authLoading || isSubmitting}
            >
              Create Account
            </Button>

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
              {isLenderline
                ? "Sign up with Google to access LenderLine"
                : "Sign up with Google"}
            </Button>

            <p className="text-center text-sm text-gray-600 pt-2">
              Already have an account?{" "}
              <button
                type="button"
                onClick={switchToLogin}
                className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
              >
                Sign in
              </button>
            </p>

            <p className="text-center text-xs text-gray-500 pt-2">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </Form>
        </div>
      )}
    </div>
  );
};

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <AuthLayout>
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
