//const mongoose = require('mongoose');
require('./config/db.js');

const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const router = require('./routes');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const passport = require('./config/passport.js');
const createError = require('http-errors');
const Handlebars = require('handlebars');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');

require('dotenv').config({path: './variables.env'});

const app = express();

//Habilitar Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Validación de campos

//Habilitar handlebars como view
app.engine('handlebars',
    exphbs.engine({
        defaultLayout: 'layout',
        helpers: require('./helpers/handlebars'),
        handlebars: allowInsecurePrototypeAccess(Handlebars)
    })
);
app.set('view engine', 'handlebars');

//Static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieParser());

app.use(session({
    secret: process.env.SECRETO,
    key: process.env.KEY,
    resave:true,
    saveUninitialized:true,
    store: MongoStore.create({
        mongoUrl: process.env.DATABASE
    })
}));

//inicializar passport
app.use(passport.initialize());
app.use(passport.session());



//Alertas y flash messages
app.use(flash());

//Crear nuestro middleware
app.use((req, res, next) => {
    res.locals.mensajes = req.flash();
    next();
});

app.use('/', router());

// 404 pagina no existente
app.use((req,res,next)=>{
    next(createError(404,'No Encontrado'));
});

// Administración de los errores
app.use((error, req, res)=>{
    res.locals.mensaje = error.message;
    const status = error.status || 500;
    res.locals.status = status;
    res.status(status);
    res.render('error');
});

//Dejar que el servidor (HEROKU) asigne el puerto
const host = '0.0.0.0';
const port = process.env.PORT;

app.listen(port, host, ()=>{
    console.log('El servidor esta funcionando');
});