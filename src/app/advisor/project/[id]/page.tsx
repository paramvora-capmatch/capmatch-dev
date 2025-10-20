"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleBasedRoute } from "../../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../../hooks/useAuth";

import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import {
	Card,
	CardContent,
	CardHeader,
	CardFooter,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/Button";
import { Select } from "../../../../components/ui/Select";
import {
	ChevronLeft,
	FileText,
	User,
	MessageSquare,
	Calendar,
	Clock,
	CheckCircle,
	Building,
	MapPin,
	DollarSign,
	Send,
} from "lucide-react";
import {
	BorrowerProfile,
	ProjectProfile,
	ProjectStatus,
	ProjectMessage,
	ProjectDocumentRequirement,
	Project,
	BorrowerResume,
	ProjectResume,
} from "../../../../types/enhanced-types";
import { generateProjectFeedback } from "../../../../../lib/enhancedMockApiService";
import { DocumentManager } from '@/components/documents/DocumentManager';
import { storageService } from "@/lib/storage";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../../../lib/supabaseClient";
import {
	getProjectWithResume,
	getProjectMessages,
} from "@/lib/project-queries";

export default function AdvisorProjectDetailPage() {
	const router = useRouter();
	const params = useParams();
	const { user } = useAuth();

	const [project, setProject] = useState<ProjectProfile | null>(null);
	const [borrowerResume, setBorrowerResume] = useState<BorrowerResume | null>(null);
	const [projectResume, setProjectResume] = useState<ProjectResume | null>(null);
	const [messages, setMessages] = useState<any[]>([]);
	const [documentRequirements, setDocumentRequirements] = useState<
		ProjectDocumentRequirement[]
	>([]);
	const [isLoadingData, setIsLoadingData] = useState(true);
	const [newMessage, setNewMessage] = useState("");
	const [selectedStatus, setSelectedStatus] =
		useState<ProjectStatus>("Info Gathering");
	const messageSubscriptionRef = useRef<RealtimeChannel | null>(null);

	useEffect(() => {
		const loadProjectData = async () => {
			if (!user || user.role !== "advisor") return;

			try {
				setIsLoadingData(true);

				const projectId = params?.id as string;
				if (!projectId) {
					router.push("/advisor/dashboard");
					return;
				}

				// Load project with resume content using the new query function
				const foundProject = await getProjectWithResume(projectId);
				setProject(foundProject);
				setSelectedStatus(foundProject.projectStatus as ProjectStatus || "Info Gathering");

				// Load borrower resume for the owning org
				if (user.isDemo) {
						// For demo mode, we'll use legacy data
						const allProfiles = await storageService.getItem<
							BorrowerProfile[]
						>("borrowerProfiles");
						// Find profile by entity ID (this is a simplified mapping for demo)
						const profile = allProfiles?.find(
							(p) => p.entityId === foundProject.entityId
						);
						if (profile) {
							// Convert legacy BorrowerProfile to BorrowerResume
							setBorrowerResume({
								id: `resume-${profile.id}`,
								org_id: foundProject.entityId,
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString(),
								content: {
									// Map relevant fields from BorrowerProfile to resume content
									fullLegalName: profile.fullLegalName,
									primaryEntityName: profile.primaryEntityName,
									contactEmail: profile.contactEmail,
									contactPhone: profile.contactPhone,
									yearsCREExperienceRange: profile.yearsCREExperienceRange,
									assetClassesExperience: profile.assetClassesExperience,
									geographicMarketsExperience: profile.geographicMarketsExperience,
									creditScoreRange: profile.creditScoreRange,
									netWorthRange: profile.netWorthRange,
									liquidityRange: profile.liquidityRange,
									bankruptcyHistory: profile.bankruptcyHistory,
									foreclosureHistory: profile.foreclosureHistory,
									litigationHistory: profile.litigationHistory
								},
							});
						}
					} else {
						// Load borrower resume from new schema
						const { data: borrowerResumeData, error: borrowerResumeError } = await supabase
							.from("borrower_resumes")
							.select("*")
							.eq("org_id", foundProject.entityId)
							.single();
						
						if (borrowerResumeError && borrowerResumeError.code !== 'PGRST116') {
							console.warn("Error loading borrower resume:", borrowerResumeError);
						} else if (borrowerResumeData) {
							setBorrowerResume(borrowerResumeData);
						}

						// Load project resume
						const { data: projectResumeData, error: projectResumeError } = await supabase
							.from("project_resumes")
							.select("*")
							.eq("project_id", foundProject.id)
							.single();
						
						if (projectResumeError && projectResumeError.code !== 'PGRST116') {
							console.warn("Error loading project resume:", projectResumeError);
						} else if (projectResumeData) {
							setProjectResume(projectResumeData);
						}
					}

					// Fetch initial messages using the chat thread edge function
					try {
						const { data: threadData, error: threadError } = await supabase.functions.invoke('manage-chat-thread', {
							body: {
								action: 'get_thread',
								project_id: projectId
							}
						});

						if (threadError) {
							console.error("Error fetching chat thread:", threadError);
						} else if (threadData?.thread) {
							// Fetch messages from the thread
							const { data: messagesData, error: messagesError } = await supabase
								.from("project_messages")
								.select("*")
								.eq("thread_id", threadData.thread.id)
								.order("created_at", { ascending: true });

							if (messagesError) {
								console.error("Error fetching messages:", messagesError);
							} else {
								const mappedMessages = messagesData.map((msg: any) => {
									const senderRole = msg.user_id === user.id ? 'advisor' : 'borrower';
									return {
										id: msg.id.toString(),
										projectId: projectId,
										senderId: msg.user_id || '',
										senderType: senderRole === 'advisor' ? 'Advisor' : 'Borrower',
										message: msg.content || '',
										createdAt: msg.created_at
									};
								});
								setMessages(mappedMessages);
							}
						}
					} catch (error) {
						console.error("Error in chat thread management:", error);
					}

					// Docs are still from local storage, which is fine for now.
					const allRequirements = await storageService.getItem<
						ProjectDocumentRequirement[]
					>("documentRequirements");
					if (allRequirements) {
						const projectRequirements = allRequirements.filter(
							(r) => r.projectId === projectId
						);
						setDocumentRequirements(projectRequirements);
					}
			} catch (error) {
				console.error("Error loading project data:", error);
			} finally {
				setIsLoadingData(false);
			}
		};

		loadProjectData();
	}, [user, params, router]);

	// Realtime message subscription
	useEffect(() => {
		const projectId = params?.id as string;
		if (!projectId || !user) return;

		// Unsubscribe from previous channel if it exists
		if (messageSubscriptionRef.current) {
			supabase.removeChannel(messageSubscriptionRef.current);
		}

		// Get the chat thread ID for this project using the edge function
		supabase.functions.invoke('manage-chat-thread', {
			body: {
				action: 'get_thread',
				project_id: projectId
			}
		}).then(({ data: threadData, error: threadError }: any) => {
			if (threadError || !threadData?.thread) {
				console.warn("No chat thread found for project:", projectId);
				return;
			}

			const channel = supabase
				.channel(`project-messages-advisor-${projectId}`)
				.on<any>(
					"postgres_changes",
					{
						event: "INSERT",
						schema: "public",
						table: "project_messages",
						filter: `thread_id=eq.${threadData.thread.id}`,
					},
					(payload: any) => {
						const newMessagePayload = payload.new;
						const senderRole =
							newMessagePayload.user_id === user.id
								? "advisor"
								: "borrower";

						const newMessage = {
							id: newMessagePayload.id.toString(),
							projectId: projectId,
							senderId: newMessagePayload.user_id || '',
							senderType: senderRole === 'advisor' ? 'Advisor' : 'Borrower',
							message: newMessagePayload.content || '',
							createdAt: newMessagePayload.created_at
						};

						setMessages((currentMessages) => [
							...currentMessages,
							newMessage,
						]);
					}
				)
				.subscribe();

			messageSubscriptionRef.current = channel;
		});

		return () => {
			if (messageSubscriptionRef.current) {
				supabase.removeChannel(messageSubscriptionRef.current);
			}
		};
	}, [params, user]);

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const getStatusColor = (status: ProjectStatus) => {
		switch (status) {
			case "Draft":
				return "text-gray-600 bg-gray-100";
			case "Info Gathering":
				return "text-blue-600 bg-blue-50";
			case "Advisor Review":
				return "text-amber-600 bg-amber-50";
			case "Matches Curated":
				return "text-purple-600 bg-purple-50";
			case "Introductions Sent":
				return "text-indigo-600 bg-indigo-50";
			case "Term Sheet Received":
				return "text-teal-600 bg-teal-50";
			case "Closed":
				return "text-green-600 bg-green-50";
			case "Withdrawn":
				return "text-red-600 bg-red-50";
			case "Stalled":
				return "text-orange-600 bg-orange-50";
			default:
				return "text-gray-600 bg-gray-100";
		}
	};

	const handleStatusChange = async (newStatus: ProjectStatus) => {
		if (!project) return;

		try {
			// Note: In the new schema, project status is not stored in the projects table
			// It would be stored in a separate project_status table or in the project_resume content
			// For now, we'll just update the local state
			setSelectedStatus(newStatus);

			// If we have a project resume, we could update its content with the status
			if (projectResume) {
				const updatedContent = {
					...projectResume.content,
					status: newStatus,
					lastUpdated: new Date().toISOString()
				};

				if (user?.isDemo) {
					// Local storage update for demo
				} else {
					const { error } = await supabase
						.from("project_resumes")
						.update({
							content: updatedContent,
							updated_at: new Date().toISOString(),
						})
						.eq("project_id", project.id);
					if (error) throw error;
				}
			}

		} catch (error) {
			console.error("Error updating project status:", error);
		}
	};

	const handleSendMessage = async (
		messageText?: string,
		isSystemMessage = false
	) => {
		if (!project) return;
		if (!user || !user.id) return;

		const messageContent = messageText || newMessage;
		if (!messageContent.trim()) return;

		try {
			// Use the edge function to get or create a chat thread for this project
			const { data: threadData, error: threadError } = await supabase.functions.invoke('manage-chat-thread', {
				body: {
					action: 'get_thread',
					project_id: project.id
				}
			});

			let chatThread;
			if (threadError || !threadData?.thread) {
				// Thread doesn't exist, create one using the edge function
				const { data: createData, error: createError } = await supabase.functions.invoke('manage-chat-thread', {
					body: {
						action: 'create',
						project_id: project.id,
						topic: `Project: ${project.projectName}`
					}
				});
				
				if (createError) throw createError;
				chatThread = createData.thread;
			} else {
				chatThread = threadData.thread;
			}

			// Insert the message
			const { error } = await supabase.from("project_messages").insert({
				thread_id: chatThread.id,
				user_id: user.id,
				content: messageContent,
			});

			if (error) {
				console.error("Failed to send message", error);
			} else {
				if (!isSystemMessage) {
					setNewMessage("");
				}
			}
		} catch (error) {
			console.error("Error sending message:", error);
		}
	};

	const generateFeedback = async () => {
		if (!project || !user || !user.id) return;

		try {
			// Generate feedback
			const feedback = await generateProjectFeedback(project.id, project);

			const { error } = await supabase.from("project_messages").insert({
				project_id: project.id,
				sender_id: user.id,
				message: `[AI Feedback Suggestion]: ${feedback}`,
			});

			if (error) throw error;
		} catch (error) {
			console.error("Error generating feedback:", error);
		}
	};

	return (
		<RoleBasedRoute roles={["advisor", "admin"]}>
			<div className="flex h-screen bg-gray-50">
				<LoadingOverlay isLoading={false} />

				{/* Main content */}
				<div className="flex-1 overflow-auto">
					<header className="bg-white shadow-sm py-4 px-6 flex items-center">
						<Button
							variant="outline"
							leftIcon={<ChevronLeft size={16} />}
							onClick={() => router.push("/advisor/dashboard")}
							className="mr-4"
						>
							Back
						</Button>
						<div>
							<h1 className="text-2xl font-semibold text-gray-800">
								{project?.projectName || "Project Details"}
							</h1>
							<div
								className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(
									selectedStatus
								)}`}
							>
								{selectedStatus}
							</div>
						</div>
					</header>

					<main className="p-6">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* Main Content Column */}
							<div className="lg:col-span-2 space-y-6">
							{/* Project Information */}
							<Card className="shadow-sm">
								<CardHeader className="border-b bg-gray-50">
									<div className="flex justify-between items-center">
										<h2 className="text-lg font-semibold text-gray-800 flex items-center">
											<FileText className="h-5 w-5 mr-2 text-blue-600" />
											Project Details
										</h2>
										<div className="flex items-center space-x-3">
											<span className="text-sm text-gray-500">
												Status:
											</span>
											<Select
												options={[
													{
														value: "Info Gathering",
														label: "Info Gathering",
													},
													{
														value: "Advisor Review",
														label: "Advisor Review",
													},
													{
														value: "Matches Curated",
														label: "Matches Curated",
													},
													{
														value: "Introductions Sent",
														label: "Introductions Sent",
													},
													{
														value: "Term Sheet Received",
														label: "Term Sheet Received",
													},
													{
														value: "Closed",
														label: "Closed",
													},
													{
														value: "Withdrawn",
														label: "Withdrawn",
													},
													{
														value: "Stalled",
														label: "Stalled",
													},
												]}
												value={selectedStatus}
												onChange={(e) =>
													handleStatusChange(
														e.target
															.value as ProjectStatus
													)
												}
												size="sm"
												className="w-40"
											/>
										</div>
									</div>
								</CardHeader>
								<CardContent className="p-0">
									{project && (
										<div className="grid md:grid-cols-2 gap-4 p-4">
											<div className="space-y-6">
												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Project Name
													</h3>
													<p className="text-sm text-gray-800">
														{project.projectName}
													</p>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Project ID
													</h3>
													<p className="text-sm text-gray-800 font-mono">
														{project.id}
													</p>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Owner Entity ID
													</h3>
													<p className="text-sm text-gray-800 font-mono">
														{project.entityId}
													</p>
												</div>

												{projectResume?.content && (
													<div>
														<h3 className="text-sm font-medium text-gray-500 mb-1">
															Project Details
														</h3>
														<div className="space-y-2">
															{projectResume.content.propertyAddress && (
																<div className="flex items-start">
																	<MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
																	<div>
																		<p className="text-sm text-gray-800">
																			{projectResume.content.propertyAddress}
																		</p>
																	</div>
																</div>
															)}
															{projectResume.content.assetType && (
																<p className="text-sm text-gray-800">
																	<span className="font-medium">Asset Type:</span> {projectResume.content.assetType}
																</p>
															)}
															{projectResume.content.description && (
																<p className="text-sm text-gray-800">
																	<span className="font-medium">Description:</span> {projectResume.content.description}
																</p>
															)}
														</div>
													</div>
												)}
											</div>

											<div className="space-y-6">
												{projectResume?.content && (
													<>
														{projectResume.content.loanAmount && (
															<div>
																<h3 className="text-sm font-medium text-gray-500 mb-1">
																	Loan Information
																</h3>
																<div className="flex items-start">
																	<DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
																	<div>
																		<p className="text-sm text-gray-800">
																			<span className="font-medium">Amount Requested:</span> {formatCurrency(projectResume.content.loanAmount)}
																		</p>
																		{projectResume.content.loanType && (
																			<p className="text-sm text-gray-800">
																				<span className="font-medium">Type:</span> {projectResume.content.loanType}
																			</p>
																		)}
																		{projectResume.content.targetLTV && (
																			<p className="text-sm text-gray-800">
																				<span className="font-medium">Target LTV:</span> {projectResume.content.targetLTV}%
																			</p>
																		)}
																	</div>
																</div>
															</div>
														)}

														{projectResume.content.purchasePrice && (
															<div>
																<h3 className="text-sm font-medium text-gray-500 mb-1">
																	Capital Stack
																</h3>
																<div className="flex flex-col gap-1">
																	<p className="text-sm text-gray-800">
																		<span className="font-medium">Purchase Price:</span> {formatCurrency(projectResume.content.purchasePrice)}
																	</p>
																	{projectResume.content.totalProjectCost && (
																		<p className="text-sm text-gray-800">
																			<span className="font-medium">Total Project Cost:</span> {formatCurrency(projectResume.content.totalProjectCost)}
																		</p>
																	)}
																	{projectResume.content.exitStrategy && (
																		<p className="text-sm text-gray-800">
																			<span className="font-medium">Exit Strategy:</span> {projectResume.content.exitStrategy}
																		</p>
																	)}
																</div>
															</div>
														)}
													</>
												)}

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Project Dates
													</h3>
													<div className="flex items-start">
														<Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
														<div>
															<p className="text-sm text-gray-800">
																<span className="font-medium">Created:</span> {formatDate(project.createdAt)}
															</p>
															<p className="text-sm text-gray-800">
																<span className="font-medium">Last Updated:</span> {formatDate(project.updatedAt)}
															</p>
														</div>
													</div>
												</div>
											</div>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Document Requirements */}
							<Card className="shadow-sm">
								<CardHeader className="border-b bg-gray-50">
									<h2 className="text-lg font-semibold text-gray-800 flex items-center">
										<FileText className="h-5 w-5 mr-2 text-blue-600" />
										Document Requirements
									</h2>
								</CardHeader>
								<CardContent className="p-0">
									{documentRequirements.length > 0 ? (
										<div className="overflow-x-auto">
											<table className="min-w-full divide-y divide-gray-200">
												<thead className="bg-gray-50">
													<tr>
														<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
															Document Type
														</th>
														<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
															Status
														</th>
													</tr>
												</thead>
												<tbody className="bg-white divide-y divide-gray-200">
													{documentRequirements.map(
														(req) => (
															<tr key={req.id}>
																<td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
																	{
																		req.requiredDocType
																	}
																</td>
																<td className="px-4 py-3 whitespace-nowrap">
																	<span
																		className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
																			req.status ===
																			"Approved"
																				? "bg-green-100 text-green-800"
																				: req.status ===
																				  "Rejected"
																				? "bg-red-100 text-red-800"
																				: req.status ===
																				  "Uploaded"
																				? "bg-blue-100 text-blue-800"
																				: req.status ===
																				  "In Review"
																				? "bg-amber-100 text-amber-800"
																				: req.status ===
																				  "Not Applicable"
																				? "bg-gray-100 text-gray-800"
																				: "bg-gray-100 text-gray-800"
																		}`}
																	>
																		{
																			req.status
																		}
																	</span>
																</td>
															</tr>
														)
													)}
												</tbody>
											</table>
										</div>
									) : (
										<div className="text-center py-8">
											<p className="text-gray-500">
												No document requirements
											</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Project Documents */}
							<Card className="shadow-sm">
								<CardContent className="p-0">
									{project && (
										<DocumentManager
											projectId={project.id}
											resourceId={project.projectDocsResourceId || null}
											title="Project-Specific Documents"
										/>
									)}
								</CardContent>
							</Card>


							</div>


							{/* Sidebar Column */}
							<div className="lg:col-span-1 space-y-6">
							{/* Borrower Information */}
							<Card className="shadow-sm">
								<CardHeader className="border-b bg-gray-50">
									<h2 className="text-lg font-semibold text-gray-800 flex items-center">
										<User className="h-5 w-5 mr-2 text-blue-600" />
										Borrower Details
									</h2>
								</CardHeader>
								<CardContent className="p-4">
									{borrowerResume?.content ? (
										<div className="space-y-4">
											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Borrower
												</h3>
												<div className="flex items-start">
													<User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
													<div>
														<p className="text-sm text-gray-800">
															{borrowerResume.content.fullLegalName || 'Not provided'}
														</p>
														<p className="text-sm text-gray-600">
															{borrowerResume.content.contactEmail || 'Not provided'}
														</p>
														<p className="text-sm text-gray-600">
															{borrowerResume.content.contactPhone || 'Not provided'}
														</p>
													</div>
												</div>
											</div>

											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Entity
												</h3>
												<div className="flex items-start">
													<Building className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
													<div>
														<p className="text-sm text-gray-800">
															{borrowerResume.content.primaryEntityName || 'Not provided'}
														</p>
														<p className="text-sm text-gray-600">
															{borrowerResume.content.primaryEntityStructure || 'Not provided'}
														</p>
													</div>
												</div>
											</div>

											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Experience
												</h3>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Years of Experience:</span> {borrowerResume.content.yearsCREExperienceRange || 'Not provided'}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Asset Classes:</span> {borrowerResume.content.assetClassesExperience?.join(", ") || 'Not provided'}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Markets:</span> {borrowerResume.content.geographicMarketsExperience?.join(", ") || 'Not provided'}
												</p>
											</div>

											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Financial
												</h3>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Credit Score:</span> {borrowerResume.content.creditScoreRange || 'Not provided'}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Net Worth:</span> {borrowerResume.content.netWorthRange || 'Not provided'}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">Liquidity:</span> {borrowerResume.content.liquidityRange || 'Not provided'}
												</p>
											</div>

											{(borrowerResume.content.bankruptcyHistory ||
												borrowerResume.content.foreclosureHistory ||
												borrowerResume.content.litigationHistory) && (
												<div className="bg-amber-50 p-3 rounded border border-amber-200">
													<h3 className="text-sm font-medium text-amber-800 mb-1">
														Special Considerations
													</h3>
													<ul className="text-sm text-amber-700 list-disc list-inside">
														{borrowerResume.content.bankruptcyHistory && (
															<li>Bankruptcy history in the past 7 years</li>
														)}
														{borrowerResume.content.foreclosureHistory && (
															<li>Foreclosure history in the past 7 years</li>
														)}
														{borrowerResume.content.litigationHistory && (
															<li>Significant litigation history</li>
														)}
													</ul>
												</div>
											)}
										</div>
									) : (
										<div className="text-center py-8">
											<p className="text-gray-500">
												Borrower resume not found
											</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Borrower Documents */}
							<Card className="shadow-sm">
								<CardContent className="p-0">
									{project && (
										<DocumentManager
											projectId={project.id}
											resourceId={project.projectDocsResourceId || null}
											title="General Borrower Documents"
										/>
									)}
								</CardContent>
							</Card>

							{/* Message Board */}
							<Card className="shadow-sm flex flex-col">
								<CardHeader className="border-b bg-gray-50">
									<h2 className="text-lg font-semibold text-gray-800 flex items-center">
										<MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
										Project Message Board
									</h2>
								</CardHeader>
								<CardContent className="p-4 flex-1 flex flex-col">
									<div className="flex-1 space-y-4 overflow-y-auto mb-4 p-2 border rounded bg-gray-50/50 min-h-[300px]">
										{messages.length > 0 ? (
											messages.map((message, index) => (
												<div
													key={message.id}
													className={`flex ${
														message.senderType ===
														"Advisor"
															? "justify-end"
															: "justify-start"
													}`}
												>
													<div
														className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
															message.senderType ===
															"Advisor"
																? "bg-blue-100 text-blue-900"
																: "bg-gray-100 text-gray-900"
														}`}
													>
														<div className="flex items-center mb-1">
															<span className="text-xs font-semibold">
																{message.senderType ===
																"Advisor"
																	? "You"
																	: borrowerResume?.content?.fullLegalName ||
																	  "Borrower"}
															</span>
															<span className="text-xs text-gray-500 ml-2">
																{new Date(
																	message.createdAt
																).toLocaleString()}
															</span>
														</div>
														<p className="text-sm whitespace-pre-line">
															{message.message}
														</p>
													</div>
												</div>
											))
										) : (
											<div className="text-center py-8">
												<p className="text-gray-500">
													No messages yet
												</p>
											</div>
										)}
									</div>

									<div className="flex space-x-2">
										<textarea
											className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
											placeholder="Type your message here..."
											rows={2}
											value={newMessage}
											onChange={(e) =>
												setNewMessage(e.target.value)
											}
										/>
										<div className="flex flex-col space-y-2">
											<Button
												onClick={() =>
													handleSendMessage()
												}
												disabled={!newMessage.trim()}
												leftIcon={<Send size={16} />}
											>
												Send
											</Button>
											<Button
												variant="secondary"
												onClick={generateFeedback}
											>
												Generate Feedback
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
							</div>
						</div>
					</main>
				</div>
			</div>
		</RoleBasedRoute>
	);
}
