import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
const { Pool } = pg;
// import { render } from "ejs";
import env from "dotenv";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import FacebookStrategy from "passport-facebook";
import session from "express-session";

env.config(); // Load environment variables
const app = express();
const port = process.env.PORT;

const saltRounds = 10;

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Set up the PostgreSQL connection pool
// console.log("DB_URL", process.env.DB_URL);
// const db = new Pool({
//   connectionString: process.env.DB_URL,
//   ssl: {
//       rejectUnauthorized: false
//   }
// });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

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

//to hold the current user's information
let state = "home";
let username = "Peter";
let user_id = 1;

//temporary store user's registration info. 
let email = "";
let password = "";

//to hold the state of the login
let isLogin = false;

//bring user to home page
//trigerred when the app load initially / user use the search / sort button
app.get("/", async (req, res) => {
  console.log("GOOGLE_CLIENT_ID: ", process.env.GOOGLE_CLIENT_ID);
  console.log("GOOGLE_CLIENT_SECRET: ", process.env.GOOGLE_CLIENT_SECRET);
  console.log("FACEBOOK_CLIENT_ID: ", process.env.FACEBOOK_CLIENT_ID);
  console.log("FACEBOOK_CLIENT_SECRET: ", process.env.FACEBOOK_CLIENT_SECRET);
  console.log("req.body.menu: ", req.body.menu);
  console.log("app.get("/", async (req, res)");
  console.log("state: ", state);
  try{
    const result = await db.query(
      "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY books.id ASC;"
    );
    posts = [];
    posts = result.rows;
    console.log(posts);
    res.render("index.ejs", {
      posts:posts,
      state: state,
      isLogin: isLogin,
    });
  } catch(err){
    console.log("Error to access database");
    console.log(err.stack);
  }
});

//triggered when home button or "My Note" button is pressed
//show the My Note page
app.get("/me", async (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) {
    state = "user";
    console.log("state: ", state);
    console.log("userID: ", user_id);
    try{
      const result = await db.query(
        "SELECT * FROM books WHERE user_id = $1 ORDER BY id ASC", 
        [user_id]
      );
      posts = [];
      posts = result.rows;
      console.log(posts);
      res.render("index.ejs", {
        posts:posts,
        state: state,
        username: username,
        isLogin: isLogin,
      });
    } catch(err){
      console.log(err.stack);
    }
  } else {
    res.redirect("/login");
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
        const result = await db.query(
          "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE LOWER(books.title) LIKE '%' || $1 || '%';",
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
            search: true,
            isLogin: isLogin,
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true,
            isLogin: isLogin,
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    } else if (type == "isbn"){
      try{
        const result = await db.query(
          "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE books.isbn = $1;",
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
            search: true,
            isLogin: isLogin,
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true,
            isLogin: isLogin,
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
        const result = await db.query(
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
            search: true,
            isLogin: isLogin,
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true,
            isLogin: isLogin,
          });
        }
      } catch (err){
        console.log(err.stack);
      }
    } else if (type == "isbn"){
      //user wish to search the book via book title
      try{
        const result = await db.query(
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
            search: true,
            isLogin: isLogin,
          });
        } else{
          res.render("index.ejs",{
            posts:posts,
            state: state,
            search: true,
            isLogin: isLogin,
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
    if (sortType == "Book title (A-Z)"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY title ASC;";
    } else if (sortType == "Date: Oldest First"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY books.id ASC;;";
    } else if (sortType == "Rating: Low to High"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY rating ASC;";
    } else if (sortType == "Book title (Z-A)"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY title DESC;";
    } else if (sortType == "Date: Newest First"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY books.id DESC;";
    } else if (sortType == "Rating: High to Low"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id ORDER BY rating DESC;";
    }

    try{
      console.log("query: ", query);
      const result = await db.query(query);
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
          message: message,
          isLogin: isLogin,
        }
      );
    } catch (err){
      console.log(err.stack);
    }

  } else if (state == "user"){
    if (sortType == "Book title (A-Z)"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY title ASC;";
    } else if (sortType == "Date: Oldest First"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY books.id ASC;;";
    } else if (sortType == "Rating: Low to High"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY rating ASC;";
    } else if (sortType == "Book title (Z-A)"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY title DESC;";
    } else if (sortType == "Date: Newest First"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY books.id DESC;";
    } else if (sortType == "Rating: High to Low"){
      query = "SELECT books.id, books.user_id, books.isbn, books.rating, books.title, books.review, books.date, users.username FROM books JOIN users ON books.user_id = users.id WHERE users.username = $1 ORDER BY rating DESC;";
    }

    try{
      console.log("query: ", query);
      const result = await db.query(query, [username]);
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
          message: message,
          isLogin: isLogin,
        }
      );
    } catch (err){
      console.log(err.stack);
    }
  }
});

