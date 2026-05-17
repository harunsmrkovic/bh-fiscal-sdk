import axios, { AxiosInstance } from "axios";
import * as Mustache from "mustache";
import { format } from "date-fns";
import {
  FiscalSummary,
  GetDailyReportParams,
  PrintPeriodicalReportParams,
  PrintReceiptParams,
  ReceiptResult,
  SDKConfig,
} from "./types";
import xmlTemplates from "./templates";
import { XMLParser } from "fast-xml-parser";

const CLASSIC_DATE_FORMAT = `yyyy-MM-dd'T'hh:mm:ss`;

class FiscalSDK {
  axios: AxiosInstance;

  constructor(config: SDKConfig) {
    this.axios = axios.create({
      baseURL: config.host,
      timeout: 1000,
      headers: { "Content-Type": "text/xml" },
    });
  }

  private async request(command: string, data: string) {
    try {
      return await this.axios.post(command, data);
    } catch (error) {
      throw new Error("Failed to communicate with printer");
    }
  }

  private parseTemplate(fileName: string, params: object = {}) {
    if (!xmlTemplates[fileName]) {
      throw new Error("No such template");
    }

    return Mustache.render(xmlTemplates[fileName], params);
  }

  async printReceipt(params: PrintReceiptParams): Promise<ReceiptResult> {
    const response = await this.request(
      "stampatifiskalniracun",
      this.parseTemplate("stampatifiskalniracun", {
        ...params,
        date: format(params.date, CLASSIC_DATE_FORMAT),
      })
    );

    const parser = new XMLParser();
    const parsed = parser.parse(response.data);

    console.log(parsed);
    const responses: Record<string, string> = (
      [].concat(parsed.KasaOdgovor.Odgovori.Odgovor) as {
        Naziv: string;
        Vrijednost: string;
      }[]
    ).reduce(
      (acc, item) => ({
        ...acc,
        [item.Naziv]: item.Vrijednost,
      }),
      {}
    );

    if (parsed.KasaOdgovor.VrstaOdgovora === "OK") {
      return {
        id: +responses.BrojFiskalnogRacuna,
        date: responses.DatumFiskalnogRacuna,
        time: responses.VrijemeFiskalnogRacuna,
        amount: +responses.IznosFiskalnogRacuna,
      };
    } else {
      throw new Error(`Error: ${responses["Štampanje fiskalnog računa"]}`);
    }
  }

  async printPeriodicalReport(params: PrintPeriodicalReportParams) {
    await this.request(
      "stampatiperiodicniizvjestaj",
      this.parseTemplate("stampatiperiodicniizvjestaj", {
        ...params,
        startDate: format(params.startDate, CLASSIC_DATE_FORMAT),
        endDate: format(params.endDate, CLASSIC_DATE_FORMAT),
      })
    );
  }

  async printDailyReport() {
    await this.request(
      "stampatidnevniizvjestaj",
      this.parseTemplate("stampatidnevniizvjestaj")
    );
  }

  async printOverview() {
    await this.request(
      "stampatipresjekstanja",
      this.parseTemplate("stampatipresjekstanja")
    );
  }

  async getBasicInfo(): Promise<FiscalSummary> {
    const response = await this.request(
      "oi",
      this.parseTemplate("osnovneinformacije")
    );
    return this.parseFiscalSummary(response.data, "OsnovneInformacije");
  }

  async getDailyReport(params: GetDailyReportParams): Promise<FiscalSummary> {
    const response = await this.request(
      "oi",
      this.parseTemplate("oididnevniizvjestaj", params)
    );
    const summary = this.parseFiscalSummary(
      response.data,
      "ElektronskiDnevniIzvjestaj"
    );

    // The printer silently falls back to the current basic-info snapshot when
    // BrojDI is out of range (verified on firmware v1.0.125+7661270). Detect
    // it by checking the returned Z number against the requested one.
    if (summary.zNumber !== params.brojDI) {
      throw new Error(
        `Daily report ${params.brojDI} not available (printer returned Z=${summary.zNumber ?? "<empty>"})`
      );
    }

    return summary;
  }

