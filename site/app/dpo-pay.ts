const DEFAULT_API_URL = "https://secure.3gdirectpay.com/API/v6/";
const DEFAULT_CHECKOUT_URL = "https://secure.3gdirectpay.com/payv2.php";

export type DpoConfig = {
  available: boolean;
  companyToken?: string;
  serviceType?: string;
  apiUrl: string;
  checkoutUrl: string;
};

export type DpoResponse = {
  result?: string;
  explanation?: string;
  transactionToken?: string;
  transactionReference?: string;
  companyRef?: string;
  amount?: string;
  currency?: string;
  fraudAlert?: string;
};

type ConfiguredDpo = DpoConfig & { available: true; companyToken: string; serviceType: string };

const trim = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function dpoConfigFrom(values: Record<string, unknown>): DpoConfig {
  const companyToken = trim(values.DPO_COMPANY_TOKEN);
  const serviceType = trim(values.DPO_SERVICE_TYPE);
  return {
    available: Boolean(companyToken && serviceType),
    companyToken: companyToken || undefined,
    serviceType: serviceType || undefined,
    apiUrl: trim(values.DPO_API_URL) || DEFAULT_API_URL,
    checkoutUrl: trim(values.DPO_CHECKOUT_URL) || DEFAULT_CHECKOUT_URL,
  };
}

export const currentDpoConfig = () => dpoConfigFrom(process.env);

export function requireDpoConfig(config: DpoConfig): asserts config is ConfiguredDpo {
  if (!config.available || !config.companyToken || !config.serviceType) {
    throw new Error("Secure payments are not configured");
  }
}

const entityMap: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
const decodeXml = (value: string) => value.replace(/&(amp|lt|gt|quot|apos);/g, (match) => entityMap[match] ?? match);
export const escapeXml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const moneyFromCents = (amountCents: number) => {
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new Error("Payment amount is invalid");
  return (amountCents / 100).toFixed(2);
};

const serviceDate = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ").replaceAll("-", "/");

export function buildCreateTokenXml(config: DpoConfig, input: {
  orderId: string;
  amountCents: number;
  customerEmail: string;
  returnUrl: string;
  callbackUrl: string;
  serviceDate?: Date;
}) {
  requireDpoConfig(config);
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(config.companyToken)}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${moneyFromCents(input.amountCents)}</PaymentAmount>
    <PaymentCurrency>NAD</PaymentCurrency>
    <CompanyRef>${escapeXml(input.orderId)}</CompanyRef>
    <RedirectURL>${escapeXml(input.returnUrl)}</RedirectURL>
    <BackURL>${escapeXml(input.callbackUrl)}</BackURL>
    <CompanyRefUnique>1</CompanyRefUnique>
    <PTL>15</PTL>
    <customerEmail>${escapeXml(input.customerEmail)}</customerEmail>
    <TransactionSource>Website</TransactionSource>
  </Transaction>
  <Services><Service>
    <ServiceType>${escapeXml(config.serviceType)}</ServiceType>
    <ServiceDescription>StylishMe fashion order ${escapeXml(input.orderId)}</ServiceDescription>
    <ServiceDate>${serviceDate(input.serviceDate ?? new Date())}</ServiceDate>
  </Service></Services>
</API3G>`;
}

export function buildVerifyTokenXml(config: DpoConfig, input: { transactionToken?: string; orderId: string; markVerified?: boolean }) {
  requireDpoConfig(config);
  if (!trim(input.transactionToken) && !trim(input.orderId)) throw new Error("Payment reference is required");
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${escapeXml(config.companyToken)}</CompanyToken>
  <Request>verifyToken</Request>
  ${input.transactionToken ? `<TransactionToken>${escapeXml(input.transactionToken)}</TransactionToken>` : ""}
  <CompanyRef>${escapeXml(input.orderId)}</CompanyRef>
  <VerifyTransaction>${input.markVerified === false ? "0" : "1"}</VerifyTransaction>
</API3G>`;
}