//show user the add review page
app.get("/new", (req, res) => {
  console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("partials/modify.ejs", { heading: "New Book", submit: "Add a new book" });
  } else {
    res.redirect("/login");
  }
});

//show user the edit review page
//pass the details of the review to the modify.ejs
app.post("/edit", async (req, res) => {
  const updateID = req.body.updatedPostId;
  try {
    const response = await db.query(
      "SELECT * FROM books WHERE id = $1;",
      [updateID]
    );
    posts = [];
    posts = response.rows[0];
    console.log(posts.data);
    res.render("partials/modify.ejs", {
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
    await db.query(
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
    const result = await db.query(
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
    await db.query(
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
    await db.query(
      "DELETE FROM books WHERE id = ($1);",
      [deleteID]
    );
    res.redirect("/me");
  } catch (err){
    console.log(err.stack);
  }
});

//bring user to sign up/login page
app.get("/login", (req, res) => {
  res.render("partials/signup-and-login.ejs");
});

//bring user to home page after log out
app.get("/logout", (req, res) => {
  isLogin = false;
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    console.log("logout successfully!");
    state = "home";
    username = "";
    user_id = 0;
    res.redirect("/");
  });
});

app.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

app.get("/auth/google/me", passport.authenticate("google", {
  successRedirect: "/me", 
  failureRedirect: "/login",
}));

app.get("/auth/facebook", passport.authenticate("facebook", {
  scope: ["public_profile", "email"]
}));

app.get("/auth/facebook/me", passport.authenticate("facebook", {
  successRedirect: "/me", 
  failureRedirect: "/login",
}));

//determine whether the login details are correct after user submission (local strategy)
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/me",
    failureRedirect: "/login",
  })
);

//handle new user details after submission (local strategy)
app.post("/register", async (req, res) => {
  email = req.body.email;
  password = req.body.password;
  username = req.body.username;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
            [username, email, hash]
          );
          
          const user = result.rows[0];
          user_id = user.id;
          req.login(user, (err) => {
            console.log("success");
            isLogin = true;
            res.redirect("/me");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//if got use more than 1 strategies need mention the "local" keyword for the local strategy
passport.use("local", 
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            //Error with password check
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              isLogin = true;
              //update current username
              username = user.username;
              //update current user id
              user_id = user.id;
              //Passed password check
              return cb(null, user);
            } else {
              //Did not pass password check
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

//define Google authentication strategy
passport.use(
  "google", 
  new GoogleStrategy (
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    //callbackURL is where Google redirects after authentication.
    callbackURL: "http://localhost:3000/auth/google/me",
    //userProfileURL is where Passport fetches the user's profile data.
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo", //hold user profile information
  }, 
  async (accessToken, refreshToken, profile, cb) =>{
    try {
      console.log("Profile", profile);
      username = profile.displayName;
      const result = await db.query("SELECT * FROM users WHERE email = $1;", [
        profile.email,
      ]);
      if (result.rows.length === 0) {
        const newUser = await db.query(
          "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
          [profile.displayName, profile.email, "google_oauth"]
        );
        console.log("New user: ", newUser.rows);
        user_id = newUser.id;
        isLogin = true;
        return cb(null, newUser.rows[0]);
      } else {
        user_id = result.rows[0].id;
        isLogin = true;
        return cb(null, result.rows[0]);
      }
    } catch (err) {
      return cb(err);
    }
  }
));

//define Facebook authentication strategy
passport.use(
  "facebook", 
  new FacebookStrategy (
  {
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    //callbackURL is where Facebook redirects after authentication.
    callbackURL: "http://localhost:3000/auth/facebook/me",
  }, 
  async (accessToken, refreshToken, profile, cb) =>{
    try {
      console.log("Profile", profile);
      username = profile.displayName;
      const result = await db.query("SELECT * FROM users WHERE email = $1;", [
        profile.id,
      ]);
      if (result.rows.length === 0) {
        //we store the facebook user id into the email column
        const newUser = await db.query(
          "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *",
          [profile.displayName, profile.id, "facebook_oauth"]
        );
        user_id = newUser.id;
        console.log("New user: ", newUser.rows);
        isLogin = true;
        return cb(null, newUser.rows[0]);
      } else {
        user_id = result.rows[0].id;
        isLogin = true;
        return cb(null, result.rows[0]);
      }
    } catch (err) {
      return cb(err);
    }
  }
));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
