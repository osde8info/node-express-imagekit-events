const express = require("express");
const path = require("path");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo")(session);
const flash = require("connect-flash");
const passport = require("passport");
const { verify } = require("jsonwebtoken");

// passport
require("./middlewares/passport");

// created app routes
const appRoute = require("./routes/_index");

// error handlers
const { NotFoundError, ErrorRendering } = require("./handlers/errorHandler.js");

// helpers
const util = require("./util");

const app = express();

// setting up ejs as templating engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "assets")));
app.use(flash());

// passport middleware
app.use(passport.initialize());
app.use(passport.session());

// session middleware
app.use(
	session({
		secret: process.env.SECRET,
		resave: false,
		saveUninitialized: false,
		store: new MongoStore({ mongooseConnection: mongoose.connection }),
		cookie: {
			httpOnly: true,
			maxAge: 60 * 60 * 1000
		} // 1 hours
	})
);

app.use((req, res, next) => {
	// setting request type if exist
	const reqType = req.get("content-type")
		? req.get("content-type").toLowerCase()
		: "";
	req.isAjax = reqType.includes("json") ? true : false;
	// token verification
	const { user: token, passport } = req.session;
	console.log(token);
	console.log(passport);
	if (token) {
		req.user = verify(token, process.env.secret);
	} else if (passport && passport.user) {
		req.user = verify(passport.user, process.env.secret);
	}
	// template variables
	res.locals.user = req.user || null;
	res.locals.h = util;
	res.locals.connectLink = process.env.STRIPE_AUTH;
	res.locals.imagekitEP = process.env.IMAGE_KIT_EP;
	res.locals.flashError = req.flash("error")[0];
	res.locals.flashSuccess = req.flash("success")[0];
	next();
});

// Application routes
app.use("/", appRoute.indexRoutes);
app.use("/", appRoute.authRoutes);
app.use("/profile", appRoute.userRoutes);

// catch 404 and forward to error handlers
app.use(NotFoundError);

// error rendering
app.use(ErrorRendering);

module.exports = app;
