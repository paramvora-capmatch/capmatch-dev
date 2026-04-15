// src/app/onboarding/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useOrgStore } from "@/stores/useOrgStore";
import AuthLayout from "@/components/layout/AuthLayout";
import { Form, FormGroup } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Building2, Mail, Sparkles, User, Users } from "lucide-react";

type OnboardingTab = "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const pending = useAuthStore((s) => s.pendingOnboardUser);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const joinOrgViaInvite = useAuthStore((s) => s.joinOrgViaInvite);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { validateInviteToken } = useOrgStore();

  const [tab, setTab] = useState<OnboardingTab>("create");
  const [orgName, setOrgName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [invitePreview, setInvitePreview] = useState<{
    orgName?: string;
    inviterName?: string;
    email?: string;
  } | null>(null);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!needsOnboarding && !pending && !user) {
      router.replace("/login");
    }
  }, [needsOnboarding, pending, user, router]);

  const handleValidateInvite = async () => {
    setError(null);
    setInviteValidated(false);
    setInvitePreview(null);
    const token = inviteToken.trim();
    if (!token) {
      setError("Enter an invite code or link token.");
      return;
    }
    setIsValidatingInvite(true);
    try {
      const result = await validateInviteToken(token);
      if (!result.valid) {
        setError("Invalid or expired invite.");
        return;
      }
      setInvitePreview({
        orgName: result.orgName,
        inviterName: result.inviterName,
        email: result.email,
      });
      setInviteValidated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not validate invite.");
    } finally {
      setIsValidatingInvite(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await completeOnboarding(orgName.trim() || undefined);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete setup."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!inviteValidated) {
      setError("Validate your invite first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await joinOrgViaInvite(inviteToken.trim());
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join organization."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pending) {
    return null;
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2 mb-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-800">Finish setup</h1>
          </div>
          <p className="text-gray-600 text-sm">
            Signed in as{" "}
            <span className="font-semibold text-gray-900">{pending.email}</span>
          </p>
        </div>

        <div className="flex rounded-lg border border-gray-200 p-1 mb-6 bg-gray-50">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-colors ${
              tab === "create"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => {
              setTab("create");
              setError(null);
            }}
          >
            <Building2 className="h-4 w-4" />
            New organization
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-colors ${
              tab === "join"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => {
              setTab("join");
              setError(null);
            }}
          >
            <Users className="h-4 w-4" />
            Join existing
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {tab === "create" ? (
          <Form onSubmit={handleCreateOrg} className="space-y-5">
            <FormGroup>
              <Input
                id="onbName"
                type="text"
                label="Your name"
                value={pending.fullName}
                disabled
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
              />
            </FormGroup>
            <FormGroup>
              <Input
                id="onbOrg"
                type="text"
                label="Organization name (optional)"
                placeholder={`e.g. ${pending.fullName}'s Organization`}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to use a default name based on your name.
              </p>
            </FormGroup>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
            >
              Complete setup
            </Button>
          </Form>
        ) : (
          <Form onSubmit={handleJoinOrg} className="space-y-5">
            <FormGroup>
              <Input
                id="inviteToken"
                type="text"
                label="Invite code"
                placeholder="Paste the invite token from your email"
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  setInviteValidated(false);
                  setInvitePreview(null);
                }}
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              />
            </FormGroup>
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={handleValidateInvite}
              isLoading={isValidatingInvite}
            >
              Validate invite
            </Button>
            {invitePreview && (
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-semibold">{invitePreview.orgName}</p>
                {invitePreview.inviterName && (
                  <p className="mt-1">Invited by {invitePreview.inviterName}</p>
                )}
                {invitePreview.email && (
                  <p className="mt-1 text-xs text-blue-800">
                    Invite for: {invitePreview.email}
                  </p>
                )}
              </div>
            )}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              disabled={!inviteValidated}
            >
              Join organization
            </Button>
          </Form>
        )}
      </div>
    </AuthLayout>
  );
}
