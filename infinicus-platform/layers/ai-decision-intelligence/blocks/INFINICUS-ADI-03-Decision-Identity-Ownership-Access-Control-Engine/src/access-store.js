import { SYSTEM_ROLES, PERMISSIONS } from "./constants.js";

const scopeKey = (tenantId, businessId, subjectId) => `${tenantId}::${businessId}::${subjectId}`;
const denyKey = (tenantId, businessId, subjectId, permission) => `${scopeKey(tenantId,businessId,subjectId)}::${permission}`;

export function createAccessStore() {
  const roles = new Map(Object.entries(SYSTEM_ROLES).map(([id, permissions]) => [id, Object.freeze([...permissions])]));
  const assignments = new Map();
  const owners = new Map();
  const denies = new Set();

  return Object.freeze({
    registerRole(roleId, permissions) {
      if (!roleId || roles.has(roleId) || !Array.isArray(permissions) || permissions.some(item => !PERMISSIONS.includes(item))) return false;
      roles.set(roleId, Object.freeze([...new Set(permissions)])); return true;
    },
    assignRole({tenantId,businessId,subjectId,roleId}) {
      if (!roles.has(roleId) || !tenantId || !businessId || !subjectId) return false;
      const key = scopeKey(tenantId,businessId,subjectId); const set = assignments.get(key) ?? new Set();
      set.add(roleId); assignments.set(key,set); return true;
    },
    rolesFor({tenantId,businessId,subjectId}) { return [...(assignments.get(scopeKey(tenantId,businessId,subjectId)) ?? [])]; },
    permissionsFor(subject) {
      return [...new Set(this.rolesFor(subject).flatMap(roleId => roles.get(roleId) ?? []))];
    },
    setOwner(resourceId, subjectId) { if (!resourceId || !subjectId) return false; owners.set(resourceId,subjectId); return true; },
    ownerOf(resourceId) { return owners.get(resourceId) ?? null; },
    deny({tenantId,businessId,subjectId,permission}) { denies.add(denyKey(tenantId,businessId,subjectId,permission)); },
    isDenied({tenantId,businessId,subjectId}, permission) { return denies.has(denyKey(tenantId,businessId,subjectId,permission)); },
    listRoles() { return [...roles].map(([roleId,permissions]) => ({roleId,permissions:[...permissions]})); }
  });
}
