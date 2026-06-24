import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/database.service';
import { LoginDto, SignupDto } from './dto';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  password_hash?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.db.query<UserRow>(
      'select id from public.users where email = $1 limit 1',
      [dto.email],
    );
    if (existing.rowCount) {
      throw new ConflictException({
        code: 'VALIDATION_ERROR',
        message: '이미 가입된 이메일입니다.',
      });
    }

    const userId = await this.createUserId();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.ensurePasswordColumn();
    await this.db.query(
      'insert into public.users (id, email, name, password_hash) values ($1, $2, $3, $4)',
      [userId, dto.email, dto.name, passwordHash],
    );

    return {
      user_id: userId,
      access_token: this.sign(userId, dto.email),
    };
  }

  async login(dto: LoginDto) {
    await this.ensurePasswordColumn();
    const result = await this.db.query<UserRow>(
      'select id, email, name, password_hash from public.users where email = $1 limit 1',
      [dto.email],
    );
    const user = result.rows[0];
    const ok =
      user?.password_hash &&
      (await bcrypt.compare(dto.password, user.password_hash));

    if (!ok) {
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      });
    }

    return {
      user_id: user.id,
      access_token: this.sign(user.id, user.email),
    };
  }

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  private async createUserId() {
    for (let i = 0; i < 20; i += 1) {
      const id = `fit${Math.random().toString(36).slice(2, 8)}`.slice(0, 9);
      const existing = await this.db.query('select 1 from public.users where id = $1', [
        id,
      ]);
      if (!existing.rowCount) return id;
    }
    return Math.random().toString(36).slice(2, 10);
  }

  private async ensurePasswordColumn() {
    await this.db.query(
      'alter table public.users add column if not exists password_hash text',
    );
  }
}
