const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true,
}))
app.use(express.json())
app.use(cookieParser())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.stv3jdc.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const cleanCollection = client.db("cleanDB").collection("services")
        const bookingCollection = client.db("cleanDB").collection("bookings")

        // auth related 

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none'
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('login out user', user)
            res.clearCookie('token', { maxAge: 0 })
                .send({ success: true })
        })



        // custom middleware

        const logger = (req, res, next) => {
            console.log('log info', req.method, req.url)
            next()
        }

        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token;
            // console.log('token in the middleware', token)
            // no token available
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    res.status(401).send({ message: 'unauthorized access' })
                }
                req.user = decoded;
                next()
            })
        }








        // read

        app.get('/services', async (req, res) => {
            const cursor = cleanCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })


        // booking create

        app.post('/bookings', async (req, res) => {
            const body = req.body;
            const result = await bookingCollection.insertOne(body)
            res.send(result)
        })

        app.get('/bookings', logger, verifyToken, async (req, res) => {
            // console.log('cook cook cookies', req.cookies)
            console.log(req.query.email)
            console.log('token owner info', req.user)
            // for verify user
            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = bookingCollection.find(query)
            const result = await cursor.toArray()
            res.send(result)
        })





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('clean co is running')
})

app.listen(port, (req, res) => {
    console.log(`clean co server is running on port : ${port}`)
})