  private parseFiscalSummary(
    xml: string,
    command: "OsnovneInformacije" | "ElektronskiDnevniIzvjestaj"
  ): FiscalSummary {
    const parser = new XMLParser();
    const parsed = parser.parse(xml);

    const r: Record<string, string> = (
      [].concat(parsed.KasaOdgovor.Odgovori.Odgovor) as {
        Naziv: string;
        Vrijednost: string;
      }[]
    ).reduce(
      (acc, item) => ({ ...acc, [item.Naziv]: item.Vrijednost }),
      {}
    );

    if (parsed.KasaOdgovor.VrstaOdgovora !== "OK") {
      throw new Error(`Error: ${command} failed: ${JSON.stringify(r)}`);
    }

    const num = (...keys: string[]): number | undefined => {
      for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== "") return +v;
      }
      return undefined;
    };
    const str = (...keys: string[]): string | undefined => {
      for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== "") return v;
      }
      return undefined;
    };
    const date = (...keys: string[]): Date | undefined => {
      for (const k of keys) {
        const v = r[k];
        if (v !== undefined && v !== "") return new Date(v);
      }
      return undefined;
    };

    return {
      currentDateTime: date("current_datetime", "Datum"),
      ibfm: str("ibfm"),
      fwVersion: str("fw_version"),
      lastInspectionDate: date("last_inspection_date"),
      lastTransferDate: date("last_transfer_date"),

      firstBF: num("first_BF", "firstBF"),
      lastBF: num("last_BF", "lastBF"),
      firstRF: num("first_RF", "firstRF"),
      lastRF: num("last_RF", "lastRF"),

      zNumber: num("z_number", "zNumber"),
      services: num("services", "Services"),
      resets: num("resets", "Resets"),
      taxChanges: num("tax_changes", "Taxes"),
      totalServices: num("TotalServices"),
      totalTaxes: num("TotalTaxes"),
      totalResets: num("TotalResets"),

      cash: num("cash"),
      check: num("check"),
      card: num("card"),
      transferOrder: num("transfer_order"),

      saleTA: num("sale_TA", "TA"),
      saleTE: num("sale_TE", "TE"),
      saleTJ: num("sale_TJ", "TJ"),
      saleTK: num("sale_TK", "TK"),
      saleTM: num("sale_TM", "TM"),
      saleZA: num("sale_ZA", "ZA"),
      saleZE: num("sale_ZE", "ZE"),
      saleZJ: num("sale_ZJ", "ZJ"),
      saleZK: num("sale_ZK", "ZK"),
      saleZM: num("sale_ZM", "ZM"),

      canceledSaleSEA: num("canceled_sale_SEA", "SEA"),
      canceledSaleEA: num("canceled_sale_EA", "EA"),
      canceledSaleSEP: num("canceled_sale_SEP", "SEP"),

      reclaimedSaleAT: num("reclaimed_sale_AT", "AT"),
      reclaimedSaleET: num("reclaimed_sale_ET", "ET"),
      reclaimedSaleJT: num("reclaimed_sale_JT", "JT"),
      reclaimedSaleKT: num("reclaimed_sale_KT", "KT"),
      reclaimedSaleMT: num("reclaimed_sale_MT", "MT"),
      reclaimedSaleAZ: num("reclaimed_sale_AZ", "AZ"),
      reclaimedSaleEZ: num("reclaimed_sale_EZ", "EZ"),
      reclaimedSaleJZ: num("reclaimed_sale_JZ", "JZ"),
      reclaimedSaleKZ: num("reclaimed_sale_KZ", "KZ"),
      reclaimedSaleMZ: num("reclaimed_sale_MZ", "MZ"),

      canceledReclaimedSaleSRA: num("canceled_reclaimed_sale_SRA", "SRA"),
      canceledReclaimedSaleRA: num("canceled_reclaimed_sale_RA", "RA"),
      canceledReclaimedSaleSRP: num("canceled_reclaimed_sale_SRP", "SRP"),

      taxA: num("tax_a"),
      taxE: num("tax_e"),
      taxJ: num("tax_j"),
      taxK: num("tax_k"),
      taxM: num("tax_m"),
    };
  }
}

export default FiscalSDK;
