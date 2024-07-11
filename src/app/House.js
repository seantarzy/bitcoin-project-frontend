import React, { useEffect, useState } from 'react';

function House(props) {

    const [bedPlurality, setBedPlurality] = useState("bed")
    const [bathPlurality, setBathPlurality] = useState("bath")
    const [houseBitcoinPrice, setHouseBitcoinPrice] = useState(0)
    const { thumbnail, price, rdc_web_url, baths, beds, bitcoinPrice, city, state } = props;
     
useEffect(()=>{
    let num = (price / bitcoinPrice).toFixed(2);
    setHouseBitcoinPrice(num)
    if (beds !== 1) {
      setBedPlurality("beds");
    }
    if (baths !== 1) {
      setBathPlurality("baths");
    }
},[])

    return thumbnail ? (
      <div className="house-card">
        <a href={rdc_web_url} target="_blank">
          <img src={thumbnail} className="house-card-image" />
        </a>
        <div className="house-info">
          <footer>
            {city}, {state}
          </footer>

          <footer>
            {beds} {bedPlurality}, {baths} {bathPlurality}
          </footer>
          <footer>
            This Place is worth just {houseBitcoinPrice} Bitcoins!
          </footer>
        </div>
      </div>
    ) : null;
}

export default House;