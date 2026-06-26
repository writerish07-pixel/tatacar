import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes a password to a bcrypt string with cost factor 12', async () => {
    const hash = await service.hash('Sales@123');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(hash).not.toContain('Sales@123');
  });

  it('verifies a correct password', async () => {
    const hash = await service.hash('Gm@12345');
    await expect(service.compare('Gm@12345', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await service.hash('Gm@12345');
    await expect(service.compare('wrong-password', hash)).resolves.toBe(false);
  });
});
