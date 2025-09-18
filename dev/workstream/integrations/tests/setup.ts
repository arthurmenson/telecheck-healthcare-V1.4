beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  delete process.env.NODE_ENV;
});