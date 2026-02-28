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
	/** Set true before intentional removeChannel so subscribe callback skips reconnect/error log */
	messageChannelClosingIntentionally: boolean;
}

interface ChatRealtimeActions {
	setMessageChannel: (channel: RealtimeChannel | null) => void;
	setMembershipChannel: (channel: RealtimeChannel | null) => void;
	setProjectUnreadChannel: (channel: RealtimeChannel | null) => void;
	setMessageChannelClosingIntentionally: (value: boolean) => void;
}

export const useChatRealtimeStore = create<ChatRealtimeState & ChatRealtimeActions>((set) => ({
	messageChannel: null,
	membershipChannel: null,
	projectUnreadChannel: null,
	messageChannelClosingIntentionally: false,

	setMessageChannel: (channel) => set({ messageChannel: channel }),
	setMembershipChannel: (channel) => set({ membershipChannel: channel }),
	setProjectUnreadChannel: (channel) => set({ projectUnreadChannel: channel }),
	setMessageChannelClosingIntentionally: (value) =>
		set({ messageChannelClosingIntentionally: value }),
}));
