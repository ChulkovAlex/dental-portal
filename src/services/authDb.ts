import Dexie, { Table } from 'dexie';

export interface AuthUser {
  id?: number;
  email: string;
  passwordHash: string;
  role: string;
  needsPasswordSetup: boolean;
  name?: string;
}

class AuthDatabase extends Dexie {
  public users!: Table<AuthUser, number>;

  constructor() {
    super('dentalPortalAuth');
    this.version(1).stores({
      users: '++id, email',
    });
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
      name: 'Главный администратор',
    });
  }
})();

export const authDbReady = initializeAuthDb;
