// src/components/dashboard/MessagePanel.tsx
"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/Button";
import { MessageSquare, Send, ChevronRight } from "lucide-react";
import { useProjects } from "../../hooks/useProjects";
import { ProjectMessage } from "../../types/enhanced-types";
import { getAdvisorById } from "../../../lib/enhancedMockApiService";
import { cn } from "@/utils/cn";

interface MessagePanelProps {
	projectId: string;
	fullHeight?: boolean;
}

export const MessagePanel: React.FC<MessagePanelProps> = ({
	projectId,
	fullHeight = false,
}) => {
	const router = useRouter();
	// projectMessages is now specific to the activeProject in context
	// For a general panel, we might need a way to fetch messages specifically for this ID
	// Let's assume for now this panel might only appear when the project IS active,
	// or adjust useProjects hook later if needed.
	const {
		getProject,
		projectMessages,
		addProjectMessage,
		activeProject,
		setActiveProject,
	} = useProjects();
	const [newMessage, setNewMessage] = useState("");
	const [advisorName, setAdvisorName] = useState("Your Capital Advisor");
	const [advisorAvatar, setAdvisorAvatar] = useState(""); // Keep avatar state if used
	const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);
	const [localMessages, setLocalMessages] = useState<ProjectMessage[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messageContainerRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = () => {
		// Scroll the message container to the bottom instead of using scrollIntoView
		if (messageContainerRef.current) {
			messageContainerRef.current.scrollTop =
				messageContainerRef.current.scrollHeight;
		}
	};

	useEffect(() => {
		scrollToBottom();
	}, [localMessages]);

	// Get the specific project for this panel
	const project = getProject(projectId);

	// Effect to update local messages when the active project matches this panel's project
	useEffect(() => {
		if (activeProject?.id === projectId) {
			setLocalMessages(projectMessages);
		}
		// If the active project changes and *doesn't* match, the message list won't update here
		// This might be okay if the panel is only shown for the active project context
		// Or we need a dedicated message fetcher per panel instance.
	}, [projectMessages, activeProject, projectId]);

	// Get advisor information and ensure project is active
	useEffect(() => {
		const loadData = async () => {
			if (project) {
				// Set this project as active if it's not already
				// Be cautious if multiple panels are rendered - this could cause loops
				// setActiveProject(project);

				if (project.assignedAdvisorUserId) {
					setIsLoadingAdvisor(true);
					try {
						const advisor = await getAdvisorById(
							project.assignedAdvisorUserId
						);
						if (advisor) {
							setAdvisorName(advisor.name);
							// setAdvisorAvatar(advisor.avatar); // Uncomment if avatar is used
						}
					} catch (error) {
						console.error("Error fetching advisor info:", error);
						setAdvisorName("Capital Advisor"); // Fallback name
					} finally {
						setIsLoadingAdvisor(false);
					}
				} else {
					setAdvisorName("Capital Advisor"); // Default if none assigned
				}
			}
		};

		loadData();
	}, [project]); // Depend only on the project prop

	// Handle sending a message
	const handleSendMessage = async () => {
		// Ensure the project context is active for sending messages
		if (
			!activeProject ||
			activeProject.id !== projectId ||
			!newMessage.trim()
		)
			return;

		try {
			// Use context function
			await addProjectMessage(newMessage);
			setNewMessage("");
		} catch (error) {
			console.error("Error sending message:", error);
			// Optionally show UI feedback for error
		}
	};

	if (!project) {
		return (
			<Card className="shadow-sm">
				<CardContent className="p-4 text-gray-500">
					Loading project...
				</CardContent>
			</Card>
		); // Or some loading state
	}

	return (
		<Card className={cn("shadow-sm", fullHeight && "h-full flex flex-col")}>
			<CardHeader className="pb-3 border-b flex justify-between items-center bg-gray-50">
				<div className="flex items-center">
					<MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
					<h2 className="text-lg font-semibold text-gray-800">
						Message Your Advisor
					</h2>
				</div>
				{/* Link to the new workspace page */}
				<Button
					variant="outline"
					size="sm"
					rightIcon={<ChevronRight size={16} />}
					onClick={() =>
						router.push(`/project/workspace/${projectId}`)
					}
				>
					View/Edit Project
				</Button>
			</CardHeader>

			<CardContent className="p-4">
				{/* Display localMessages which should reflect the active project's messages if IDs match */}
				<div
					className="space-y-4 max-h-64 overflow-y-auto mb-4 border rounded p-2 bg-gray-50"
					ref={messageContainerRef}
				>
					{localMessages.length > 0 ? (
						localMessages.map((message: ProjectMessage) => (
							<div
								key={message.id}
								className={`flex ${
									message.senderType === "Borrower"
										? "justify-end"
										: "justify-start"
								}`}
							>
								<div
									className={`max-w-[80%] rounded-lg px-3 py-2 shadow-sm ${
										message.senderType === "Borrower"
											? "bg-blue-100 text-blue-900"
											: message.senderType === "Advisor"
											? "bg-gray-100 text-gray-900"
											: "bg-yellow-50 text-yellow-800 italic text-sm" // System message style
									}`}
								>
						{message.senderType !== "System" && (
							<div className="flex items-center mb-1">
								<span className="text-xs font-medium">
									{message.senderDisplayName || (message.senderType === "Advisor" ? advisorName : "Team Member")}
								</span>
								<span className="text-xs text-gray-500 ml-2">
									{new Date(message.createdAt).toLocaleString()}
								</span>
							</div>
						)}
									<p
										className={`text-sm whitespace-pre-line ${
											message.senderType === "System"
												? "text-center"
												: ""
										}`}
									>
										{message.message}
									</p>
								</div>
							</div>
						))
					) : (
						<div className="text-center py-4">
							<p className="text-gray-500">No messages yet.</p>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<div className="flex space-x-2">
					<textarea
						className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
						placeholder="Type your message here..."
						rows={2}
						value={newMessage}
						onChange={(e) => setNewMessage(e.target.value)}
						// Disable if the current panel's project isn't the active one
						disabled={activeProject?.id !== projectId}
					/>
					<Button
						onClick={handleSendMessage}
						disabled={
							!newMessage.trim() ||
							activeProject?.id !== projectId
						}
						leftIcon={<Send size={16} />}
					>
						Send
					</Button>
				</div>
				{activeProject?.id !== projectId && (
					<p className="text-xs text-red-600 mt-1">
						Select this project via the dashboard to send messages.
					</p>
				)}
			</CardContent>
		</Card>
	);
};
