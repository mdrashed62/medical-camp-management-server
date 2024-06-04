const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = /* process.env.PORT || */ 5000;

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lic5ni0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // await client.connect();

    const popularDataCollection = client.db('MediCampManagement').collection('popularData');
    const registeredCampsCollection = client.db('MediCampManagement').collection('registeredCamps');
    const userCampsCollection = client.db('MediCampManagement').collection('users');
    const addCampsCollection = client.db('MediCampManagement').collection('addedCamps');

    // Delete and update
    app.delete("/addedCamps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCampsCollection.deleteOne(query);
      res.send(result);
    });

    // get for update
    app.get("/addedCamps/:id", async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCampsCollection.findOne(query);
      res.send(result);
    })

    // update addedCamps
    app.put("/services/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedCamps = req.body;
      const services = {
        $set: {
          price: updatedCamps.price,
          imgURL: updatedCamps.imgURL,
          serviceName: updatedCamps.serviceName,
          providerImage: updatedCamps.providerImage,
          providerName: updatedCamps.providerName,
          description: updatedCamps.description,
        },
      };
      const result = await addCampsCollection.updateOne(
        filter,
        services,
        options
      );
      res.send(result);
    });

    // addedCamps post and get
    app.get("/addedCamps", async(req, res) => {
      const cursor = addCampsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })


    app.post("/addedCamps", async (req, res) => {
      const addedCamps = req.body;
      const result = await addCampsCollection.insertOne(addedCamps);
      res.send(result);
    })

    // users related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exists: 
      // you can do this many ways (1. email unique, 2. upsert, 3. simple checking);
      const query = {email: user.email};
      const existingUser = await userCampsCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists', insertedId: null})
      }
      const result = await userCampsCollection.insertOne(user);
      res.send(result);
    })
    


    // get and post for registered camps
    app.post("/registeredCamps", async (req, res) => {
      const registeredCamp = req.body;
      const result = await registeredCampsCollection.insertOne(registeredCamp);
      res.send(result);
    })

    app.get("/registeredCamps", async(req, res) => {
      const cursor = registeredCampsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/popularData", async (req, res) => {
        const cursor = popularDataCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) =>{
    res.send('Medical camp management server is running')
});

app.listen(port, () =>{
    console.log(`Camp server is running on port: ${port}`)
});