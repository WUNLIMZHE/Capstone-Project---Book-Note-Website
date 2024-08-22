import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import { render } from "ejs";
import env from "dotenv";
const { Pool } = pg;
const itemsPool = new Pool({
  connectionString: process.env.DBConfigLink,
  ssl: {
      rejectUnauthorized: false
  }
});
module.exports = itemsPool;
const itemsPool = require('./dbConfig');

const app = express();
const port = 3000;
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

let posts = [
  { 
    id: 1, 
    user_id: 1, 
    isbn: "0-13-449837-2" , 
    rating: 10, 
    title: "Starting Out with C++ from Control Structures to Objects",
    review: "This is my first book to learn C++",
    date: "2024-01-01T14:30:00Z",
  },
];

let state = "home";
let username = "Peter";
let user_id = 1;

//bring user to home page
//trigerred when the app load initially / user use the search / sort button
app.get("/", async (req, res) => {
  console.log("req.body.menu: ", req.body.menu);
  console.log("app.get("/", async (req, res)");
  console.log("state: ", state);
  try{
    const result = await itemsPool.query(
      "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY books.id ASC;"
    );
    posts = [];
    posts = result.rows;
    console.log(posts);
    res.render("index.ejs", {
      posts:posts,
      state: state,
    });
  } catch(err){
    console.log(err.stack);
  }
});

//triggered when home button or "My Note" button is pressed
//show the My Note page
app.get("/me", async (req, res) => {
  state = "user";
  console.log("state: ", state);
  try{
    const result = await itemsPool.query(
      "SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", 
      [user_id]
    );
    posts = [];
    posts = result.rows;
    console.log(posts);
    res.render("index.ejs", {
      posts:posts,
      state: state,
      username: username
    });
  } catch(err){
    console.log(err.stack);
  }
});

//triggered when user click on the home button or search button
app.post("/action", (req, res) => {
  if (req.body.menu == "Home"){
    state = "home";
  } else if (req.body.menu == "Search"){
    state = "search";
  }
  res.redirect("/");
})

