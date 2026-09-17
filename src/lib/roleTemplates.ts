// Role capability templates (spec §29). Pre-populate a member's capability
// contribution; users may override. Values are 0..5 per dimension.

import type { CapabilityId } from "@/lib/capabilities";

export interface RoleTemplate {
  role: string;
  defaults: Partial<Record<CapabilityId, number>>;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  { role: "Game Designer", defaults: { systemsDesign: 4, uxui: 3, gameplaySystems: 2 } },
  { role: "Gameplay Programmer", defaults: { gameplaySystems: 4, procedural: 3, optimization: 3 } },
  { role: "Network Engineer", defaults: { networking: 5, backend: 4, optimization: 3 } },
  { role: "Backend Engineer", defaults: { backend: 5, liveops: 3, optimization: 2 } },
  { role: "3D Artist", defaults: { art3d: 5, animationVfx: 2 } },
  { role: "2D Artist", defaults: { art2d: 5, uxui: 3 } },
  { role: "Technical Artist", defaults: { art3d: 3, animationVfx: 3, optimization: 3 } },
  { role: "Animator", defaults: { animationVfx: 5, art3d: 2 } },
  { role: "UX Designer", defaults: { uxui: 5, systemsDesign: 2 } },
  { role: "Writer", defaults: { narrative: 5 } },
  { role: "Producer", defaults: { qa: 3, liveops: 2, uxui: 1 } },
  { role: "Audio Designer", defaults: { audio: 5 } },
  { role: "Level Designer", defaults: { levelContent: 5, gameplaySystems: 2 } },
  { role: "QA Engineer", defaults: { qa: 5 } },
];

export const ROLE_NAMES = ROLE_TEMPLATES.map((r) => r.role);
