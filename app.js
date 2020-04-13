const Koa = require('koa');
const KoaRouter = require('koa-router');
const json = require('koa-json');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger');
const { Client } = require('pg');
const cors = require('@koa/cors');
const body = require('koa-body');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const saltRounds = 10;

const app = new Koa();
app.use(cors());
app.use(logger());
app.use(json());
app.use(body());
app.use(bodyParser());

const router = new KoaRouter();

const client = new Client({
  host: 'localhost',
  user: 'postgres',
  database: 'users',
  password: 'postgres',
  port: 5433,
});

async function dataLoad() {
  await client.connect();
  console.log('connected successfully.');
}

//routes
router.get('/search', authenticateToken, search);
router.get('/getUser', authenticateToken, returnUser);
router.get('/users', authenticateToken, fetchUsers);
router.get('/', index);
//Register and save to DB
router.post('/register', async (ctx) => {
  let response;
  console.log('I GOT A REGISTER REQUEST');
  try {
    console.log(ctx.request.body);
    const hashedPassword = await bcrypt.hash(
      ctx.request.body.password,
      saltRounds
    );
    console.log(hashedPassword);
    const user = {
      username: ctx.request.body.username,
      password: hashedPassword,
      email: ctx.request.body.email,
      avatar: 'https://robohash.org/imanewuser.png',
      bio: 'Not Created Yet',
    };
    client.query(
      "insert into userinfo (username,password,email,avatar,bio) values ('" +
        user.username +
        "','" +
        user.password +
        "','" +
        user.email +
        "','" +
        user.avatar +
        "','" +
        user.bio +
        "');"
    );
    response = { message: 'Completed' };
  } catch (error) {
    this.status = 500;
    console.log('SOMETHING WENT WRONG', error);
    response = { err: error, message: 'Failure' };
  }
  ctx.body = response;
});

//Login users and verify from DB
router.post('/login', async (ctx, next) => {
  const user = ctx.request.body;
  let result;
  try {
    result = await client.query(
      "SELECT * FROM userinfo WHERE email = '" + user.email + "';"
    );
  } catch (error) {
    ctx.throw(400, 'AUTH FAILED');
    console.log(ctx.body);
  }
  const userData = result.rows[0];
  const theSame = await comparePasswords(user.password, userData.password);

  const userInfo = {
    username: userData.username,
    email: userData.email,
    user_id: userData.user_id,
    avatar: userData.avatar,
    last_login: userData.last_login,
    bio: userData.last_login,
  };
  const tokenUser = {
    username: result.rows[0].username,
    email: result.rows[0].email,
    user_id: result.rows[0].user_id,
  };
  if (theSame) {
    const accessToken = jwt.sign(tokenUser, process.env.ACCESS_TOKEN_SECRET);
    ctx.status = 200;
    console.log(accessToken);
    response = { user: userInfo, token: accessToken };
  } else {
    ctx.throw(400, 'AUTH FAILED');
  }
  console.log(response);
  ctx.body = response;
});
function comparePasswords(reqPass, storedPass) {
  return new Promise((resolve, reject) => {
    bcrypt.compare(reqPass, storedPass, (err, result) => {
      if (err) {
        reject(`{message: '${err}'`);
      } else if (!result) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

//list of users for testing errs
async function fetchUsers(ctx) {
  console.log('Stuff:', Date.now());
  try {
    const results = await client.query('select * from usertable');
    console.table(results.rows);
    ctx.body = { results: results.rows };
  } catch (ex) {
    console.log(`something wrong happened ${ex}`);
  }
}

//for authenticating a token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return req.throw(400, 'AUTH FAILED');
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.log(err);
      return req.throw(403, 'AUTH FAILED');
    }
    req.user = user;
    return;
  });
}

//deafult address message for testing
function index(ctx) {
  ctx.body = {
    bruh:
      'Do you think God stays in heaven because he too, lives in fear of what hes created - Steve Buscemi, SpyKids 2 qoute ',
  };
}

function returnUser(ctx, res) {
  user = ctx.user;
  const token = authHeader && authHeader.split(' ')[1];
  const result = {
    user: user,
    token: token,
  };
  req.body = result;
}

//search users and return 5 of them
async function search(ctx) {
  const input = ctx.query;
  console.log(ctx);
  const page = (parseInt(input.page) - 1) * 5;

  const result = await client.query(
    "SELECT * FROM usertable WHERE name iLIKE '" +
      input.name +
      "%' ORDER BY name OFFSET " +
      page +
      ' LIMIT 5;'
  );
  console.table(result.rows);
  console.log('Searching for...', input.name);
  ctx.body = { result: result.rows };
}

//router middleware
app.use(router.routes()).use(router.allowedMethods());

dataLoad()
  .then(() => {
    app.listen(4001, () => console.log('Server Started'));
  })
  .catch(function errors(err) {
    console.log(err);
  });
