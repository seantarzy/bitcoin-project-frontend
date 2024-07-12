import React, { useEffect, useState } from "react";

import { getBitCoinPrice } from "../services/utils";

function Item({
  image,
  title,
  price,
  currency,
  asin
}: {
  image: string;
  title: string;
  price: number;
  currency: string;
  asin: string;
}) {
  const [rendered, setRendered] = useState(false);

  const howManyItemsCanYouBuy = () => {};

  useEffect(() => {
    if (!rendered) {
      howManyItemsCanYouBuy();
      setRendered(true);
    }
  });
  return (
    <div>
      Item of the day:
      <div className="item-card">
        <h2 className="item-title">{title}</h2>
        {image ? <img src={image} className="item-img" alt="" /> : null}
        <footer>price {price}</footer>
      </div>
    </div>
  );
}
export default Item;
