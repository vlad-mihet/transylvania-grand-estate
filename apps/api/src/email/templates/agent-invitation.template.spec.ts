import { renderAgentInvitation } from './agent-invitation.template';

/**
 * Regression for BUG-120 (2026-07 sweep): platform-user (ADMIN/EDITOR) invites
 * reused the agent template verbatim, telling staff they were joining "as a
 * real estate agent". The `roleKind` param now drives role-appropriate intro
 * copy while agent invites keep their wording.
 */
describe('renderAgentInvitation — roleKind copy', () => {
  const base = {
    firstName: 'Ana',
    acceptUrl: 'https://admin.test/accept-invite?token=x',
    expiresAt: new Date('2026-08-01T00:00:00Z'),
    invitedByName: 'Admin User',
  };

  it("agent invite keeps 'real estate agent' wording (en)", () => {
    const { text } = renderAgentInvitation({
      ...base,
      locale: 'en',
      roleKind: 'agent',
    });
    expect(text).toContain('as a real estate agent');
    expect(text).not.toContain('the TGE team.');
  });

  it("staff invite drops the agent wording (en)", () => {
    const { text } = renderAgentInvitation({
      ...base,
      locale: 'en',
      roleKind: 'staff',
    });
    expect(text).toContain('join the TGE team');
    expect(text).not.toContain('as a real estate agent');
  });

  it("staff invite drops 'agent imobiliar' (ro)", () => {
    const { html, text } = renderAgentInvitation({
      ...base,
      locale: 'ro',
      roleKind: 'staff',
    });
    expect(text).toContain('echipei TGE');
    expect(text).not.toContain('agent imobiliar');
    expect(html).not.toContain('agent imobiliar');
  });

  it('defaults to agent copy when roleKind is omitted (back-compat)', () => {
    const { text } = renderAgentInvitation({ ...base, locale: 'ro' });
    expect(text).toContain('agent imobiliar');
  });
});
