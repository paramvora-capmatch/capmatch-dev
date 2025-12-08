// src/app/(auth)/login/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";
import { supabase } from "../../../lib/supabaseClient";

import AuthLayout from "../../../components/layout/AuthLayout";
import { Form, FormGroup } from "../../../components/ui/Form";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Sparkles, Mail, Lock, Chrome } from "lucide-react";

import { SplashScreen } from "../../../components/ui/SplashScreen";
import { Modal, ModalBody, ModalFooter } from "../../../components/ui/Modal";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingNewAccount, setIsCheckingNewAccount] = useState(false);
  const [showNewAccountConfirm, setShowNewAccountConfirm] = useState(false);
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
      // First, attempt a normal password sign-in.
      await signInWithPassword(email, password, loginSource);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // If the message already looks like a clear credentials error, we may
      // want to check whether this email actually has an account before
      // offering to create a new one.
      const isCredsError =
        /incorrect email or password/i.test(msg) ||
        /invalid login credentials/i.test(msg);

      if (!isCredsError) {
        setValidationError(msg || "Could not sign you in. Please try again.");
        setIsSubmitting(false);
        return;
      }

      try {
        setIsCheckingNewAccount(true);

        // Use a Postgres RPC that checks the mirrored profiles table for this email.
        const { data, error } = await supabase.rpc(
          "check_profile_email_exists",
          { p_email: email }
        );

        if (error) {
          console.error(
            "[Login] check_profile_email_exists error:",
            (error as any)?.message || String(error)
          );
          // Fall back to the generic invalid-credentials message.
          setValidationError("Incorrect email or password.");
          return;
        }

        const exists = !!data;

        if (exists) {
          // Email is already registered; treat this as an incorrect password.
          setValidationError("Incorrect password for this account.");
          return;
        }

        // For LenderLine traffic, skip the confirmation modal and immediately
        // onboard the user by creating an account with the provided credentials.
        if (isLenderline) {
          try {
            await signUp(email, password, loginSource);
            // After successful sign-up + sign-in, send them straight to the dashboard.
            const redirectUrl = searchParams.get("redirect");
            router.replace(redirectUrl || "/dashboard");
          } catch (signUpErr) {
            console.error("[Login] LenderLine sign-up failed:", signUpErr);
            const msg =
              signUpErr instanceof Error
                ? signUpErr.message
                : String(signUpErr);
            setValidationError(
              msg || "Could not create your account. Please try again."
            );
          }
          return;
        }

        // No existing account with this email. Ask for explicit confirmation
        // before creating a new account using email/password.
        setShowNewAccountConfirm(true);
      } catch (checkErr) {
        console.error(
          "[Login] Error during sign-up confirmation flow:",
          checkErr
        );
        setValidationError(
          "Could not complete sign-in or sign-up. Please try again."
        );
      } finally {
        setIsCheckingNewAccount(false);
        setIsSubmitting(false);
      }
      return;
    }

    // Successful sign-in path (listener will redirect); clear submitting state.
    setIsSubmitting(false);
  };

  const handleConfirmCreateAccount = async () => {
    setValidationError(null);
    setShowNewAccountConfirm(false);
    setIsSubmitting(true);
    try {
      await signUp(email, password, loginSource);
      // After successful sign-up and automatic sign-in, proactively route the
      // new user to the main borrower dashboard. The global auth listener will
      // also update state, but this avoids leaving them on the login page.
      const redirectUrl = searchParams.get("redirect");
      router.replace(redirectUrl || "/dashboard");
    } catch (err) {
      console.error("[Login] Error during confirmed sign-up:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(
        msg || "Could not create your account. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelCreateAccount = () => {
    setShowNewAccountConfirm(false);
    setValidationError(
      "We couldn't find an account with this email. Please try a different email or check for typos."
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            {isLenderline ? "Access LenderLine" : "Welcome to CapMatch"}
          </h2>
        </div>
        <p className="text-gray-600">
          {isLenderline
            ? "Sign in or create your CapMatch account to access LenderLine."
            : "Sign in or create your account in one step."}
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
            isLoading={authLoading || isSubmitting || isCheckingNewAccount}
          >
            {isLenderline ? "Continue to LenderLine" : "Continue with Email"}
          </Button>

          {/* Removed test account quick login buttons */}

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

          {/* Unified flow: remove sign-in/sign-up toggle */}

          <p className="text-center text-xs text-gray-500 pt-2">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Form>
      </div>

      {/* New account confirmation modal */}
      <Modal
        isOpen={showNewAccountConfirm}
        onClose={handleCancelCreateAccount}
        title="Create a new CapMatch account?"
        size="md"
      >
        <ModalBody>
          <p className="text-sm text-gray-700">
            We couldn&apos;t find an existing account for{" "}
            <span className="font-semibold break-all">{email}</span>.
          </p>
          <p className="mt-3 text-sm text-gray-700">
            If you continue, we&apos;ll create a new CapMatch account using this
            email address and the password you entered.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelCreateAccount}
          >
            Go Back
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirmCreateAccount}
            isLoading={isSubmitting}
          >
            Yes, create my account
          </Button>
        </ModalFooter>
      </Modal>
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
