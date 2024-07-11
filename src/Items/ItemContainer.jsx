import React from "react";
import { month, day, fullYear } from "../date.js";
import { refreshArticles, getAmazonItems } from "../services/utils.js";
import ItemCard from "./ItemCard";
const todaysDate = `${month}`;
class ItemContainer extends React.Component {
  state = {
    items: []
  };

  componentDidMount = () => {
    if (localStorage["item-fetch-date"] !== todaysDate) {
      localStorage.setItem("article-fetch-date", `${month}`);
      refreshArticles();
    }
    if (this.state.articles.length === 0) {
      getArticles().then((articles) => {
        this.setState({ articles });
      });
    }
  };

  render() {
    return (
      <div>
        {this.state.articles.map((article) => {
          return <ItemCard {...article} />;
        })}
      </div>
    );
  }
}

export default ItemContainer;
