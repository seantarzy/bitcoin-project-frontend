import React, { useState, useEffect } from "react";
import moment from "moment";
import "./InfoBox.css";
import { CoinBaseResponse, getBitCoinPrice } from "@/services/utils";
import { formatPrice } from "@/services/helperFunctions";

interface InfoBoxProps {
  currentPrice: number;
  currencyCode: string;
  updatedAt: string;
  data: { y: number; cy: number }[];
}

const InfoBox: React.FC<InfoBoxProps> = ({
  currentPrice,
  data,
  currencyCode,
  updatedAt
}) => {
  const change = currentPrice - data[0].cy;
  const changeP = ((currentPrice - data[0].cy) / data[0].cy) * 100;

  const prefixedOperand = change > 0 ? "+" : "";
  const monthChangeD = prefixedOperand + formatPrice(change);

  const monthChangeP = changeP.toFixed(2) + "%";

  return (
    <div className="flex flex-col md:flex-row justify-center items-center align-middle text-center">
      {currentPrice ? (
        <div className="box flex-col gap-2">
          <div className="text-2xl text-cyan-600">
            {currentPrice.toLocaleString("us-EN", {
              style: "currency",
              currency: "USD"
            })}
          </div>
          <div className="text-md text-blue-400">
            {"Updated " + moment(updatedAt).fromNow()}
          </div>
        </div>
      ) : null}
      {currentPrice ? (
        <div className="box flex flex-col gap-2 border-none md:border-r-slate-100 md:border-l-slate-100 md:border-solid md:border-2 md:border-t-0 md:border-b-0 md:px-4 text-center">
          <div className="text-2xl text-cyan-600 ">{monthChangeD}</div>
          <div className="text-md text-blue-400">
            Change Since Last Month (USD)
          </div>
        </div>
      ) : null}
      <div className="box flex-col gap-2 text-center">
        <div className="text-2xl text-cyan-600">{monthChangeP}</div>
        <div className="text-md text-blue-400">Change Since Last Month (%)</div>
      </div>
    </div>
  );
};

export default InfoBox;
