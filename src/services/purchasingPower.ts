export const MAX_BTC = 21000000;
export type Category =
  | "Everyday"
  | "Tech & toys"
  | "Experiences"
  | "Big dreams";
export type Comparison = {
  id: string;
  title: string;
  singular: string;
  category: Category;
  budget: number;
  note: string;
  color: string;
  icon: string;
};
// Illustrative USD budgets, not current retailer quotes. Every price is editable.
export const comparisons: Comparison[] = [
  {
    id: "coffee",
    title: "Coffee runs",
    singular: "coffee run",
    category: "Everyday",
    budget: 6,
    note: "A $6 coffee budget. Your local order may cost more or less.",
    color: "peach",
    icon: "coffee",
  },
  {
    id: "pizza",
    title: "Pizza nights",
    singular: "pizza night",
    category: "Everyday",
    budget: 20,
    note: "A $20 pizza budget, before delivery, tips and tax.",
    color: "yellow",
    icon: "pizza",
  },
  {
    id: "laptop",
    title: "Fresh laptops",
    singular: "laptop",
    category: "Tech & toys",
    budget: 1500,
    note: "A $1,500 laptop budget. No particular model or retailer is implied.",
    color: "lilac",
    icon: "laptop",
  },
  {
    id: "getaway",
    title: "Dream getaways",
    singular: "getaway",
    category: "Experiences",
    budget: 2500,
    note: "An illustrative $2,500 trip budget. Destination, flights and dates change the actual cost.",
    color: "blue",
    icon: "plane",
  },
  {
    id: "sneakers",
    title: "Fresh pairs",
    singular: "pair of sneakers",
    category: "Tech & toys",
    budget: 150,
    note: "A $150 sneaker budget, excluding tax and shipping.",
    color: "mint",
    icon: "sneaker",
  },
  {
    id: "dinner",
    title: "Dinner dates",
    singular: "dinner date",
    category: "Experiences",
    budget: 100,
    note: "A $100 dinner-for-two budget. Not a local restaurant quote.",
    color: "pink",
    icon: "dinner",
  },
  {
    id: "car",
    title: "New rides",
    singular: "car",
    category: "Big dreams",
    budget: 40000,
    note: "A $40,000 car budget before tax, registration and running costs.",
    color: "blue",
    icon: "car",
  },
  {
    id: "home",
    title: "Places to call home",
    singular: "home",
    category: "Big dreams",
    budget: 400000,
    note: "An illustrative $400,000 full purchase price, not a down payment or a housing-market average. Excludes closing costs.",
    color: "peach",
    icon: "home",
  },
];
export function parseBtc(raw: string): number | null {
  if (!/^\d*(\.\d{0,8})?$/.test(raw) || raw === "" || raw === ".") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= MAX_BTC
    ? value
    : null;
}
export function buyingPower(btc: number, rate: number | null, budget: number) {
  if (
    !Number.isFinite(btc) ||
    btc < 0 ||
    btc > MAX_BTC ||
    rate === null ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    !Number.isFinite(budget) ||
    budget <= 0
  )
    return null;
  const dollars = btc * rate;
  return {
    dollars,
    units: Math.floor(dollars / budget),
    progress: Math.min(100, (dollars / budget) * 100),
    btcNeeded: budget / rate,
  };
}
export function parseSharedComparison(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const amount = params.get("btc");
  const pick = comparisons.find((item) => item.id === params.get("pick"));
  const rawBudget = Number(params.get("budget"));
  if (amount === null || parseBtc(amount) === null || !pick) return null;
  return {
    amount,
    pick: pick.id,
    budget:
      Number.isFinite(rawBudget) && rawBudget > 0 && rawBudget <= 1e12
        ? rawBudget
        : pick.budget,
  };
}
