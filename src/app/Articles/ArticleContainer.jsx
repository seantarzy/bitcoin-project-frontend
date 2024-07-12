import React, { useEffect, useState } from "react";
import { month, day, fullYear } from "../date.js";
import { refreshArticles, getArticles } from "../services/utils.js";
import ArticleCard from "./ArticleCard";
const todaysDate = `${month}`;
class ArticleContainer extends React.Component {
  state = {
    articles: []
  };

  componentDidMount = () => {
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
          return <ArticleCard {...article} key={article.id} />;
        })}
      </div>
    );
  }
}

export default ArticleContainer;
