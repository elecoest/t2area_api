const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const helmet = require("helmet")
const compression = require('compression')
const session = require('express-session')
const rateLimit = require('express-rate-limit')
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const morgan = require('morgan')
const path = require('path')
const rfs = require('rotating-file-stream')

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API for T2Area',
    version: '1.0.0',
    description:
      'This is a REST API application based on T2Area',
    license: {
      name: 'Licensed Under MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
    contact: {
      name: 'T2 Area',
      email: 'apit2area@t2area.com',
      url: 'https://www.t2area.com',
    },
  },
  basePath: '/v1',
  schemes: ['https', 'http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header',
      description:
        'Enter your bearer token in the format **Bearer &lt;token>**',
      example: 'Bearer ipsomlorem'
    }
  },
  servers: [
    {
      url: 'https://api.t2area.com',
      description: 'Production server',
    },
  ],
};

const options = {
  swaggerDefinition,
  produces: ["application/json"],
  schemes: ["https"],
  // Paths to files containing OpenAPI definitions
  apis: ['./app/routes/*.js', './app/models/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100, // start blocking after 5 requests
  message: 'Too many requests. You exceed the authorized rate, please try again after an hour',
  statusCode: 429
})

const app = express();

// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB or API Gateway, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);

// create a rotating write stream
var accessLogStream = rfs.createStream('access.log', {
  size: "10M", // rotate every 10 MegaBytes written
  interval: "1d", // rotate daily
  compress: "gzip",// compress rotated files
  path: path.join(__dirname, 'log')
})

// setup the logger
app.use(morgan('combined', { stream: accessLogStream }))

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"]
}))

// parse requests of content-type - application/json
app.use(bodyParser.json())
app.disable("x-powered-by");

// parse requests of content-type - application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))
app.use(helmet())
app.use(compression())
app.use(createAccountLimiter);

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'T2 Area',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

const db = require("./app/models")
const Role = db.roles;

app.get("/", (req, res) => {
  res.json({ message: "Welcome to t2area application." })
})

require("./app/routes/event.routes")(app)
require("./app/routes/trial.routes")(app)
require("./app/routes/fftri.routes")(app)
require("./app/routes/edition.routes")(app)
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);
require('./app/routes/content.routes')(app);

/*
db.sequelize.sync({force: false}).then(() => {
  console.log('Drop and Resync Db');
});
*/
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/swagger.json", function (req, res) {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get('*', function (req, res) {
  const error = new Error()
  res.status(404).send('Not found - ' + req.originalUrl)
});

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`)
})