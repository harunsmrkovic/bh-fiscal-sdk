import { rest } from "msw";
import { setupServer } from "msw/node";
import FiscalSDK from "../src/index";

const fiscal = new FiscalSDK({ host: "http://localhost:4000" });

const okResponse = `<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori />
  <VrstaOdgovora>OK</VrstaOdgovora>
</KasaOdgovor>`;

const errorResponse = `<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori>
    <Odgovor>
      <Naziv>Greska</Naziv>
      <Vrijednost xsi:type="xsd:string">ERROR_INVALID_PAYMENT_TYPE</Vrijednost>
    </Odgovor>
  </Odgovori>
  <VrstaOdgovora>Greska</VrstaOdgovora>
</KasaOdgovor>`;

describe("depositMoney / withdrawMoney", () => {
  let lastBody: string;
  let lastUrl: string;

  const server = setupServer(
    rest.post<string>(
      "http://localhost:4000/unosnovca",
      async (_req, res, ctx) =>
        res(ctx.set("Content-Type", "text/xml"), ctx.body(okResponse))
    ),
    rest.post<string>(
      "http://localhost:4000/povratnovca",
      async (_req, res, ctx) =>
        res(ctx.set("Content-Type", "text/xml"), ctx.body(okResponse))
    )
  );

  beforeAll(() => server.listen());
  afterAll(() => server.close());
  beforeEach(() => {
    server.events.on("request:start", async (req) => {
      lastBody = await req.text();
      lastUrl = req.url.toString();
    });
  });
  afterEach(() => {
    server.resetHandlers();
    lastBody = "";
    lastUrl = "";
    server.events.removeAllListeners("request:start");
  });

  it("depositMoney posts to /unosnovca with VrstaZahtjeva=7", async () => {
    await fiscal.depositMoney({ type: "Virman", amount: 100 });
    expect(lastUrl).toBe("http://localhost:4000/unosnovca");
    expect(lastBody).toContain("<VrstaZahtjeva>7</VrstaZahtjeva>");
    expect(lastBody).toContain("<Oznaka>Virman</Oznaka>");
    expect(lastBody).toContain("<Iznos>100</Iznos>");
  });

  it("withdrawMoney posts to /povratnovca with VrstaZahtjeva=7", async () => {
    await fiscal.withdrawMoney({ type: "Gotovina", amount: 50.5 });
    expect(lastUrl).toBe("http://localhost:4000/povratnovca");
    expect(lastBody).toContain("<VrstaZahtjeva>7</VrstaZahtjeva>");
    expect(lastBody).toContain("<Oznaka>Gotovina</Oznaka>");
    expect(lastBody).toContain("<Iznos>50.5</Iznos>");
  });

  it("depositMoney throws when printer returns Greska", async () => {
    server.use(
      rest.post<string>(
        "http://localhost:4000/unosnovca",
        async (_req, res, ctx) =>
          res(ctx.set("Content-Type", "text/xml"), ctx.body(errorResponse))
      )
    );
    await expect(
      fiscal.depositMoney({ type: "Virman", amount: 100 })
    ).rejects.toThrow("UnosNovca failed");
  });

  it("withdrawMoney throws when printer returns Greska", async () => {
    server.use(
      rest.post<string>(
        "http://localhost:4000/povratnovca",
        async (_req, res, ctx) =>
          res(ctx.set("Content-Type", "text/xml"), ctx.body(errorResponse))
      )
    );
    await expect(
      fiscal.withdrawMoney({ type: "Virman", amount: 100 })
    ).rejects.toThrow("PovratNovca failed");
  });
});
