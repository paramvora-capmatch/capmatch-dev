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

const RoleCard = ({
  role,
  icon,
  title,
  description,
  onSelect,
}: {
  role: Role;
  icon: React.ReactNode;
  title: string;
  description: string;
  onSelect: (role: Role) => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
    onClick={() => onSelect(role)}
    className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer border border-gray-200 hover:border-blue-400 hover:shadow-lg"
  >
    <div className="p-6 flex items-center space-x-4">
      <div className="p-3 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </motion.div>
);

const EmailForm = ({ role, onBack }: { role: Role; onBack: () => void }) => {
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading, user } = useAuth();

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    try {
      // The 'role' is now explicitly passed from the state.
      // We still check for admin override.
      const finalRole: "borrower" | "advisor" | "lender" | "admin" =
        email.includes("admin@capmatch.com") ? "admin" : role;
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
    }
  };

  const roleInfo = {
    borrower: {
      title: "Sign in as a Borrower",
      description: "Access your projects and connect with lenders.",
    },
    advisor: {
      title: "Sign in as an Advisor",
      description: "Manage your client deals and lender network.",
    },
    lender: {
      title: "Sign in as a Lender",
      description: "View matched deals and deploy capital.",
    },
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
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 mr-3"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              {roleInfo[role].title}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {roleInfo[role].description}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
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
            {role === "borrower" && (
              <div className="space-y-3">
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
              </div>
            )}
            {role === "advisor" && (
              <div className="space-y-3">
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
                    {authLoading ? "..." : "Demo Advisor 1"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 max-w-[calc(50%-6px)] h-12"
                    onClick={() =>
                      login("admin@capmatch.com", loginSource, "admin")
                    }
                    disabled={authLoading}
                  >
                    {authLoading ? "..." : "Demo Admin"}
                  </Button>
                </div>
              </div>
            )}
            {role === "lender" && (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 max-w-sm h-12"
                    onClick={() =>
                      login("lender1@example.com", loginSource, "lender")
                    }
                    disabled={authLoading}
                  >
                    {authLoading ? "..." : "Demo Lender 1"}
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={authLoading}
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

const RoleSelector = ({ onSelect }: { onSelect: (role: Role) => void }) => {
  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 mb-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome to CapMatch
          </h2>
        </div>
        <p className="text-gray-600">
          Select your role to sign in or create an account.
        </p>
      </div>
      <div className="space-y-4">
        <RoleCard
          role="borrower"
          icon={<User className="h-6 w-6" />}
          title="I'm a Borrower"
          description="Looking for financing for my properties."
          onSelect={onSelect}
        />
        <RoleCard
          role="advisor"
          icon={<Briefcase className="h-6 w-6" />}
          title="I'm an Advisor"
          description="Managing deals for my clients."
          onSelect={onSelect}
        />
        <RoleCard
          role="lender"
          icon={<Building className="h-6 w-6" />}
          title="I'm a Lender"
          description="Looking to deploy capital into deals."
          onSelect={onSelect}
        />
      </div>
    </div>
  );
};

// Main page component with Suspense boundary
export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const FADE_VARIANTS = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <AuthLayout>
      <LoadingOverlay isLoading={false} />
      <Suspense
        fallback={
          <div className="w-full max-w-md animate-pulse bg-gray-200 h-96 rounded-xl"></div>
        }
      >
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {!selectedRole ? (
              <motion.div
                key="role-selector"
                variants={FADE_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <RoleSelector onSelect={setSelectedRole} />
              </motion.div>
            ) : (
              <motion.div
                key="email-form"
                variants={FADE_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <EmailForm
                  role={selectedRole}
                  onBack={() => setSelectedRole(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Suspense>
    </AuthLayout>
  );
}
