const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lic5ni0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const popularDataCollection = client.db('MediCampManagement').collection('popularData');
    const registeredCampsCollection = client.db('MediCampManagement').collection('registeredCamps');
    const userCampsCollection = client.db('MediCampManagement').collection('users');
    const addCampsCollection = client.db('MediCampManagement').collection('addedCamps');

    app.post('/jwt', async (req, res) => {
      const user = req.body;
      try {
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
        res.send({ token });
      } catch (error) {
        console.error("JWT generation error:", error);
        res.status(500).send({ error: 'Failed to generate token' });
      }
    });

    // Delete and update
    app.delete("/addedCamps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCampsCollection.deleteOne(query);
      res.send(result);
    });

    // Get for update
    app.get("/addedCamps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addCampsCollection.findOne(query);
      res.send(result);
    });

    // Update addedCamps
    app.put("/addedCamps/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedCamps = req.body;
      const services = {
        $set: {
          campName: updatedCamps.campName,
          location: updatedCamps.location,
          image: updatedCamps.image,
          campFees: updatedCamps.campFees,
          dateTime: updatedCamps.dateTime,
          description: updatedCamps.description,
          healthcareProfessionalName: updatedCamps.healthcareProfessionalName,
          participantCount: updatedCamps.participantCount,
        },
      };
      const result = await addCampsCollection.updateOne(filter, services, options);
      res.send(result);
    });

    // addedCamps post and get
    app.get("/addedCamps", async (req, res) => {
      const cursor = addCampsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/addedCamps", async (req, res) => {
      const addedCamps = req.body;
      const result = await addCampsCollection.insertOne(addedCamps);
      res.send(result);
    });

    // Users related API
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCampsCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCampsCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const cursor = userCampsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get and post for registered camps
    app.post("/registeredCamps", async (req, res) => {
      const registeredCamp = req.body;
      const result = await registeredCampsCollection.insertOne(registeredCamp);
      res.send(result);
    });

    app.get("/registeredCamps", async (req, res) => {
      const cursor = registeredCampsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/popularData", async (req, res) => {
      const cursor = popularDataCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Medical camp management server is running');
});

app.listen(port, () => {
  console.log(`Camp server is running on port: ${port}`);
});
