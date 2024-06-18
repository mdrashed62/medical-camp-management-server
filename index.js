const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
    const paymentsCollection = client.db('MediCampManagement').collection('payments');
    const feedbackCollection = client.db('MediCampManagement').collection('feedbackCollection');

    //feedback 
    app.post('/feedback', async (req, res) => {
      const feedback = req.body;
      const result = await feedbackCollection.insertOne(feedback);
      res.send(result);
    });
    

    // pagination
    app.get('/addedCampsCount', async(req, res) => {
      const count = await addCampsCollection.estimatedDocumentCount();
      res.send({count});
    });

    app.get('/registeredCampsCount', async(req, res) => {
      const count = await registeredCampsCollection.estimatedDocumentCount();
      res.send({count});
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

    app.get("/registeredCamps/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registeredCampsCollection.findOne(query);
      res.send(result)
    });

    app.get("/registeredCamps/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { participantEmail: email };
      const result = await registeredCampsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/registeredCamps/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const result = await registeredCampsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 1) {
          res.send({ message: "Camp deleted successfully", deletedCount: result.deletedCount });
        } else {
          res.status(404).send({ message: "Camp not found" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error deleting camp", error });
      }
    });
    

    // Update confirmation status
    app.patch("/confirmRegistration/:id", async (req, res) => {
      const id = req.params.id;
      const result = await registeredCampsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { confirmationStatus: "Confirmed" } }
      );
      res.send(result);
    });

    // Delete registration
    app.delete("/cancelRegistration/:id", async (req, res) => {
      const id = req.params.id;
      const result = await registeredCampsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.get("/popularData", async (req, res) => {
      const result = await popularDataCollection.find().toArray();
      res.send(result);
    });

    // payment intent 
    app.post('/create-payment-intent', async (req, res) => {
      const {price} = req.body;
      console.log(price, 'fees')
      const amount = parseInt(price * 100);

      console.log(amount, "amount inside the intent")

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      console.log('payment info', payment)

      //carefully delete each item from the cart
      res.send(paymentResult)
    });

    app.get("/payments/:email", async (req, res) => {
      const query = {email: req.params.email}
      const result = await paymentsCollection.find(query).toArray();
      res.send(result);
    });

    app.put('/update-payment-status/:campId', async (req, res) => {
      const { campId } = req.params;
      const result = await registeredCampsCollection.updateOne(
        { _id: new ObjectId(campId) },
        { $set: { paymentStatus: 'Paid' } }
      );
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
