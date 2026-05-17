import * as fs from "fs";
import * as path from "path";
import { rest } from "msw";
import { setupServer } from "msw/node";
import FiscalSDK from "../src/index";

const fiscal = new FiscalSDK({ host: "http://localhost:4000" });

const docsResponseXml = `<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori>
    <Odgovor><Naziv>current_datetime</Naziv><Vrijednost xsi:type="xsd:dateTime">2023-10-03T07:53:18</Vrijednost></Odgovor>
    <Odgovor><Naziv>ibfm</Naziv><Vrijednost xsi:type="xsd:string">AL901930</Vrijednost></Odgovor>
    <Odgovor><Naziv>first_BF</Naziv><Vrijednost xsi:type="xsd:unsignedInt">2</Vrijednost></Odgovor>
    <Odgovor><Naziv>last_BF</Naziv><Vrijednost xsi:type="xsd:unsignedInt">2</Vrijednost></Odgovor>
    <Odgovor><Naziv>first_RF</Naziv><Vrijednost xsi:type="xsd:unsignedInt">2</Vrijednost></Odgovor>
    <Odgovor><Naziv>last_RF</Naziv><Vrijednost xsi:type="xsd:unsignedInt">3</Vrijednost></Odgovor>
    <Odgovor><Naziv>cash</Naziv><Vrijednost xsi:type="xsd:double">136.35</Vrijednost></Odgovor>
    <Odgovor><Naziv>check</Naziv><Vrijednost xsi:type="xsd:double">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>card</Naziv><Vrijednost xsi:type="xsd:double">10</Vrijednost></Odgovor>
    <Odgovor><Naziv>transfer_order</Naziv><Vrijednost xsi:type="xsd:double">110</Vrijednost></Odgovor>
    <Odgovor><Naziv>z_number</Naziv><Vrijednost xsi:type="xsd:unsignedShort">3</Vrijednost></Odgovor>
    <Odgovor><Naziv>services</Naziv><Vrijednost xsi:type="xsd:unsignedByte">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>resets</Naziv><Vrijednost xsi:type="xsd:unsignedByte">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>tax_changes</Naziv><Vrijednost xsi:type="xsd:unsignedByte">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>sale_TE</Naziv><Vrijednost xsi:type="xsd:double">100</Vrijednost></Odgovor>
    <Odgovor><Naziv>sale_ZE</Naziv><Vrijednost xsi:type="xsd:double">17</Vrijednost></Odgovor>
    <Odgovor><Naziv>canceled_sale_EA</Naziv><Vrijednost xsi:type="xsd:unsignedInt">0</Vrijednost></Odgovor>
    <Odgovor><Naziv>reclaimed_sale_ET</Naziv><Vrijednost xsi:type="xsd:double">10.33</Vrijednost></Odgovor>
    <Odgovor><Naziv>reclaimed_sale_EZ</Naziv><Vrijednost xsi:type="xsd:double">1.5</Vrijednost></Odgovor>
    <Odgovor><Naziv>canceled_reclaimed_sale_RA</Naziv><Vrijednost xsi:type="xsd:unsignedInt">1</Vrijednost></Odgovor>
    <Odgovor><Naziv>tax_e</Naziv><Vrijednost xsi:type="xsd:short">1700</Vrijednost></Odgovor>
    <Odgovor><Naziv>fw_version</Naziv><Vrijednost xsi:type="xsd:string">2023-03-22_v1.0.91+4d59281</Vrijednost></Odgovor>
    <Odgovor><Naziv>last_inspection_date</Naziv><Vrijednost xsi:type="xsd:dateTime">2023-09-27T15:41:00</Vrijednost></Odgovor>
    <Odgovor><Naziv>last_transfer_date</Naziv><Vrijednost xsi:type="xsd:dateTime">2023-09-28T13:33:00</Vrijednost></Odgovor>
  </Odgovori>
  <VrstaOdgovora>OK</VrstaOdgovora>
</KasaOdgovor>`;

