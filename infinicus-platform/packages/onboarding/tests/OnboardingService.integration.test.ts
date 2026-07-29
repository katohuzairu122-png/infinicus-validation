/**
 * Live PostgreSQL 16 integration tests for OnboardingService, exercising
 * the full begin -> business -> owner -> settings -> invitations -> complete
 * wizard flow, plus resume/retry and idempotency behaviour (BUILD-19).
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createPool, closePool, UserRepository,
  TenantSlugConflictError, OnboardingStepOrderError,
} from '@infinicus/database';
import { AuthorizationService } from '@infinicus/authorization';
import { OnboardingService } from '../src/OnboardingService.js';

const run = !!process.env.DATABASE_URL;

function uniqueSlug(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@onboarding-svc-test.example`;
}

describe.runIf(run)('OnboardingService — live PostgreSQL', () => {
  const users = new UserRepository();
  const onboarding = new OnboardingService();
  const authz = new AuthorizationService();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  async function createActiveUser() {
    const user = await users.createUser({ email: uniqueEmail('svc-user'), passwordHash: '$2a$12$fixturefixturefixturefixturefixturefixture' });
    return users.activate(user.id);
  }

  describe('full wizard flow', () => {
    it('walks tenant -> workspace -> business -> owner -> settings -> invitations -> completed', async () => {
      const user = await createActiveUser();
      const { tenant, workspace, progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Wizard Co', tenantSlug: uniqueSlug('wizard'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('wizard-ws'),
      });
      expect(tenant.status).toBe('trial');
      expect(workspace.tenantId).toBe(tenant.id);
      expect(started.currentStep).toBe('workspace_created');

      const { business, progress: afterBusiness } = await onboarding.setBusiness(ctx, started.id, {
        legalName: 'Wizard Trading LLC', businessCode: uniqueSlug('wizbiz'), industry: 'software',
      });
      expect(business.industry).toBe('software');
      expect(afterBusiness.currentStep).toBe('business_created');

      const { membership, progress: afterOwner } = await onboarding.assignOwner(ctx, started.id);
      expect(membership.userId).toBe(user.id);
      expect(membership.status).toBe('active');
      expect(afterOwner.currentStep).toBe('owner_assigned');
      await expect(authz.hasPermission(ctx, 'platform:admin')).resolves.toBe(true);

      const { settings, progress: afterSettings } = await onboarding.applyDefaultSettings(ctx, started.id);
      expect(settings.length).toBeGreaterThan(0);
      expect(afterSettings.currentStep).toBe('settings_applied');

      const inviteeEmail = uniqueEmail('teammate');
      const { invitations, progress: afterInvitations } = await onboarding.inviteTeamMembers(ctx, started.id, [inviteeEmail]);
      expect(invitations).toHaveLength(1);
      expect(invitations[0].invitation.email.toLowerCase()).toBe(inviteeEmail.toLowerCase());
      expect(afterInvitations.currentStep).toBe('invitations_sent');

      const completed = await onboarding.completeOnboarding(ctx, started.id);
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).not.toBeNull();
    });

    it('allows skipping team invitations with an empty list and still completes', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Solo Co', tenantSlug: uniqueSlug('solo'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('solo-ws'),
      });
      await onboarding.setBusiness(ctx, started.id, { legalName: 'Solo LLC', businessCode: uniqueSlug('solobiz') });
      await onboarding.assignOwner(ctx, started.id);
      await onboarding.applyDefaultSettings(ctx, started.id);
      const { invitations } = await onboarding.inviteTeamMembers(ctx, started.id, []);
      expect(invitations).toHaveLength(0);
      const completed = await onboarding.completeOnboarding(ctx, started.id);
      expect(completed.status).toBe('completed');
    });
  });

  describe('resume / retry behaviour', () => {
    it('resumeOnboarding finds an in-progress attempt for the initiating user', async () => {
      const user = await createActiveUser();
      const { progress: started } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Resume Co', tenantSlug: uniqueSlug('resume'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('resume-ws'),
      });
      const resumed = await onboarding.resumeOnboarding(user.id);
      expect(resumed?.id).toBe(started.id);
    });

    it('resumeOnboarding returns null once onboarding has completed', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Done Co', tenantSlug: uniqueSlug('done'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('done-ws'),
      });
      await onboarding.setBusiness(ctx, started.id, { legalName: 'Done LLC', businessCode: uniqueSlug('donebiz') });
      await onboarding.assignOwner(ctx, started.id);
      await onboarding.applyDefaultSettings(ctx, started.id);
      await onboarding.inviteTeamMembers(ctx, started.id, []);
      await onboarding.completeOnboarding(ctx, started.id);
      const resumed = await onboarding.resumeOnboarding(user.id);
      expect(resumed).toBeNull();
    });

    it('abandonOnboarding clears the active attempt so resumeOnboarding returns null', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Abandon Co', tenantSlug: uniqueSlug('abandon'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('abandon-ws'),
      });
      const abandoned = await onboarding.abandonOnboarding(ctx, started.id);
      expect(abandoned.status).toBe('abandoned');
      const resumed = await onboarding.resumeOnboarding(user.id);
      expect(resumed).toBeNull();
    });

    it('a new beginOnboarding after abandoning creates an entirely new tenant', async () => {
      const user = await createActiveUser();
      const { progress: first, ctx: ctx1 } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Retry Co v1', tenantSlug: uniqueSlug('retry1'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('retry1-ws'),
      });
      await onboarding.abandonOnboarding(ctx1, first.id);
      const { tenant: secondTenant, progress: second } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Retry Co v2', tenantSlug: uniqueSlug('retry2'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('retry2-ws'),
      });
      expect(second.id).not.toBe(first.id);
      expect(secondTenant.id).not.toBe(ctx1.tenantId);
    });
  });

  describe('idempotency', () => {
    it('setBusiness called twice does not create a second business row', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Idem Biz Co', tenantSlug: uniqueSlug('idembiz'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('idembiz-ws'),
      });
      const input = { legalName: 'Idem LLC', businessCode: uniqueSlug('idembizcode') };
      const first = await onboarding.setBusiness(ctx, started.id, input);
      const second = await onboarding.setBusiness(ctx, started.id, input);
      expect(second.business.id).toBe(first.business.id);
    });

    it('assignOwner called twice returns the same membership, not a second one', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Idem Owner Co', tenantSlug: uniqueSlug('idemowner'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('idemowner-ws'),
      });
      await onboarding.setBusiness(ctx, started.id, { legalName: 'Idem Owner LLC', businessCode: uniqueSlug('idemownercode') });
      const first = await onboarding.assignOwner(ctx, started.id);
      const second = await onboarding.assignOwner(ctx, started.id);
      expect(second.membership.id).toBe(first.membership.id);
    });

    it('inviteTeamMembers does not re-invite an email that is already pending', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Idem Invite Co', tenantSlug: uniqueSlug('ideminv'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('ideminv-ws'),
      });
      await onboarding.setBusiness(ctx, started.id, { legalName: 'Idem Invite LLC', businessCode: uniqueSlug('idemcode') });
      await onboarding.assignOwner(ctx, started.id);
      await onboarding.applyDefaultSettings(ctx, started.id);
      const email = uniqueEmail('repeat-invitee');
      const first = await onboarding.inviteTeamMembers(ctx, started.id, [email]);
      expect(first.invitations).toHaveLength(1);
      const second = await onboarding.inviteTeamMembers(ctx, started.id, [email]);
      expect(second.invitations).toHaveLength(0);
    });
  });

  describe('failure paths', () => {
    it('beginOnboarding rejects a tenant slug that is already taken', async () => {
      const user = await createActiveUser();
      const slug = uniqueSlug('taken');
      await onboarding.beginOnboarding(user.id, {
        tenantName: 'First Taker', tenantSlug: slug, workspaceName: 'Main', workspaceSlug: uniqueSlug('taken-ws1'),
      });
      await expect(onboarding.beginOnboarding(user.id, {
        tenantName: 'Second Taker', tenantSlug: slug, workspaceName: 'Main', workspaceSlug: uniqueSlug('taken-ws2'),
      })).rejects.toBeInstanceOf(TenantSlugConflictError);
    });

    it('assignOwner before setBusiness throws OnboardingStepOrderError', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Out Of Order Co', tenantSlug: uniqueSlug('ooo'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('ooo-ws'),
      });
      await expect(onboarding.assignOwner(ctx, started.id)).rejects.toBeInstanceOf(OnboardingStepOrderError);
    });

    it('completeOnboarding before invitations_sent throws OnboardingStepOrderError', async () => {
      const user = await createActiveUser();
      const { progress: started, ctx } = await onboarding.beginOnboarding(user.id, {
        tenantName: 'Early Complete Co', tenantSlug: uniqueSlug('early'),
        workspaceName: 'Main', workspaceSlug: uniqueSlug('early-ws'),
      });
      await onboarding.setBusiness(ctx, started.id, { legalName: 'Early LLC', businessCode: uniqueSlug('earlycode') });
      await onboarding.assignOwner(ctx, started.id);
      await expect(onboarding.completeOnboarding(ctx, started.id)).rejects.toBeInstanceOf(OnboardingStepOrderError);
    });
  });
});

describe.skipIf(run)('OnboardingService — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
