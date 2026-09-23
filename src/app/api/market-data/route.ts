import { NextResponse } from "next/server";
import { getMarketData } from "@/services/utils";

export const revalidate = 60;

export async function GET() {
  return NextResponse.json(await getMarketData());
}
