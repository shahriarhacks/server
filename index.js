const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.whzqc0b.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.SECURE_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

const usersCollections = client.db("doyaShop").collection("users");
const categoriesCollections = client.db("doyaShop").collection("categories");
const phonesCollections = client.db("doyaShop").collection("phones");

async function run() {
  try {
    //Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollections.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollections.findOne(query);

      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollections.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    app.get("/users/seller/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await usersCollections.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const users = await usersCollections.find(query).toArray();
      res.send(users);
    });

    app.get("/users/sellers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "seller" };
      const sellers = await usersCollections.find(query).toArray();
      res.send(sellers);
    });

    app.get("/users/buyers", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "user" };
      const users = await usersCollections.find(query).toArray();
      res.send(users);
    });

    app.get("/users/for-seller", verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      res.send(user);
    });

    app.put("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          status: "verified",
        },
      };
      const result = await usersCollections.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollections.insertOne(user);
      res.send(result);
    });
    app.delete("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollections.deleteOne(query);
      res.send(result);
    });
    app.get(
      "/categories-add-product",
      verifyJWT,
      verifySeller,
      async (req, res) => {
        const query = {};
        const option = { name: 1 };
        const result = await categoriesCollections
          .find(query)
          .project(option)
          .toArray();
        res.send(result);
      }
    );

    app.post("/categories", verifyJWT, verifyAdmin, async (req, res) => {
      const category = req.body;
      const result = await categoriesCollections.insertOne(category);
      res.send(result);
    });

    app.post("/phones", verifyJWT, verifySeller, async (req, res) => {
      const phone = req.body;
      const result = await phonesCollections.insertOne(phone);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.SECURE_TOKEN, {
          expiresIn: "1h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });
  } finally {
  }
}
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Server is ready to fight");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
