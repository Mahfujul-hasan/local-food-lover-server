const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();
const app = express();
const port = 3000 || process.env.PORT;


// MIDDLEWARE 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vqc4z0k.mongodb.net/?appName=Cluster0`;


// localFoodLover: Q7KvgOYx0WvIm11k 

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Local food lover network..')

})

async function run() {
    try {
        // await client.connect();
        const localFoodDb = client.db("local_food_db");
        const localFoodDbCollection = localFoodDb.collection("reviews");
        const myFavoriteCollection = localFoodDb.collection("my_favorite");
        const usersCollection = localFoodDb.collection("users");


        // await client.db('admin').command({ping: 1});
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");


        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const result = await localFoodDbCollection.insertOne(newReview);
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            const email = req.query.email;
            const query ={creatorEmail:email};

            const cursor = localFoodDbCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })
        


        app.get('/reviews/all', async (req, res) => {
            try {
                const { email, foodName, category, rating, sort, page, limit } = req.query;

                const query = {};

                // Filter by creator email
                if (email) query.creatorEmail = email;

                // Search by food name
                if (foodName) query.foodName = { $regex: foodName, $options: 'i' };

                // Filter by category
                if (category) query.category = category;

                // Filter by minimum rating
                if (rating) query.rating = { $gte: parseInt(rating) };

                // Pagination
                const pageNum = parseInt(page) || 1;
                const limitNum = parseInt(limit) || 6;
                const skip = (pageNum - 1) * limitNum;

                // Sorting
                let sortObj = { created_at: -1 }; // default: newest first
                if (sort === 'date_desc') sortObj = { createdAt: -1 };
                else if (sort === 'date_asc') sortObj = { createdAt: 1 };
                else if (sort === 'rating_desc') sortObj = { rating: -1 };
                else if (sort === 'rating_asc') sortObj = { rating: 1 };

                // Count total matching documents
                const total = await localFoodDbCollection.countDocuments(query);
                const totalPages = Math.ceil(total / limitNum);

                // Fetch reviews with filter, sort, pagination
                const reviews = await localFoodDbCollection
                    .find(query)
                    .sort(sortObj)
                    .skip(skip)
                    .limit(limitNum)
                    .toArray();

                res.send({
                    reviews,
                    totalPages,
                    currentPage: pageNum,
                });
            } catch (err) {
                console.error(err);
                res.status(500).send({ message: 'Server error' });
            }
        });





        app.get('/reviews/top', async (req, res) => {
            const result = await localFoodDbCollection.find().sort({ rating: -1, createdAt: -1 }).limit(8).toArray();
            res.send(result)
        })

        app.patch('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const updatedReview = req.body;
            const query = {
                _id: new ObjectId(id)
            }
            const update = {
                $set: updatedReview
            }
            const result = await localFoodDbCollection.updateOne(query, update);
            res.send(result)
        })
        app.get('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await localFoodDbCollection.findOne(query)
            res.send(result)
        })

        app.delete('/reviews/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await localFoodDbCollection.deleteOne(query)
            res.send(result)
        })

        // users related api
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            userInfo.role = "user";
            userInfo.createdAt = new Date();
            const email = userInfo.email;
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(409).send({ message: "Email already exists" })
            }

            const result = await usersCollection.insertOne(userInfo);
            res.send(result);

        })

        
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query)
            res.send(user)
        })

        app.patch('/users/:email', async (req, res) => {
            const email = req.params.email;
            const userInfo = req.body;
            const query = {}
            if (email) {
                query.email = email
            }
            updatedInfo = {
                $set: {
                    photoURL: userInfo.photoURL,
                    displayName: userInfo.displayName
                }
            }
            const result = await usersCollection.updateOne(query, updatedInfo)
            res.send(result);
        })

        // favorite db related API 
        app.post('/favorite', async (req, res) => {
            const favorite = req.body;
            const query = {
                foodName: favorite.foodName,
                Created_by: favorite.Created_by,
            }

            const exists = await myFavoriteCollection.findOne(query);
            if (exists) {
                return res.send({ message: "Already added to favorites!" });
            }

            const result = await myFavoriteCollection.insertOne(favorite);
            res.send(result)
        })

        app.get('/favorite', async (req, res) => {
            const email = req.query.email;
            const query = {}
            if (email) {
                query.favorite_by = email
            }
            const result = await myFavoriteCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/favorite/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await myFavoriteCollection.deleteOne(query)
            res.send(result)
        })






    } finally {

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

