import FiscalSDK from "../src/index";

describe("SDKConfig timeout", () => {
  it("defaults to 1000 ms when timeout is not provided", () => {
    const sdk = new FiscalSDK({ host: "http://localhost:4000" });
    expect(sdk.axios.defaults.timeout).toBe(1000);
  });

  it("uses the provided timeout when set", () => {
    const sdk = new FiscalSDK({
      host: "http://localhost:4000",
      timeout: 30_000,
    });
    expect(sdk.axios.defaults.timeout).toBe(30_000);
  });

  it("treats explicit 0 as 'no timeout' (axios convention)", () => {
    const sdk = new FiscalSDK({ host: "http://localhost:4000", timeout: 0 });
    expect(sdk.axios.defaults.timeout).toBe(0);
  });
});
