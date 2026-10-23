import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const sql = readFileSync('drizzle/migrations/0000_account_profiles_and_roles.sql', 'utf8');
describe('Account permissions', () => {
  it('limits profile reads and writes to their owner', () => {
    expect(sql).toMatch(/FOR SELECT TO authenticated USING \(id = auth.uid\(\)\)/);
    expect(sql).toMatch(/FOR UPDATE TO authenticated USING \(id = auth.uid\(\)\) WITH CHECK \(id = auth.uid\(\)\)/);
  });
  it('allows editing personal fields but not institution assignment', () => {
    expect(sql).toContain('GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated');
    expect(sql).not.toMatch(/GRANT UPDATE ON public.profiles TO authenticated/);
  });
  it('assigns student safely without accepting a signup role', () => {
    expect(sql).toContain("VALUES (NEW.id, 'student')");
    expect(sql).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/);
    expect(sql).toContain('GRANT SELECT ON public.user_roles TO authenticated');
    expect(sql).not.toMatch(/GRANT (?:ALL|INSERT|UPDATE).*public.user_roles TO authenticated/);
  });
});