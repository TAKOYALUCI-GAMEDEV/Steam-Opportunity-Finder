import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CapabilityId } from "@/lib/capabilities";
import { makeDemoTeam } from "@/lib/demoTeam";
import type { TeamConstraints, TeamProfile } from "@/types/team";

export type MapMode = "global" | "team";

interface TeamState {
  profiles: Record<string, TeamProfile>;
  activeId: string;
  mode: MapMode;

  setMode: (m: MapMode) => void;
  setActive: (id: string) => void;
  patchActive: (patch: Partial<TeamProfile>) => void;
  setCapability: (id: CapabilityId, v: number) => void;
  patchConstraints: (patch: Partial<TeamConstraints>) => void;
  cloneActive: (name?: string) => string;
  removeProfile: (id: string) => void;
  resetDemo: () => void;
}

function touch<T extends TeamProfile>(p: T): T {
  return { ...p, updatedAt: new Date().toISOString() };
}

const demo = makeDemoTeam();

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      profiles: { [demo.id]: demo },
      activeId: demo.id,
      mode: "team",

      setMode: (mode) => set({ mode }),
      setActive: (activeId) => set({ activeId }),

      patchActive: (patch) =>
        set((s) => {
          const cur = s.profiles[s.activeId];
          if (!cur) return s;
          return {
            profiles: { ...s.profiles, [s.activeId]: touch({ ...cur, ...patch }) },
          };
        }),

      setCapability: (id, v) =>
        set((s) => {
          const cur = s.profiles[s.activeId];
          if (!cur) return s;
          return {
            profiles: {
              ...s.profiles,
              [s.activeId]: touch({
                ...cur,
                capabilityProfile: {
                  ...cur.capabilityProfile,
                  [id]: Math.max(0, Math.min(5, v)),
                },
              }),
            },
          };
        }),

      patchConstraints: (patch) =>
        set((s) => {
          const cur = s.profiles[s.activeId];
          if (!cur) return s;
          return {
            profiles: {
              ...s.profiles,
              [s.activeId]: touch({
                ...cur,
                constraints: { ...cur.constraints, ...patch },
              }),
            },
          };
        }),

      cloneActive: (name) => {
        const s = get();
        const cur = s.profiles[s.activeId];
        const id = `team_${Date.now().toString(36)}`;
        const clone: TeamProfile = touch({
          ...structuredClone(cur),
          id,
          name: name ?? `${cur.name} (scenario)`,
          createdAt: new Date().toISOString(),
        });
        set({ profiles: { ...s.profiles, [id]: clone }, activeId: id });
        return id;
      },

      removeProfile: (id) =>
        set((s) => {
          if (Object.keys(s.profiles).length <= 1) return s; // keep at least one
          const rest = { ...s.profiles };
          delete rest[id];
          const activeId = s.activeId === id ? Object.keys(rest)[0] : s.activeId;
          return { profiles: rest, activeId };
        }),

      resetDemo: () => {
        const fresh = makeDemoTeam();
        set((s) => ({ profiles: { ...s.profiles, [fresh.id]: fresh }, activeId: fresh.id }));
      },
    }),
    {
      name: "sof-teams-v1",
      version: 1,
    },
  ),
);

export const useActiveTeam = (): TeamProfile =>
  useTeamStore((s) => s.profiles[s.activeId] ?? Object.values(s.profiles)[0]);
