import React from 'react';
import './App.css'



function ItemCard(props) {
    return (
        <div className = "article-card" >
            <a href = {props.url} target = "_blank">
             <h2 className = "article-title">{props.title}</h2>
             <img src = {`${props.img}`} className = "article-img"/>
            <footer>By {props.author}</footer>
            </a>
        </div>
    );
}

export default ItemCard;