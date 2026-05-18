import { rest } from "msw";
import { setupServer } from "msw/node";
import FiscalSDK from "../src/index";

const fiscal = new FiscalSDK({ host: "http://localhost:4000" });

const okResponse = `<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori />
  <VrstaOdgovora>OK</VrstaOdgovora>
</KasaOdgovor>`;

describe("writeToDisplay", () => {
  let lastBody: string;
  const server = setupServer(
    rest.post<string>(
      "http://localhost:4000/upisinadisplej2",
      async (_req, res, ctx) =>
        res(ctx.set("Content-Type", "text/xml"), ctx.body(okResponse))
    )
  );

  beforeAll(() => server.listen());
  afterAll(() => server.close());
  beforeEach(() => {
    server.events.on("request:start", async (req) => {
      lastBody = await req.text();
    });
  });
  afterEach(() => {
    server.resetHandlers();
    lastBody = "";
    server.events.removeAllListeners("request:start");
  });

  it("sends linija1 and linija2 in the body", async () => {
    await fiscal.writeToDisplay({ line1: "HELLO", line2: "WORLD" });
    expect(lastBody).toContain("<Naziv>linija1</Naziv>");
    expect(lastBody).toContain("<Vrijednost>HELLO</Vrijednost>");
    expect(lastBody).toContain("<Naziv>linija2</Naziv>");
    expect(lastBody).toContain("<Vrijednost>WORLD</Vrijednost>");
  });

  it("defaults missing lines to empty string", async () => {
    await fiscal.writeToDisplay({ line1: "TOP" });
    expect(lastBody).toContain("<Vrijednost>TOP</Vrijednost>");
    expect(lastBody).toMatch(
      /<Naziv>linija2<\/Naziv>\s*<Vrijednost><\/Vrijednost>/
    );
  });

  it("works with no arguments (clears display)", async () => {
    await expect(fiscal.writeToDisplay()).resolves.toBeUndefined();
  });
});