export function buildRefundXml(config: DpoConfig, input: { transactionToken: string; amountCents: number; reason: string; refundReference?: string }) {
  requireDpoConfig(config);
  if (!trim(input.transactionToken)) throw new Error("Payment token is required");
  const reason = trim(input.reason).slice(0, 300);
  if (!reason) throw new Error("Refund reason is required");
  return `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <Request>refundToken</Request>
  <CompanyToken>${escapeXml(config.companyToken)}</CompanyToken>
  <TransactionToken>${escapeXml(input.transactionToken)}</TransactionToken>
  <refundAmount>${moneyFromCents(input.amountCents)}</refundAmount>
  <refundDetails>${escapeXml(reason)}</refundDetails>
  ${input.refundReference ? `<refundRef>${escapeXml(input.refundReference)}</refundRef>` : ""}
</API3G>`;
}

const tag = (xml: string, names: string[]) => {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim());
  }
  return undefined;
};

export function parseDpoResponse(xml: string): DpoResponse {
  if (typeof xml !== "string" || xml.length > 200_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Invalid payment provider response");
  return {
    result: tag(xml, ["Result"]),
    explanation: tag(xml, ["ResultExplanation"]),
    transactionToken: tag(xml, ["TransToken", "TransactionToken"]),
    transactionReference: tag(xml, ["TransRef", "TransactionRef"]),
    companyRef: tag(xml, ["CompanyRef"]),
    amount: tag(xml, ["TransactionAmount", "TransactionFinalAmount"]),
    currency: tag(xml, ["TransactionCurrency", "TransactionFinalCurrency"])?.toUpperCase(),
    fraudAlert: tag(xml, ["TransactionFraudAlert", "FraudAlert"]),
  };
}

export function mapDpoStatus(result?: string) {
  if (result === "000") return "paid" as const;
  if (result === "901") return "declined" as const;
  if (result === "903") return "expired" as const;
  if (result === "904") return "cancelled" as const;
  if (["001", "002", "003", "005", "007", "900"].includes(result ?? "")) return "pending" as const;
  return "error" as const;
}

export function verifiedPaymentMatches(response: DpoResponse, order: { orderId: string; amountCents: number; currency: string }) {
  const amount = response.amount ? Math.round(Number(response.amount) * 100) : NaN;
  const acceptableFraudResult = !response.fraudAlert || ["000", "001", "003", "005"].includes(response.fraudAlert);
  return response.result === "000"
    && response.companyRef === order.orderId
    && response.currency === order.currency.toUpperCase()
    && amount === order.amountCents
    && acceptableFraudResult;
}

async function postDpo(config: DpoConfig, xml: string, fetcher: typeof fetch) {
  requireDpoConfig(config);
  const response = await fetcher(config.apiUrl, {
    method: "POST",
    headers: { "content-type": "application/xml; charset=utf-8", accept: "application/xml" },
    body: xml,
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Payment provider unavailable (${response.status})`);
  return parseDpoResponse(await response.text());
}

export async function createDpoCheckout(config: DpoConfig, input: Parameters<typeof buildCreateTokenXml>[1], fetcher: typeof fetch = fetch) {
  const parsed = await postDpo(config, buildCreateTokenXml(config, input), fetcher);
  if (parsed.result !== "000" || !parsed.transactionToken) throw new Error(parsed.explanation || "Payment provider could not start checkout");
  requireDpoConfig(config);
  const checkoutUrl = new URL(config.checkoutUrl);
  checkoutUrl.searchParams.set("ID", parsed.transactionToken);
  return { checkoutUrl: checkoutUrl.toString(), ...parsed };
}

export async function verifyDpoPayment(config: DpoConfig, input: Parameters<typeof buildVerifyTokenXml>[1], fetcher: typeof fetch = fetch) {
  return postDpo(config, buildVerifyTokenXml(config, input), fetcher);
}

export async function refundDpoPayment(config: DpoConfig, input: Parameters<typeof buildRefundXml>[1], fetcher: typeof fetch = fetch) {
  return postDpo(config, buildRefundXml(config, input), fetcher);
}
