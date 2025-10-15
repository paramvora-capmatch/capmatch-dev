// src/app/accept-invite/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEntityStore } from '@/stores/useEntityStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { supabase } from '../../../lib/supabaseClient';
import { 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserPlus,
  ArrowRight 
} from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { validateInviteToken, acceptInvite } = useEntityStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<{
    valid: boolean;
    entityName?: string;
    inviterName?: string;
  } | null>(null);
  
  // Account creation form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setIsLoading(false);
      return;
    }

    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    if (!token) return;

    try {
      const result = await validateInviteToken(token);
      setInviteData(result);
      
      if (!result.valid) {
        setError('Invalid or expired invitation link');
      }
    } catch (error) {
      console.error('Error validating invite:', error);
      setError('Failed to validate invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      if (!isAuthenticated) {
        // User needs to create account first
        setIsCreatingAccount(true);
        return;
      }

      // Use the accept-invite edge function with the new schema
      await acceptInvite(token);
      
      // Redirect to appropriate dashboard based on app_role
      if (user?.role === 'borrower') {
        router.push('/dashboard');
      } else if (user?.role === 'advisor') {
        router.push('/advisor/dashboard');
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    setIsAccepting(true);
    setPasswordError(null);

    try {
      // Accept invite with password - this will create the account and accept the invite
      // The accept-invite edge function handles both account creation and invite acceptance
      await acceptInvite(token!);
      // Don't set isAccepting to false here - let the redirect happen
      // Redirect will be handled by the edge function response or we'll redirect to a default page
      router.push('/dashboard');
    } catch (error) {
      console.error('[AcceptInvite] Error creating account and accepting invite:', error);
      setError(error instanceof Error ? error.message : 'Failed to create account and accept invitation');
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingOverlay isLoading={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accept Invitation
          </h2>
        </div>

        <Card>
          <CardContent className="p-6">
            {error ? (
              /* Error State */
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Invalid Invitation
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {error}
                </p>
                <Button 
                  variant="primary" 
                  onClick={() => router.push('/login')}
                >
                  Go to Login
                </Button>
              </div>
            ) : inviteData?.valid ? (
              /* Valid Invite */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    You're Invited!
                  </h3>
                  <p className="text-sm text-gray-600">
                    You've been invited to join <strong>{inviteData.entityName}</strong>
                    {inviteData.inviterName && (
                      <span> by {inviteData.inviterName}</span>
                    )}
                  </p>
                </div>

                {!isCreatingAccount ? (
                  /* Accept Invite */
                  <div className="space-y-4">
                    {isAuthenticated ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-4">
                          Welcome back, {user?.email}! Click below to join the team.
                        </p>
                        <Button 
                          variant="primary" 
                          onClick={handleAcceptInvite}
                          disabled={isAccepting}
                          className="w-full"
                          leftIcon={<CheckCircle size={16} />}
                        >
                          {isAccepting ? 'Joining...' : 'Join Team'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-4">
                            You'll need to create an account to join this team.
                          </p>
                        </div>
                        
                        <Button 
                          variant="primary" 
                          onClick={() => setIsCreatingAccount(true)}
                          className="w-full"
                          leftIcon={<UserPlus size={16} />}
                        >
                          Create Account & Join
                        </Button>
                        
                        <div className="text-center">
                          <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <button
                              onClick={() => router.push('/login')}
                              className="text-blue-600 hover:text-blue-500 font-medium"
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
                  <form onSubmit={handleCreateAccount} className="space-y-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter password"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Confirm password"
                        required
                      />
                    </div>

                    {passwordError && (
                      <div className="text-sm text-red-600">
                        {passwordError}
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreatingAccount(false)}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary"
                        disabled={isAccepting}
                        className="flex-1"
                        leftIcon={<ArrowRight size={16} />}
                      >
                        {isAccepting ? 'Creating...' : 'Create & Join'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-start">
                    <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What happens next?</p>
                      <ul className="space-y-1">
                        <li>• You'll be added to the team with appropriate permissions</li>
                        <li>• You can access projects and documents based on your role</li>
                        <li>• You'll be redirected to your dashboard after joining</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Loading/Unknown State */
              <div className="text-center">
                <p className="text-gray-600">Loading invitation details...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