const xmlExamplesFixture = fs.readFileSync(
  path.join(__dirname, "../xml_examples/odgovori_response/oi.di.xml"),
  "utf-8"
);

describe("getDailyReport", () => {
  describe("with newer-firmware (snake_case) response from docs", () => {
    let lastBody: string;
    const server = setupServer(
      rest.post<string>(
        "http://localhost:4000/oi.di.xml",
        async (_req, res, ctx) =>
          res(ctx.set("Content-Type", "text/xml"), ctx.body(docsResponseXml))
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

    it("sends Zahtjev with BrojDI parameter", async () => {
      await fiscal.getDailyReport({ brojDI: 1235 });
      expect(lastBody).toMatchSnapshot();
    });

    it("returns a populated FiscalSummary", async () => {
      const r = await fiscal.getDailyReport({ brojDI: 3 });
      expect(r.ibfm).toBe("AL901930");
      expect(r.zNumber).toBe(3);
      expect(r.cash).toBe(136.35);
      expect(r.card).toBe(10);
      expect(r.transferOrder).toBe(110);
      expect(r.saleTE).toBe(100);
      expect(r.saleZE).toBe(17);
      expect(r.reclaimedSaleET).toBe(10.33);
      expect(r.taxE).toBe(1700);
      expect(r.currentDateTime).toEqual(new Date("2023-10-03T07:53:18"));
    });
  });

  describe("with older-firmware (mixed-case) response from xml_examples", () => {
    const server = setupServer(
      rest.post<string>(
        "http://localhost:4000/oi.di.xml",
        async (_req, res, ctx) =>
          res(ctx.set("Content-Type", "text/xml"), ctx.body(xmlExamplesFixture))
      )
    );

    beforeAll(() => server.listen());
    afterAll(() => server.close());
    afterEach(() => server.resetHandlers());

    it("returns a populated FiscalSummary", async () => {
      const r = await fiscal.getDailyReport({ brojDI: 1235 });
      expect(r.zNumber).toBe(1235);
      expect(r.firstBF).toBe(286340);
      expect(r.lastBF).toBe(286356);
      expect(r.firstRF).toBe(10974);
      expect(r.lastRF).toBe(10976);
      expect(r.saleTE).toBe(12188);
      expect(r.saleZE).toBe(2358.96);
      expect(r.reclaimedSaleET).toBe(1291);
      expect(r.reclaimedSaleEZ).toBe(249.87);
      expect(r.canceledSaleEA).toBe(493);
      expect(r.canceledReclaimedSaleRA).toBe(52);
      expect(r.totalTaxes).toBe(23);
      expect(r.currentDateTime).toEqual(new Date("2021-03-06T23:19:00"));
      expect(r.fwVersion).toBe("v0.1.8+0977f88.dirty");

      // newer-firmware-only fields absent
      expect(r.ibfm).toBeUndefined();
      expect(r.cash).toBeUndefined();
      expect(r.taxE).toBeUndefined();
    });
  });

  describe("on Greska response", () => {
    const server = setupServer(
      rest.post<string>(
        "http://localhost:4000/oi.di.xml",
        async (_req, res, ctx) =>
          res(
            ctx.set("Content-Type", "text/xml"),
            ctx.body(`<?xml version="1.0" encoding="utf-8"?>
<KasaOdgovor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Odgovori>
    <Odgovor><Naziv>ElektronskiDnevniIzvjestaj</Naziv><Vrijednost xsi:type="xsd:string">ERROR_NO_SUCH_DI</Vrijednost></Odgovor>
  </Odgovori>
  <VrstaOdgovora>Greska</VrstaOdgovora>
</KasaOdgovor>`)
          )
      )
    );

    beforeAll(() => server.listen());
    afterAll(() => server.close());
    afterEach(() => server.resetHandlers());

    it("throws with the parsed Odgovori dump", async () => {
      await expect(
        fiscal.getDailyReport({ brojDI: 99999 })
      ).rejects.toThrowError(
        /ElektronskiDnevniIzvjestaj failed:.*ERROR_NO_SUCH_DI/
      );
    });
  });
});
