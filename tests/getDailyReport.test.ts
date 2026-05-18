import { rest } from "msw";
import { setupServer } from "msw/node";
import FiscalSDK from "../src/index";

const fiscal = new FiscalSDK({ host: "http://localhost:4000" });

const historicalZResponseXml = `<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori>
    <Odgovor><Naziv>zNumber</Naziv><Vrijednost xsi:type="xsd:decimal">50</Vrijednost></Odgovor>
    <Odgovor><Naziv>Services</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>Taxes</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>Resets</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>firstBF</Naziv><Vrijednost xsi:type="xsd:decimal">47</Vrijednost></Odgovor>
    <Odgovor><Naziv>lastBF</Naziv><Vrijednost xsi:type="xsd:decimal">47</Vrijednost></Odgovor>
    <Odgovor><Naziv>firstRF</Naziv><Vrijednost xsi:type="xsd:decimal">1</Vrijednost></Odgovor>
    <Odgovor><Naziv>lastRF</Naziv><Vrijednost xsi:type="xsd:decimal">1</Vrijednost></Odgovor>
    <Odgovor><Naziv>TE</Naziv><Vrijednost xsi:type="xsd:decimal">3.71</Vrijednost></Odgovor>
    <Odgovor><Naziv>ZE</Naziv><Vrijednost xsi:type="xsd:decimal">4.34</Vrijednost></Odgovor>
    <Odgovor><Naziv>EA</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>Datum</Naziv><Vrijednost xsi:type="xsd:dateTime">2025-09-09T10:01:00</Vrijednost></Odgovor>
    <Odgovor><Naziv>TotalServices</Naziv><Vrijednost xsi:type="xsd:decimal">2</Vrijednost></Odgovor>
    <Odgovor><Naziv>TotalTaxes</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>TotalResets</Naziv><Vrijednost xsi:type="xsd:decimal">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>fw_version</Naziv><Vrijednost xsi:type="xsd:string">2026-02-14_v1.0.125+7661270</Vrijednost></Odgovor>
  </Odgovori>
  <VrstaOdgovora>OK</VrstaOdgovora>
</KasaOdgovor>`;

describe("getDailyReport", () => {
  describe("with a valid BrojDI", () => {
    let lastBody: string;
    const server = setupServer(
      rest.post<string>("http://localhost:4000/oi", async (_req, res, ctx) =>
        res(ctx.set("Content-Type", "text/xml"), ctx.body(historicalZResponseXml))
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

    it("sends BrojDI in the request body", async () => {
      await fiscal.getDailyReport({ brojDI: 50 });
      expect(lastBody).toContain("<Naziv>BrojDI</Naziv>");
      expect(lastBody).toContain("<Vrijednost>50</Vrijednost>");
    });

    it("parses the older-style mixed-case fields", async () => {
      const r = await fiscal.getDailyReport({ brojDI: 50 });
      expect(r.zNumber).toBe(50);
      expect(r.firstBF).toBe(47);
      expect(r.lastBF).toBe(47);
      expect(r.saleTE).toBe(3.71);
      expect(r.saleZE).toBe(4.34);
      expect(r.currentDateTime).toEqual(new Date("2025-09-09T10:01:00"));
      expect(r.totalServices).toBe(2);
      expect(r.fwVersion).toBe("2026-02-14_v1.0.125+7661270");
    });
  });
});
