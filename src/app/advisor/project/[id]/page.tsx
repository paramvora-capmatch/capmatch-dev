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
} from "../../../../types/enhanced-types";
import { generateProjectFeedback } from "../../../../../lib/enhancedMockApiService";
import { storageService } from "@/lib/storage";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../../../../lib/supabaseClient";
import {
	dbBorrowerToBorrowerProfile,
	dbMessageToProjectMessage,
	dbProjectToProjectProfile,
} from "@/lib/dto-mapper";

export default function AdvisorProjectDetailPage() {
	const router = useRouter();
	const params = useParams();
	const { user } = useAuth();

	const [project, setProject] = useState<ProjectProfile | null>(null);
	const [borrowerProfile, setBorrowerProfile] =
		useState<BorrowerProfile | null>(null);
	const [messages, setMessages] = useState<ProjectMessage[]>([]);
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

				let foundProject: ProjectProfile | undefined | null = null;
				if (user.isDemo) {
					const allProjects = await storageService.getItem<
						ProjectProfile[]
					>("projects");
					foundProject = allProjects?.find((p) => p.id === projectId);
				} else {
					const { data, error } = await supabase
						.from("projects")
						.select("*")
						.eq("id", projectId)
						.single();
					if (error) throw error;
					if (data) foundProject = dbProjectToProjectProfile(data);
				}

				if (foundProject) {
					setProject(foundProject);
					setSelectedStatus(foundProject.projectStatus);

					// Get borrower profile
					if (user.isDemo) {
						const allProfiles = await storageService.getItem<
							BorrowerProfile[]
						>("borrowerProfiles");
						const profile = allProfiles?.find(
							(p) => p.id === foundProject!.borrowerProfileId
						);
						if (profile) setBorrowerProfile(profile);
					} else {
						const { data: borrowerData, error: borrowerError } =
							await supabase
								.from("borrowers")
								.select("*, profiles (email, full_name)")
								.eq("id", foundProject.borrowerProfileId)
								.single();
						if (borrowerError) throw borrowerError;

						if (borrowerData) {
							// @ts-ignore - `profiles` can be null if RLS on the profiles table is too restrictive for advisors.
							const user = {
								email:
									borrowerData.profiles?.email ||
									"[REDACTED]",
								name: borrowerData.profiles?.full_name,
							};
							const fullProfile = dbBorrowerToBorrowerProfile(
								borrowerData,
								user
							);
							if (!borrowerData.profiles) {
								console.warn(
									"Could not fetch borrower's profile details (email, name). This is likely due to a Row Level Security policy on the 'profiles' table that prevents advisors from reading borrower profiles."
								);
								// Overwrite to make the issue visible on the UI
								fullProfile.contactEmail =
									"Details Inaccessible due to RLS";
							}
							setBorrowerProfile(fullProfile);
						}
					}

					// Fetch initial messages from Supabase
					const { data: messagesData, error: messagesError } =
						await supabase
							.from("project_messages")
							.select("*")
							.eq("project_id", projectId)
							.order("created_at", { ascending: true });

					if (messagesError) {
						console.error(
							"Error fetching messages:",
							messagesError
						);
					} else {
						const mappedMessages = messagesData.map(msg => {
							const senderRole = msg.sender_id === user.id ? 'advisor' : 'borrower';
							return dbMessageToProjectMessage({ ...msg, sender: { role: senderRole } });
						});
						setMessages(mappedMessages);
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
				} else {
					console.error("Project not found");
					router.push("/advisor/dashboard");
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

		const channel = supabase
			.channel(`project-messages-advisor-${projectId}`)
			.on<any>(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "project_messages",
					filter: `project_id=eq.${projectId}`,
				},
				(payload) => {
					const newMessagePayload = payload.new;
					const senderRole =
						newMessagePayload.sender_id === user.id
							? "advisor"
							: "borrower";

					const newMessage = dbMessageToProjectMessage({
						...newMessagePayload,
						sender: { role: senderRole },
					});

					setMessages((currentMessages) => [
						...currentMessages,
						newMessage,
					]);
				}
			)
			.subscribe();

		messageSubscriptionRef.current = channel;
		return () => {
			supabase.removeChannel(channel);
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
			const updatedProject: ProjectProfile = {
				...project,
				projectStatus: newStatus,
				updatedAt: new Date().toISOString(),
			};

			if (user?.isDemo) {
				// Local storage update for demo
			} else {
				const { error } = await supabase
					.from("projects")
					.update({
						project_status: newStatus,
						updated_at: new Date().toISOString(),
					})
					.eq("id", project.id);
				if (error) throw error;
			}

			setProject(updatedProject);
			setSelectedStatus(newStatus);

			console.log("Project status updated successfully");
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

		const { error } = await supabase.from("project_messages").insert({
			project_id: project.id,
			sender_id: user.id,
			message: messageContent,
		});

		if (error) {
			console.error("Failed to send message", error);
		} else {
			if (!isSystemMessage) {
				setNewMessage("");
			}
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
			console.log("Feedback generated and sent");
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
							{project && (
								<div
									className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(
										project.projectStatus
									)}`}
								>
									{project.projectStatus}
								</div>
							)}
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
														Property Address
													</h3>
													<div className="flex items-start">
														<MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
														<div>
															<p className="text-sm text-gray-800">
																{
																	project.propertyAddressStreet
																}
															</p>
															<p className="text-sm text-gray-800">
																{
																	project.propertyAddressCity
																}
																,{" "}
																{
																	project.propertyAddressState
																}{" "}
																{
																	project.propertyAddressZip
																}
															</p>
														</div>
													</div>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Asset Type
													</h3>
													<p className="text-sm text-gray-800">
														{project.assetType}
													</p>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Deal Type
													</h3>
													<p className="text-sm text-gray-800">
														{project.projectPhase}
													</p>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Description
													</h3>
													<p className="text-sm text-gray-800">
														{project.projectDescription ||
															"No description provided"}
													</p>
												</div>
											</div>

											<div className="space-y-6">
												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Loan Information
													</h3>
													<div className="flex items-start">
														<DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
														<div>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Amount
																	Requested:
																</span>{" "}
																{formatCurrency(
																	project.loanAmountRequested
																)}
															</p>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Type:
																</span>{" "}
																{
																	project.loanType
																}
															</p>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Target LTV:
																</span>{" "}
																{
																	project.targetLtvPercent
																}
																%
															</p>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Target
																	Close:
																</span>{" "}
																{project.targetCloseDate
																	? formatDate(
																			project.targetCloseDate
																	  )
																	: "Not specified"}
															</p>
														</div>
													</div>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Capital Stack
													</h3>
													<div className="flex flex-col gap-1">
														{project.purchasePrice && (
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Purchase
																	Price:
																</span>{" "}
																{formatCurrency(
																	project.purchasePrice
																)}
															</p>
														)}
														{project.totalProjectCost && (
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Total
																	Project
																	Cost:
																</span>{" "}
																{formatCurrency(
																	project.totalProjectCost
																)}
															</p>
														)}
														{project.capexBudget && (
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	CapEx
																	Budget:
																</span>{" "}
																{formatCurrency(
																	project.capexBudget
																)}
															</p>
														)}
														<p className="text-sm text-gray-800">
															<span className="font-medium">
																Exit Strategy:
															</span>{" "}
															{
																project.exitStrategy
															}
														</p>
													</div>
												</div>

												<div>
													<h3 className="text-sm font-medium text-gray-500 mb-1">
														Project Dates
													</h3>
													<div className="flex items-start">
														<Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
														<div>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Created:
																</span>{" "}
																{formatDate(
																	project.createdAt
																)}
															</p>
															<p className="text-sm text-gray-800">
																<span className="font-medium">
																	Last
																	Updated:
																</span>{" "}
																{formatDate(
																	project.updatedAt
																)}
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
									{borrowerProfile ? (
										<div className="space-y-4">
											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Borrower
												</h3>
												<div className="flex items-start">
													<User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
													<div>
														<p className="text-sm text-gray-800">
															{
																borrowerProfile.fullLegalName
															}
														</p>
														<p className="text-sm text-gray-600">
															{
																borrowerProfile.contactEmail
															}
														</p>
														<p className="text-sm text-gray-600">
															{
																borrowerProfile.contactPhone
															}
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
															{
																borrowerProfile.primaryEntityName
															}
														</p>
														<p className="text-sm text-gray-600">
															{
																borrowerProfile.primaryEntityStructure
															}
														</p>
													</div>
												</div>
											</div>

											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Experience
												</h3>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Years of Experience:
													</span>{" "}
													{
														borrowerProfile.yearsCREExperienceRange
													}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Asset Classes:
													</span>{" "}
													{borrowerProfile.assetClassesExperience.join(
														", "
													)}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Markets:
													</span>{" "}
													{borrowerProfile.geographicMarketsExperience.join(
														", "
													)}
												</p>
											</div>

											<div>
												<h3 className="text-sm font-medium text-gray-500 mb-1">
													Financial
												</h3>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Credit Score:
													</span>{" "}
													{
														borrowerProfile.creditScoreRange
													}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Net Worth:
													</span>{" "}
													{
														borrowerProfile.netWorthRange
													}
												</p>
												<p className="text-sm text-gray-800">
													<span className="font-medium">
														Liquidity:
													</span>{" "}
													{
														borrowerProfile.liquidityRange
													}
												</p>
											</div>

											{(borrowerProfile.bankruptcyHistory ||
												borrowerProfile.foreclosureHistory ||
												borrowerProfile.litigationHistory) && (
												<div className="bg-amber-50 p-3 rounded border border-amber-200">
													<h3 className="text-sm font-medium text-amber-800 mb-1">
														Special Considerations
													</h3>
													<ul className="text-sm text-amber-700 list-disc list-inside">
														{borrowerProfile.bankruptcyHistory && (
															<li>
																Bankruptcy
																history in the
																past 7 years
															</li>
														)}
														{borrowerProfile.foreclosureHistory && (
															<li>
																Foreclosure
																history in the
																past 7 years
															</li>
														)}
														{borrowerProfile.litigationHistory && (
															<li>
																Significant
																litigation
																history
															</li>
														)}
													</ul>
												</div>
											)}
										</div>
									) : (
										<div className="text-center py-8">
											<p className="text-gray-500">
												Borrower profile not found
											</p>
										</div>
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
																	: borrowerProfile?.fullLegalName ||
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
