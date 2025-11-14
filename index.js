const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");

const serviceAccount = require("./local-food-lover-a32fe-firebase-adminsdk-fbsvc-0f3ce261e3.json");

require('dotenv').config();
const app = express();
const port = 3000 || process.env.PORT;



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// MIDDLEWARE 
app.use(cors());
app.use(express.json());

const verifyFirebaseToken = async(req, res, next)=>{
    const authorization = req.headers.authorization;
    if(!authorization){
        return res.status(401).send({message:'Unauthorized access'})
    }
    const token = authorization.split(' ')[1];
    if(!token){
         return res.status(401).send({message:'Unauthorized access'})
    }
    try{
        const decoded= await admin.auth.verifyFirebaseToken(token);
        console.log('inside token',decoded);
        req.token_email = decoded.email;
        next()
    }
    catch(error){
        return res.status(401).send({message:'Unauthorized access'})
        
    }

    // next()
}

const uri = "mongodb+srv://localFoodLover:Q7KvgOYx0WvIm11k@cluster0.vqc4z0k.mongodb.net/?appName=Cluster0";


// localFoodLover: Q7KvgOYx0WvIm11k 

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.get('/', (req, res)=>{
    res.send('Local food lover network..')

})

async function run(){
    try {
        await client.connect();
        const localFoodDb = client.db("local_food_db");
        const localFoodDbCollection = localFoodDb.collection("reviews");
        const myFavoriteCollection = localFoodDb.collection("my_favorite")


        await client.db('admin').command({ping: 1});
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


        app.post('/reviews',async(req, res)=>{
            const newReview = req.body;
            const result= await  localFoodDbCollection.insertOne(newReview);
            res.send(result)
        })
        
        app.get('/reviews/top', async(req, res)=>{
            const result = await localFoodDbCollection.find().sort({rating:-1}).limit(6).toArray();
            res.send(result)
        })

        app.get('/reviews',async(req, res)=>{
            const email = req.query.email;
            const foodName = req.query.foodName;
            const query = {}
            if(email){
                query.Created_by = email
            }
            if(foodName){
                query.foodName = {$regex:foodName, $options:'i'}
            }

            const cursor = localFoodDbCollection.find(query).sort({created_at:-1});
            const result = await cursor.toArray()
            res.send(result)
        })

        app.put('/reviews/:id', async(req, res)=>{
            const id =req.params.id;
            const updatedReview = req.body;
            const query = {
                _id: new ObjectId(id)
            }
            const  update = {
                $set: updatedReview
            }
            const result= await  localFoodDbCollection.updateOne(query, update);
            res.send(result)
        })
        app.get('/reviews/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result= await localFoodDbCollection.findOne(query)
            res.send(result)
        })

        app.delete('/reviews/:id', async(req, res)=>{
            const id = req.params.id;
            const query={_id: new ObjectId(id)}
            const result= await localFoodDbCollection.deleteOne(query)
            res.send(result)
        })

        // favorite db related API 
        app.post('/favorite',  async(req, res)=>{
            const favorite = req.body;
            const query= {
                foodName: favorite.foodName,
                Created_by: favorite.Created_by,
            }

            const exists = await myFavoriteCollection.findOne(query);
            if(exists){
                return res.send({message: "Already added to favorites!"});
            }

            const result = await myFavoriteCollection.insertOne(favorite);
            res.send(result)
        })

        app.get('/favorite', async(req, res)=>{
            const email = req.query.email;
            const query = {}
            if(email){
                query.favorite_by=email
            }
            const result= await myFavoriteCollection.find(query).toArray()
            res.send(result)
        })

        app.delete('/favorite/:id', async(req, res)=>{
            const id = req.params.id;
            const query={_id: new ObjectId(id)}
            const result= await myFavoriteCollection.deleteOne(query)
            res.send(result)
        })


        

        
        
    } finally {
        
    }
}
run().catch(console.dir);

app.listen(port, ()=>{
    console.log(`Example app listening on port ${port}`)
})