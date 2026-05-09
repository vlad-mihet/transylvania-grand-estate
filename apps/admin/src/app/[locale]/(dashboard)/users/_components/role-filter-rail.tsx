"use client";

import { useTranslations } from "next-intl";
import {
  FilterCheckbox,
  FilterGroup,
  FilterRail,
} from "@/components/shared/filter-rail";
import type { AdminRole } from "@/lib/permissions";
import { ROLES, USER_STATUSES, type AdminUserStatus } from "./constants";

interface RoleFilterRailProps {
  selectedRoles: ReadonlyArray<AdminRole>;
  selectedStatuses: ReadonlyArray<AdminUserStatus>;
  onRoleToggle: (role: AdminRole) => void;
  onStatusToggle: (status: AdminUserStatus) => void;
  onClear: () => void;
}

/**
 * Left rail facets for /users. Two groups: role (SUPER_ADMIN/ADMIN/EDITOR/
 * AGENT) and status (ACTIVE/SUSPENDED). Selections multiplex into the
 * `useResourceList` extraParams as repeated `role`/`status` query params,
 * which the API parses as arrays via `arrayParam` in the Zod schema.
 */
export function UserFilterRail({
  selectedRoles,
  selectedStatuses,
  onRoleToggle,
  onStatusToggle,
  onClear,
}: RoleFilterRailProps) {
  const t = useTranslations("Users");
  const activeCount = selectedRoles.length + selectedStatuses.length;

  return (
    <FilterRail onClear={onClear} activeCount={activeCount}>
      <FilterGroup title={t("filterByRole")}>
        {ROLES.map((role) => (
          <FilterCheckbox
            key={role}
            label={role.replace(/_/g, " ")}
            checked={selectedRoles.includes(role)}
            onChange={() => onRoleToggle(role)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title={t("filterByStatus")}>
        {USER_STATUSES.map((status) => (
          <FilterCheckbox
            key={status}
            label={t(
              status === "ACTIVE" ? "statusActive" : "statusSuspended",
            )}
            checked={selectedStatuses.includes(status)}
            onChange={() => onStatusToggle(status)}
          />
        ))}
      </FilterGroup>
    </FilterRail>
  );
}
