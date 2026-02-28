/**
 * Chat unread store: unread count state and updates.
 * Split from useChatStore for decomposition; useChatStore delegates here and syncs state.
 */
import { create } from "zustand";

interface ChatUnreadState {
	threadUnreadCounts: Map<string, number>;
	totalUnreadCount: number;
	isLoadingUnreadCounts: boolean;
}

interface ChatUnreadActions {
	updateThreadUnreadCount: (threadId: string, count: number) => void;
	incrementUnreadCount: (threadId: string) => void;
	resetThreadUnreadCount: (threadId: string) => void;
	setUnreadState: (
		threadUnreadCounts: Map<string, number>,
		totalUnreadCount: number,
		isLoadingUnreadCounts: boolean
	) => void;
}

export const useChatUnreadStore = create<ChatUnreadState & ChatUnreadActions>((set, get) => ({
	threadUnreadCounts: new Map<string, number>(),
	totalUnreadCount: 0,
	isLoadingUnreadCounts: false,

	updateThreadUnreadCount: (threadId: string, count: number) => {
		const state = get();
		const oldCount = state.threadUnreadCounts.get(threadId) || 0;
		const newCounts = new Map(state.threadUnreadCounts);
		newCounts.set(threadId, count);
		const totalDiff = count - oldCount;
		set({
			threadUnreadCounts: newCounts,
			totalUnreadCount: Math.max(0, state.totalUnreadCount + totalDiff),
		});
	},

	incrementUnreadCount: (threadId: string) => {
		const state = get();
		const currentCount = state.threadUnreadCounts.get(threadId) || 0;
		get().updateThreadUnreadCount(threadId, currentCount + 1);
	},

	resetThreadUnreadCount: (threadId: string) => {
		get().updateThreadUnreadCount(threadId, 0);
	},

	setUnreadState: (
		threadUnreadCounts: Map<string, number>,
		totalUnreadCount: number,
		isLoadingUnreadCounts: boolean
	) => {
		set({ threadUnreadCounts, totalUnreadCount, isLoadingUnreadCounts });
	},
}));
