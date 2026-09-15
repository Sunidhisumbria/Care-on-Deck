export const PERMISSIONS = {
  'appointments.read': 'View appointments',
  'appointments.create': 'Book an appointment on a patient behalf',
  'appointments.update': 'Reschedule or edit an appointment',
  'appointments.confirm': 'Confirm a requested appointment',
  'appointments.cancel': 'Cancel an appointment',
  'appointments.mark_no_show': 'Mark an appointment as a no-show',
  'patients.read': 'View patient records',
  'patients.read_phi': 'View full patient demographics and insurance',
  'patients.update': 'Edit patient records',
  'schedule.read': 'View schedules and availability',
  'schedule.update': 'Edit availability and templates',
  'schedule.hold': 'Place and release booking holds',
  'providers.read': 'View providers',
  'providers.manage': 'Add, edit and deactivate providers',
  'facilities.read': 'View facilities',
  'facilities.manage': 'Add and edit facilities',
  'reviews.read': 'View reviews',
  'reviews.respond': 'Reply to a review',
  'direct.read': 'View Direct pages and install status',
  'direct.manage': 'Configure Direct pages, branding and embeds',
  // Pulse -- IA: 9. Pulse
  'pulse.read': 'View campaigns and performance',
  'pulse.manage': 'Create and edit campaigns',
  'pulse.agencies.manage': 'Manage agency relationships',
  // Billing -- IA: 10. Billing
  'billing.read': 'View plans, invoices and usage',
  'billing.manage': 'Change plans, buy add-ons, update payment methods',

  // Reports -- IA: 13. Reports
  'reports.read': 'View reports',
  'reports.export': 'Export reports containing patient data',

  // Settings -- IA: 12. Settings
  'settings.read': 'View organization and facility settings',
  'settings.manage': 'Change organization and facility settings',
  'staff.read': 'View staff members',
  'staff.manage': 'Invite, edit and remove staff; assign roles',
  'roles.manage': 'Create roles and edit the permission matrix',

  // Control Center -- IA: 14. Internal staff only.
  'admin.access': 'Access Control Center',
  'admin.users.manage': 'Manage any user across the platform',
  'admin.approvals.decide': 'Approve or reject providers, facilities and photos',
  'admin.transfers.manage': 'Administer provider transfers',
  'admin.insurance.manage': 'Maintain the insurance directory',
  'admin.pricing.manage': 'Maintain pricing configuration',
  'admin.flags.manage': 'Toggle feature flags',
  'admin.audit.read': 'Read audit logs across tenants',
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

/**
 * System roles seeded on first migration. A tenant can define its own roles on
 * top of these, but cannot edit these.
 *
 * IA: 12. Settings > Roles
 */
export const SYSTEM_ROLES = {
  owner: {
    name: 'Owner',
    description: 'Full access to everything in the organization, including billing.',
    permissions: ALL_PERMISSIONS.filter((p) => !p.startsWith('admin.')),
  },
  office_manager: {
    name: 'Office Manager',
    description: 'Runs the practice day to day. No ownership transfer or role editing.',
    permissions: [
      'appointments.read', 'appointments.create', 'appointments.update',
      'appointments.confirm', 'appointments.cancel', 'appointments.mark_no_show',
      'patients.read', 'patients.read_phi', 'patients.update',
      'schedule.read', 'schedule.update', 'schedule.hold',
      'providers.read', 'providers.manage', 'facilities.read', 'facilities.manage',
      'reviews.read', 'reviews.respond',
      'direct.read', 'direct.manage', 'pulse.read', 'pulse.manage',
      'billing.read', 'reports.read', 'reports.export',
      'settings.read', 'settings.manage', 'staff.read', 'staff.manage',
    ] satisfies Permission[],
  },
  front_desk: {
    name: 'Front Desk',
    description: 'Books and manages appointments. Sees patient contact details, not billing.',
    permissions: [
      'appointments.read', 'appointments.create', 'appointments.update',
      'appointments.confirm', 'appointments.cancel', 'appointments.mark_no_show',
      'patients.read', 'patients.read_phi',
      'schedule.read', 'schedule.hold',
      'providers.read', 'facilities.read', 'reviews.read',
    ] satisfies Permission[],
  },
  provider: {
    name: 'Provider',
    description: 'A clinician viewing their own schedule and patients.',
    permissions: [
      'appointments.read', 'appointments.update', 'appointments.mark_no_show',
      'patients.read', 'patients.read_phi',
      'schedule.read', 'schedule.update',
      'providers.read', 'facilities.read', 'reviews.read', 'reviews.respond',
    ] satisfies Permission[],
  },
  billing_only: {
    name: 'Billing',
    description: 'Access to plans, invoices and usage. No patient data.',
    permissions: ['billing.read', 'billing.manage', 'reports.read'] satisfies Permission[],
  },
  read_only: {
    name: 'Read Only',
    description: 'Sees the dashboard and reports; changes nothing.',
    permissions: [
      'appointments.read', 'patients.read', 'schedule.read',
      'providers.read', 'facilities.read', 'reviews.read', 'reports.read',
    ] satisfies Permission[],
  },
  internal_admin: {
    name: 'CareOndeck Admin',
    description: 'Control Center staff.',
    permissions: ALL_PERMISSIONS,
  },
} as const satisfies Record<
  string,
  { name: string; description: string; permissions: readonly Permission[] }
>;

export type SystemRoleKey = keyof typeof SYSTEM_ROLES;
