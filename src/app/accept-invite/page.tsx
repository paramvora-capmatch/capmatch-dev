// src/app/accept-invite/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from '@/hooks/useAuth';
import { useOrgStore } from '@/stores/useOrgStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserPlus,
  ArrowRight,
  Check,
} from "lucide-react";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, signInWithPassword } = useAuth();
  const { validateInviteToken, acceptInvite } = useOrgStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{
    valid: boolean;
    orgName?: string;
    inviterName?: string;
    email?: string;
  } | null>(null);

  // Account creation form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const token = searchParams.get("token");

  const validateInvite = useCallback(async () => {
    if (!token) return;

    try {
      const result = await validateInviteToken(token);
      setInviteData(result);

      if (!result.valid) {
        setError("Invalid or expired invitation link");
      }
    } catch (error) {
      console.error("Error validating invite:", error);
      setError("Failed to validate invitation");
    } finally {
      setIsLoading(false);
    }
  }, [token, validateInviteToken]);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsLoading(false);
      return;
    }

    validateInvite();
  }, [token, validateInvite]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      // Existing accounts cannot accept invites in the one-entity model
      setError(
        "This invite is for creating a new account. Ask the owner to add you to a project from the dashboard."
      );
    } catch (error) {
      console.error("Error accepting invite:", error);
      setError(
        error instanceof Error ? error.message : "Failed to accept invitation"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setPasswordError("Full name is required");
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    setIsAccepting(true);
    setPasswordError(null);

    try {
      // Create a new account and accept the invite (no existing account path)
      await acceptInvite({
        token: token!,
        password,
        full_name: fullName.trim(),
      });

      // NEW: Automatically sign in the new user
      if (inviteData?.email) {
        await signInWithPassword(inviteData.email, password);
        // After successful sign-in, redirect to the dashboard.
        router.push("/dashboard");
      } else {
        router.push("/login"); // Fallback to login page if email is missing
      }
    } catch (error) {
      console.error(
        "[AcceptInvite] Error creating account and accepting invite:",
        error
      );
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create account and accept invitation"
      );
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return <SplashScreen text="Validating invitation..." />;
  }

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Grid Background Pattern */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.5]">
          <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
            <defs>
              <pattern id="invite-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#invite-grid-pattern)" />
          </svg>
        </div>
      </div>
      
      <div className="max-w-xl w-full space-y-6 relative z-[1]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Accept Invitation
          </h1>
        </div>

        <Card className="shadow-xl border-0">
          <CardContent className="p-8">
            {error ? (
              /* Error State */
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6 shadow-sm">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Invalid Invitation
                </h2>
                <p className="text-base text-gray-700 mb-8 leading-relaxed">{error}</p>
                <Button 
                  variant="primary" 
                  onClick={() => router.push("/login")}
                  className="text-base py-3 px-6"
                >
                  Go to Login
                </Button>
              </div>
            ) : inviteData?.valid ? (
              /* Valid Invite */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6 shadow-sm">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    You&apos;re Invited!
                  </h2>
                  <p className="text-base text-gray-700 leading-relaxed">
                    You&apos;ve been invited to join{" "}
                    <span className="font-semibold text-gray-900">{inviteData.orgName}</span>
                    {inviteData.inviterName && (
                      <span className="text-gray-600"> by {inviteData.inviterName}</span>
                    )}
                  </p>
                </div>

                {!isCreatingAccount ? (
                  /* Accept Invite */
                  <div className="space-y-4">
                    {isAuthenticated ? (
                      <div className="text-center">
                        <p className="text-base text-gray-700 mb-6">
                          Welcome back, <span className="font-semibold">{user?.email}</span>! Click below to join the
                          team.
                        </p>
                        <Button
                          variant="primary"
                          onClick={handleAcceptInvite}
                          disabled={isAccepting}
                          className="w-full text-base py-3"
                          leftIcon={<CheckCircle size={18} />}
                        >
                          {isAccepting ? "Joining..." : "Join Team"}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        <div className="text-center">
                          <p className="text-base text-gray-700 mb-6">
                            You&apos;ll need to create an account to join this team.
                          </p>
                        </div>

                        <Button
                          variant="primary"
                          onClick={() => setIsCreatingAccount(true)}
                          className="w-full text-base py-3"
                          leftIcon={<UserPlus size={18} />}
                        >
                          Create Account & Join
                        </Button>

                        <div className="text-center pt-2">
                          <p className="text-sm text-gray-600">
                            Already have an account?{" "}
                            <button
                              onClick={() => router.push("/login")}
                              className="text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2 transition-colors"
                            >
                              Sign in here
                            </button>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Create Account Form */
                  <form onSubmit={handleCreateAccount} className="space-y-5">
                    <div>
                      <label
                        htmlFor="fullName"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                        placeholder="Enter password (min. 8 characters)"
                        required
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-semibold text-gray-700 mb-2"
                      >
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                        placeholder="Confirm password"
                        required
                      />
                    </div>

                    {passwordError && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                        {passwordError}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatingAccount(false)}
                        className="flex-1 text-base py-3"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isAccepting}
                        className="flex-1 text-base py-3"
                        leftIcon={<ArrowRight size={18} />}
                      >
                        {isAccepting ? "Creating..." : "Create & Join"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Info Box */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 mb-3 text-base">What happens next?</p>
                      <ul className="space-y-2.5">
                        <li className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-800 leading-relaxed">
                            You&apos;ll be added to the team with appropriate permissions
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-800 leading-relaxed">
                            You can access projects and documents based on your role
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="flex-shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-800 leading-relaxed">
                            You&apos;ll be redirected to your dashboard after joining
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Loading/Unknown State */
              <div className="text-center py-8">
                <p className="text-base text-gray-600">Loading invitation details...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
