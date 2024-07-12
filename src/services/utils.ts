export const getBitCoinPrice = () =>
  fetch(`https://api.coinbase.com/v2/exchange-rates?currency=BTC`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  }).then((response) => response.json());

export const getBitcoinStockChartData = () =>
  fetch("https://api.coindesk.com/v1/bpi/historical/close.json").then(
    (response) => {
      return response.json();
    }
  );

export type CoinBaseResponse = {
  data: {
    currency: string;
    rates: {
      [key: string]: string;
    };
  };
};