//user search the book via isbn number or the book title
//show the search result
app.post("/search", async (req, res) =>{
  let input = req.body.search_result;
  let type;
  console.log("input: ", input);
  console.log("state: ", state);
  if (parseInt(input)){ 
    //user wish to search the book via isbn number
    type = "isbn";
  } else{
    //user wish to search the book via book title
    type = "title";
  }
  console.log("type: ", type);
  if (state == "home"){ //if user use search function in home page
    if (type == "title"){
      try{
        const result = await itemsPool.query(
          "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE LOWER(books.title) LIKE '%' || $1 || '%';",
          [input.toLowerCase()]
        );
        posts = [];
        posts = result.rows;
        console.log(posts);
        if (posts.length == 0){
          //search result = 0
          res.render("index.ejs",{
            posts:posts,
            state: state,
            message: "No results found for your search.",
            search: true
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    } else if (type == "isbn"){
      try{
        const result = await itemsPool.query(
          "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE books.isbn = $1;",
          [input]
        );
        posts = [];
        posts = result.rows;
        console.log(posts);
        if (posts.length == 0){
          //search result = 0
          res.render("index.ejs",{
            posts:posts,
            state: state,
            message: "No results found for your search.",
            search: true
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    }
    
  } else if (state == "user"){ //if user uses search function in their own user page
    if (type == "title"){
      //user wish to search the book via isbn number
      try{
        const result = await itemsPool.query(
          "SELECT * FROM books WHERE LOWER(title) LIKE '%' || $1 || '%' AND user_id = $2;",
          [input.toLowerCase(), user_id]
        );
        posts = [];
        posts = result.rows;
        console.log(posts);
        if (posts.length == 0){
          //search result = 0
          res.render("index.ejs",{
            posts:posts,
            state: state,
            message: "No results found for your search.",
            search: true
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    } else if (type == "isbn"){
      //user wish to search the book via book title
      try{
        const result = await itemsPool.query(
          "SELECT * FROM books WHERE isbn = $1 AND user_id = $2;",
          [input, user_id]
        );
        posts = [];
        posts = result.rows;
        console.log(posts);
        if (posts.length == 0){
          //search result = 0
          res.render("index.ejs",{
            posts:posts,
            state: state,
            error: "No results found for your search.",
            search: true
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    }
  }
});

//show user the sort result
app.post("/sort", async (req, res) => {
  const sortType = req.body.sort;
  console.log("state: ", state);
  console.log("sort by: ", sortType);
  let query;
  let message;
  if (state == "home"){
    if (sortType == "Book title by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY title ASC;";
    } else if (sortType == "Latest by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY books.id ASC;;";
    } else if (sortType == "Rating by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY rating ASC;";
    } else if (sortType == "Book title by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY title DESC;";
    } else if (sortType == "Latest by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY books.id DESC;";
    } else if (sortType == "Rating by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id ORDER BY rating DESC;";
    }

    try{
      console.log("query: ", query);
      const result = await itemsPool.query(query);
      posts = [];
      posts = result.rows;
      // Log the raw result
      console.log("Raw query result: ", result.rows);
      console.log("Processed posts: ", posts);
      if (posts.length == 0){
        message = "You have no book review yet. Start your first one by today ~~";
      }
      res.render("index.ejs",
        { 
          posts:posts,
          state: state,
          message: message
        }
      );
    } catch (err){
      console.log(err.stack);
    }

  } else if (state == "user"){
    if (sortType == "Book title by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY title ASC;";
    } else if (sortType == "Latest by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY books.id ASC;;";
    } else if (sortType == "Rating by ASC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY rating ASC;";
    } else if (sortType == "Book title by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY title DESC;";
    } else if (sortType == "Latest by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY books.id DESC;";
    } else if (sortType == "Rating by DESC"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.name FROM books JOIN users ON books.user_id = users.id WHERE users.name = $1 ORDER BY rating DESC;";
    }

    try{
      console.log("query: ", query);
      const result = await itemsPool.query(query, [username]);
      posts = [];
      posts = result.rows;
      // Log the raw result
      console.log("Raw query result: ", result.rows);
      console.log("Processed posts: ", posts);
      if (posts.length == 0){
        message = "You have no book review yet. Start your first one by today ~~";
      }
      res.render("index.ejs",
        { 
          posts:posts,
          state: state,
          message: message
        }
      );
    } catch (err){
      console.log(err.stack);
    }
  }
});

//show user the add review page
app.get("/new", (req, res) => {
  res.render("modify.ejs", { heading: "New Book", submit: "Add a new book" });
});

//show user the edit review page
//pass the details of the review to the modify.ejs
app.post("/edit", async (req, res) => {
  const updateID = req.body.updatedPostId;
  try {
    const response = await itemsPool.query(
      "SELECT * FROM books WHERE id = $1;",
      [updateID]
    );
    posts = [];
    posts = response.rows[0];
    console.log(posts.data);
    res.render("modify.ejs", {
      heading: "Edit Review",
      submit: "Update Review",
      post: posts,
    });
  } catch (error) {
    console.log(err.stack);
  }
});

//process and update the book review
app.post("/update", async (req, res) => {
  const updateID = req.body.id;
  const updateTitle = req.body.title;
  const updateISBN = req.body.isbn;
  const updateReview = req.body.review;
  const updateRating = req.body.rating;
  console.log("updateID: ", updateID);
  console.log("updateTitle: ", updateTitle);
  console.log("updateReview: ", updateReview);
  console.log("updateRating: ", updateRating);
  try{
    await itemsPool.query(
      "UPDATE books SET title = ($1), isbn = ($2), review = ($3), rating = ($4) WHERE id = ($5);",
      [updateTitle, updateISBN, updateReview, updateRating, updateID]
    );
    res.redirect("/me");
  } catch (err){
    console.log(err.stack);
  }
});

//process and add a new book review
app.post("/posts", async(req, res) => {
  const title = req.body.title;
  const isbn = req.body.isbn;
  const review = req.body.review;
  const rating = req.body.rating;
  const date = new Date();
  console.log("title: ", title);
  console.log("isbn: ", isbn);
  console.log("review: ", review);
  console.log("rating: ", rating);
  try{
    const result = await itemsPool.query(
      "SELECT * FROM books WHERE isbn = $1 AND user_id = $2",
      [isbn, user_id]
    );
    posts = [];
    posts = result.rows;
    console.log(posts);
    if (posts.length != 0){
      console.log("Repeated book review detected.")
      res.render("modify.ejs",{
        error: "⚠ You have already reviewed this book. Please add a new one.",
        heading: "New Book", 
        submit: "Add a new book"
      }
      );
      return;
    }
  } catch (err){
    console.log(err.stack);
  }

  try{
    await itemsPool.query(
      "INSERT INTO books (user_id, isbn, rating, title, review, date) VALUES ($1, $2, $3, $4, $5, $6);",
      [user_id, isbn, rating, title, review, date]
    );
    res.redirect("/me");
  } catch (err){
    console.log(err.stack);
  }
});

app.post("/delete", async (req, res) => {
  const deleteID = req.body.deletePostId;
  try{
    await itemsPool.query(
      "DELETE FROM books WHERE id = ($1);",
      [deleteID]
    );
    res.redirect("/me");
  } catch (err){
    console.log(err.stack);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
