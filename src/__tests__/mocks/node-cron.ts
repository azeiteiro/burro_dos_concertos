const schedule = jest.fn(() => ({
  stop: jest.fn(),
}));

export default { schedule };
export { schedule };
