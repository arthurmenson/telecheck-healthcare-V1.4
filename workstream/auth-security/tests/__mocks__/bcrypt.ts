export default {
  hash: jest.fn((password: string, rounds: number) => Promise.resolve(`hashed_${password}`)),
  compare: jest.fn((password: string, hash: string) => {
    return Promise.resolve(hash === `hashed_${password}`);
  }),
  genSalt: jest.fn((rounds: number) => Promise.resolve('salt')),
  hashSync: jest.fn((password: string, rounds: number) => `hashed_${password}`),
  compareSync: jest.fn((password: string, hash: string) => hash === `hashed_${password}`)
};