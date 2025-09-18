jest.mock('bcrypt', () => ({
  hash: jest.fn((password: string, _rounds: number) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password: string, hash: string) => {
    return Promise.resolve(hash === `hashed_${password}`);
  }),
  genSalt: jest.fn((_rounds: number) => Promise.resolve('salt')),
  hashSync: jest.fn((password: string, _rounds: number) => `hashed_${password}`),
  compareSync: jest.fn((password: string, hash: string) => hash === `hashed_${password}`)
}));

beforeAll(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['JWT_SECRET'] = 'test-jwt-secret-key-for-testing-only';
  process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret-key-for-testing-only';
  process.env['REDIS_URL'] = 'redis://localhost:6379/1';
});

afterAll(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllMocks();
});