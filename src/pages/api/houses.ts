import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { state, priceInUSD } = req.query;

  if (!state || !priceInUSD) {
    return res
      .status(400)
      .json({ error: "Missing state or priceInUSD parameter" });
  }

  const response = await fetch(
    `https://api.bridgedataoutput.com/api/v2/OData/dataset_id/Properties?access_token=YOUR_ACCESS_TOKEN&$filter=ListPrice lt ${priceInUSD} and State eq '${state}'`
  );

  const data = await response.json();
  res.status(200).json(data);
}

export type House = {
  id: string;
  ListPrice: number;
  Address: Address;
  PropertyType: string;
  Beds: number;
  Baths: number;
  SqFt: number;
  LotSize: number;
  YearBuilt: number;
  Photo: string;
};

type Address = {
  City: string;
  State: string;
  Zip: string;
};
