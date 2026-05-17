export interface SDKConfig {
  host: string;
}

interface ReceiptBuyer {
  // 13-char JIB/JMBG. Mandatory whenever a buyer is present — the driver
  // drops the whole Kupac block on the receipt if this is malformed.
  id: string;
  // 12-digit VAT (PDV) registration number, optional. Only PDV-registered
  // buyers have one; krajnji kupci do not. Per Tring docs v3.0.1 §7.3 it
  // sits between <IDbroj> and <Naziv> inside <Kupac>.
  pdvNumber?: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
}

/*
  E - opšta stopa (17%)
  K - stopa za artikle oslobođenje plaćanja PDV (0%)
  A - za korisnike koji nisu u sistemu PDV (0%)
*/
type ArticleRate = "E" | "K" | "A";
interface Article {
  id: string;
  name: string;
  unit?: string; // max 2 chars
  price: number;
  rate: ArticleRate;
  quantity: number;
  discount: number;
}

type PaymentMethodType = "Gotovina" | "Virman" | "Cek" | "Kartica";
interface PaymentMethod {
  type: PaymentMethodType;
  amount: number;
}

export interface PrintReceiptParams {
  date: Date;
  billId: string;
  buyer?: ReceiptBuyer;
  articles: Article[];
  paymentMethods: PaymentMethod[];
}

export interface PrintPeriodicalReportParams {
  startDate: Date;
  endDate: Date;
}

export interface ReceiptResult {
  id: number;
  date: string;
  time: string;
  amount: number;
}

/**
 * Refund leg of a reclamation receipt. Specify the natural (positive) refund
 * amount per payment type — the SDK applies the Tring sign convention
 * internally (cash legs are sent as Iznos=0, non-cash legs are sent as a
 * negative amount). Positive raw amounts would be interpreted by the printer
 * as customer top-up (doplata), which this API deliberately does not expose.
 */
export interface RefundMethod {
  type: PaymentMethodType;
  amount: number;
}

export interface ReclaimReceiptParams {
  /** Number of the original fiscal receipt being reclaimed. */
  originalReceiptId: string | number;
  articles: Article[];
  refunds: RefundMethod[];
  buyer?: ReceiptBuyer;
  note?: string;
}

/**
 * Result of a reclamation. `id` is the sequential number assigned by the
 * printer to the *reclamation document itself*, not the original receipt
 * being reclaimed (the caller already has that). The docs (v3.0.1) describe
 * `BrojReklamiranogRacuna` as the field carrying this number, but firmware
 * v1.0.125+7661270 omits it and uses `BrojFiskalnogRacuna` for the same
 * purpose. The parser accepts either.
 */
export type ReclamationResult = ReceiptResult;

/**
 * Move money in or out of the till for a given payment type. Per Tring docs
 * §7.5, supported types are Gotovina, Cek, Kartica and Virman. Amount is
 * always a positive natural number; direction is determined by which method
 * is called (depositMoney vs withdrawMoney).
 */
export interface MoneyMovementParams {
  type: PaymentMethodType;
  amount: number;
}

export interface GetDailyReportParams {
  brojDI: number;
}

export interface WriteToDisplayParams {
  line1?: string;
  line2?: string;
}

/**
 * Parsed response from the `oi` endpoint. With no parameters it returns the
 * current snapshot since the last Z report (snake_case field names, newer
 * firmware). With a `BrojDI` parameter it returns the historical Z report for
 * that number (mixed-case field names, older-style — same field set,
 * different naming). The parser accepts both.
 *
 * Tring firmware revisions disagree on field naming. Newer firmware emits
 * snake_case names (`z_number`, `first_BF`, `sale_TA`, `canceled_sale_SEA`,
 * `current_datetime`, plus `cash`/`check`/`card`/`transfer_order` and tax
 * rates), while older firmware emits mixed-case names (`zNumber`, `firstBF`,
 * `TA`, `SEA`, `Datum`, `TotalServices`/`TotalTaxes`/`TotalResets`) and omits
 * payments + tax rates. The parser accepts either; every field is optional
 * because no single firmware populates them all.
 *
 * Tax rates, when present, are expressed in basis points x 100 — `1700`
 * means 17.00%, matching the raw Tring value.
 */
export interface FiscalSummary {
  // Meta
  currentDateTime?: Date;
  ibfm?: string;
  fwVersion?: string;
  lastInspectionDate?: Date;
  lastTransferDate?: Date;

  // Receipt ranges
  firstBF?: number;
  lastBF?: number;
  firstRF?: number;
  lastRF?: number;

  // Z number
  zNumber?: number;

  // Counts for the current Z period
  services?: number;
  resets?: number;
  taxChanges?: number;

  // Lifetime totals (older firmware only)
  totalServices?: number;
  totalTaxes?: number;
  totalResets?: number;

  // Payments (newer firmware only)
  cash?: number;
  check?: number;
  card?: number;
  transferOrder?: number;

  // Sale by tax category, T-prefix (pretax)
  saleTA?: number;
  saleTE?: number;
  saleTJ?: number;
  saleTK?: number;
  saleTM?: number;

  // Sale by tax category, Z-prefix (with tax)
  saleZA?: number;
  saleZE?: number;
  saleZJ?: number;
  saleZK?: number;
  saleZM?: number;

  // Canceled sales
  canceledSaleSEA?: number;
  canceledSaleEA?: number;
  canceledSaleSEP?: number;

  // Reclaimed sales (T = pretax, Z = with tax)
  reclaimedSaleAT?: number;
  reclaimedSaleET?: number;
  reclaimedSaleJT?: number;
  reclaimedSaleKT?: number;
  reclaimedSaleMT?: number;
  reclaimedSaleAZ?: number;
  reclaimedSaleEZ?: number;
  reclaimedSaleJZ?: number;
  reclaimedSaleKZ?: number;
  reclaimedSaleMZ?: number;

  // Canceled reclaimed sales
  canceledReclaimedSaleSRA?: number;
  canceledReclaimedSaleRA?: number;
  canceledReclaimedSaleSRP?: number;

  // Tax rates (newer firmware only; basis points x 100, 1700 = 17.00%)
  taxA?: number;
  taxE?: number;
  taxJ?: number;
  taxK?: number;
  taxM?: number;
}
