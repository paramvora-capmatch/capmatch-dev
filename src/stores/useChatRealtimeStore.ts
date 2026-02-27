/**
 * Chat realtime store: Supabase realtime channel refs.
 * Split from useChatStore for decomposition; useChatStore creates channels and stores refs here.
 */
import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatRealtimeState {
	messageChannel: RealtimeChannel | null;
	membershipChannel: RealtimeChannel | null;
	projectUnreadChannel: RealtimeChannel | null;
}

interface ChatRealtimeActions {
	setMessageChannel: (channel: RealtimeChannel | null) => void;
	setMembershipChannel: (channel: RealtimeChannel | null) => void;
	setProjectUnreadChannel: (channel: RealtimeChannel | null) => void;
}

export const useChatRealtimeStore = create<ChatRealtimeState & ChatRealtimeActions>((set) => ({
	messageChannel: null,
	membershipChannel: null,
	projectUnreadChannel: null,

	setMessageChannel: (channel) => set({ messageChannel: channel }),
	setMembershipChannel: (channel) => set({ membershipChannel: channel }),
	setProjectUnreadChannel: (channel) => set({ projectUnreadChannel: channel }),
}));
