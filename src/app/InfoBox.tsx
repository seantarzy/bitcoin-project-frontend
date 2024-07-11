import React, { useState, useEffect } from "react";
import moment from "moment";
import "./InfoBox.css";

interface InfoBoxProps {
  data: { y: number }[];
}

const InfoBox: React.FC<InfoBoxProps> = ({ data }) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [monthChangeD, setMonthChangeD] = useState<string | null>(null);
  const [monthChangeP, setMonthChangeP] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const getData = () => {
    const url = "https://api.coindesk.com/v1/bpi/currentprice.json";

    fetch(url)
      .then((response) => response.json())
      .then((bitcoinData) => {
        const price = bitcoinData.bpi.USD.rate_float;
        const change = price - data[0].y;
        const changeP = ((price - data[0].y) / data[0].y) * 100;

        setCurrentPrice(price);
        setMonthChangeD(
          change.toLocaleString("us-EN", {
            style: "currency",
            currency: "USD"
          })
        );
        setMonthChangeP(changeP.toFixed(2) + "%");
        setUpdatedAt(bitcoinData.time.updated);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  useEffect(() => {
    getData();
    const refresh = setInterval(getData, 90000);

    return () => clearInterval(refresh);
  }, []);

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
