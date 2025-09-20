import Dexie, { Table } from 'dexie';

export type UserRole = 'admin' | 'doctor' | 'assistant' | 'reception';

export type UserStatus = 'active' | 'invited' | 'disabled';

export interface AuthUser {
  id?: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  needsPasswordSetup: boolean;
  displayName?: string;
  status: UserStatus;
}

class AuthDatabase extends Dexie {
  public users!: Table<AuthUser, number>;

  constructor() {
    super('dentalPortalAuth');
    this.version(1).stores({
      users: '++id, email',
    });
    this.version(2)
      .stores({
      users: '++id, email',
      })
      .upgrade((transaction) =>
        transaction
          .table('users')
          .toCollection()
          .modify((user: Partial<AuthUser>) => {
            if (!('status' in user)) {
              user.status = user.needsPasswordSetup ? 'invited' : 'active';
            }
          }),
      );
  }
}

export const authDb = new AuthDatabase();

const ADMIN_EMAIL = 'crack-angel@yandex.ru';

const initializeAuthDb = (async () => {
  await authDb.open();

  const admin = await authDb.users.where('email').equals(ADMIN_EMAIL).first();
  if (!admin) {
    await authDb.users.add({
      email: ADMIN_EMAIL,
      passwordHash: '',
      role: 'admin',
      needsPasswordSetup: true,
      displayName: 'Администратор',
      status: 'invited',
    });
  }
})();

export const authDbReady = initializeAuthDb;
