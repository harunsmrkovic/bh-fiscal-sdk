export interface SDKConfig {
  host: string;
}

interface ReceiptBuyer {
  id: string;
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
 * Parsed response from `OsnovneInformacije` (oi). Returns the current
 * snapshot since the last Z report.
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
