const Koa = require('koa');
const KoaRouter = require('koa-router');
const path = require('path');
const render = require('koa-ejs');
const json = require('koa-json');
const bodyParser = require('koa-bodyparser');
const logger = require('koa-logger'); 
const { Client } = require('pg');



const app = new Koa();
const router = new KoaRouter();

const client = new Client({
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432,
    database: "Users"
})



async function dataLoad(){
    await client.connect()
    console.log("connected successfully.")
}


 

app.use(logger());
app.use(json());
//BodyParser middleware
app.use(bodyParser());

// Add additional properties to context
app.context.user = 'Henry'


render(app, {
    root: path.join(__dirname, 'views'),
    layout: 'layout', 
    viewExt: 'ejs',
    cache: false,
    debug: false
})

//routes
router.get('/', index);
router.get('/search', showSearch);
router.get('/results', search);
router.get('/user', fetchUsers);


//list of users
async function fetchUsers(ctx){
    dataLoad()
    console.log('Stuff:', Date.now())
    try{     
    const results = await client.query('select * from person')
    console.log('Ran twice')
    console.table(results.rows)
    await ctx.render('index', {
        users: results.rows
    })
    }
    catch(ex){
        console.log(`something wrong happened ${ex}`)
    }
    // finally{
    //     await client.end()
    //     console.log('Client disconnected successfully')
    // }
 }

//list of users
async function index(ctx) {
    await ctx.render('add');
}

//show search page
async function showSearch(ctx) {
    await ctx.render('add');
}

//search users
 async function search(ctx) {
    const body = ctx.query;
    const userResult = await client.query("SELECT * FROM person WHERE name ~* '" + body.user + "'" + ";")
    console.table(userResult.rows)
    await ctx.render('index', {
        users: userResult.rows
    })
    //just to see if it was getting the ctx
    console.log("person?", body)
}

router.get('/test/:name', ctx => (ctx.body = `Hello ${ctx.params.name}`));


//router middleware
app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => console.log("Server Started")); 
