import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

/**
 * Password hashing wrapper. bcrypt cost factor 12 is frozen by policy
 * (docs/05 DEC-012, Master Spec §32). bcryptjs is a pure-JS, hash-compatible
 * implementation chosen to avoid native-build fragility — the algorithm and
 * cost are unchanged.
 */
@Injectable()
export class PasswordService {
  private readonly cost = 12;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
