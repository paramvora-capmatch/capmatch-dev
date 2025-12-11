"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, BellOff, Folder, Loader2, Search } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/utils/cn";

type ProjectSummary = {
  id: string;
  name: string;
};

const GLOBAL_CONTROLS = [
  {
    id: "all",
    title: "All notifications",
    description: "Mute every in-app alert across CapMatch.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "*", channel: "in_app" as const },
  },
  {
    id: "documents",
    title: "Document uploads",
    description: "Alerts when someone uploads or updates project files.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "document_uploaded", channel: "in_app" as const },
  },
  {
    id: "chat",
    title: "Chat activity & mentions",
    description: "Notifications for new chat messages and mentions.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "chat_message", channel: "in_app" as const },
  },
  {
    id: "meeting_invited",
    title: "Meeting invitations",
    description: "Alerts when you're invited to a meeting.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "meeting_invited", channel: "in_app" as const },
  },
  {
    id: "meeting_updated",
    title: "Meeting updates",
    description: "Notifications when meeting details change.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "meeting_updated", channel: "in_app" as const },
  },
  {
    id: "meeting_reminder",
    title: "Meeting reminders",
    description: "Reminders 30 minutes before meetings start.",
    target: { scopeType: "global" as const, scopeId: null, eventType: "meeting_reminder", channel: "in_app" as const },
  },
];

const buildPreferenceKey = (scopeType: string, scopeId: string | null, eventType: string) =>
  `${scopeType}:${scopeId ?? "global"}:${eventType}`;

export const NotificationSettingsPanel = () => {
  const { user } = useAuth();
  const {
    preferences,
    isLoading,
    error,
    getPreferenceStatus,
    setPreferenceStatus,
    isPreferencePending,
  } = useNotificationPreferences();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");

  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;
    setProjectsLoading(true);
    setProjectsError(null);
    const { data, error: projectError } = await supabase
      .from("projects")
      .select("id,name")
      .order("name", { ascending: true });

    if (projectError) {
      console.error("[NotificationSettingsPanel] Failed to load projects:", projectError);
      setProjectsError(projectError.message);
      setProjects([]);
    } else {
      setProjects(data ?? []);
    }
    setProjectsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const projectNameMap = useMemo(() => {
    return projects.reduce<Record<string, string>>((acc, project) => {
      acc[project.id] = project.name;
      return acc;
    }, {});
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(projectSearch.trim().toLowerCase())
    );
  }, [projectSearch, projects]);

  const activeOverrides = useMemo(
    () =>
      preferences.filter(
        (pref) =>
          pref.status === "muted" &&
          pref.channel === "in_app" &&
          (pref.scope_type !== "thread")
      ),
    [preferences]
  );

  const handleToggle = useCallback(
    async (target: { scopeType: "global" | "project"; scopeId: string | null; eventType: string }) => {
      const currentStatus = getPreferenceStatus(target);
      await setPreferenceStatus({
        ...target,
        channel: "in_app",
        status: currentStatus === "muted" ? "immediate" : "muted",
      });
    },
    [getPreferenceStatus, setPreferenceStatus]
  );

  const renderToggle = (config: typeof GLOBAL_CONTROLS[number]) => {
    const status = getPreferenceStatus(config.target);
    const isMuted = status === "muted";
    const pending = isPreferencePending(config.target);
    return (
      <button
        key={config.id}
        type="button"
        onClick={() => void handleToggle(config.target)}
        disabled={pending}
        className={cn(
          "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between text-left transition-all hover:border-blue-200 hover:shadow-sm",
          pending && "opacity-70 cursor-wait"
        )}
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{config.title}</p>
          <p className="text-xs text-gray-500 mt-1">{config.description}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border",
            isMuted ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-600 border-green-200"
          )}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isMuted ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          {isMuted ? "Muted" : "Enabled"}
        </span>
      </button>
    );
  };

  const renderProjectRow = (project: ProjectSummary) => {
    const target = { scopeType: "project" as const, scopeId: project.id, eventType: "*", channel: "in_app" as const };
    const status = getPreferenceStatus(target);
    const isMuted = status === "muted";
    const pending = isPreferencePending(target);
    return (
      <div
        key={project.id}
        className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between bg-white hover:border-blue-200 transition-colors"
      >
        <div>
          <p className="font-semibold text-gray-900">{project.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Applies to all notifications for this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleToggle(target)}
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all",
            isMuted
              ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              : "bg-green-50 text-green-600 border-green-200 hover:bg-green-100",
            pending && "opacity-70 cursor-wait"
          )}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {isMuted ? "Muted" : "Enabled"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Global controls</p>
        <div className="grid gap-3 md:grid-cols-2">
          {GLOBAL_CONTROLS.map((control) => renderToggle(control))}
        </div>
        {error && (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Project overrides</p>
            <p className="text-xs text-gray-500">Mute all notifications for specific projects.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects"
              value={projectSearch}
              onChange={(event) => setProjectSearch(event.target.value)}
              className="h-9 pl-9 pr-3 rounded-full border border-gray-200 text-sm focus:border-blue-400 focus:outline-none focus:ring-0 bg-white"
            />
          </div>
        </div>
        {projectsLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects…
          </div>
        ) : projectsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {projectsError}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No projects match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.slice(0, 6).map((project) => renderProjectRow(project))}
            {filteredProjects.length > 6 && (
              <p className="text-xs text-gray-500">
                Showing the first 6 projects. Use search to find others.
              </p>
            )}
          </div>
        )}
      </section>

      {activeOverrides.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Muted overrides</p>
          <div className="flex flex-wrap gap-2">
            {activeOverrides.map((pref) => {
              const label =
                pref.scope_type === "global"
                  ? pref.event_type === "*"
                    ? "All notifications"
                    : pref.event_type
                  : projectNameMap[pref.scope_id ?? ""] ?? pref.scope_id?.slice(0, 6) ?? pref.scope_type;
              return (
                <span
                  key={`${pref.id}-${pref.scope_type}`}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                >
                  <BellOff className="h-3 w-3" />
                  {label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Syncing latest preference data…
        </div>
      )}

      {!isLoading && preferences.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Folder className="h-3.5 w-3.5" />
          No overrides yet — you’re receiving all in-app notifications.
        </div>
      )}
    </div>
  );
};


