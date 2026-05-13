import express from "express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./swagger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// DB connection
const client = new DynamoDBClient({ region: "eu-north-1" });
const db = DynamoDBDocumentClient.from(client);

// Table name
const TABLE = "development";

app.use(express.json());

// Swagger UI route
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// GET - Retrieve all users

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users from DynamoDB
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 */

app.get("/users", async (req, res) => {
  try {
    const result = await db.send(new ScanCommand({ TableName: TABLE }));
    res.json({ users: result.Items });
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// POST - Create user

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User created successfully
 *       400:
 *         description: All fields are required
 *       500:
 *         description: Error creating user
 */

app.post("/users", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const hashPassword = await bcrypt.hash(password, 10);
    const user = {
      id: randomUUID(),
      name,
      email,
      password: hashPassword
    };
    await db.send(new PutCommand({ TableName: TABLE, Item: user }));
    res.json({ message: "User created", user: { id: user.id, name, email } });
  } catch (error) {
    console.error("Error creating user", error);
    res.status(500).json({ message: "Error creating user" });
  }
});

// POST - Login

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login a user based on the credentials
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:

 *               email:
 *                 type: string
 *                 example: rps@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: All fields are required
 *       500:
 *         description: Error logging in user
 */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email }
    }));

    const user = result.Items[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// PUT - Fully update user


/**
 * @swagger
 * /users/:id:
 *   put:
 *     summary: Fully update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Prasanna
 *               email:
 *                 type: string
 *                 example: rps@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User fully updated successfully
 *       400:
 *         description: All fields are required
 *       500:
 *         description: Error updating user
 */
app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { id }
    }));

    if (!existing.Item) {
      return res.status(404).json({ message: "User not found" });
    }

    //  hash password properly
    const hashPassword = await bcrypt.hash(password, 10);

    const updatedUser = {
      id,
      name,
      email,
      password: hashPassword  // ✅ now correctly defined
    };

    await db.send(new PutCommand({ TableName: TABLE, Item: updatedUser }));
    res.json({ message: "User fully updated", user: { id, name, email } });
  } catch (error) {
    console.error("Error updating user", error);
    res.status(500).json({ message: "Error updating user" });
  }
});

// PATCH - Partially update user
/**
 * @swagger
 * /users/:id:
 *   patch:
 *     summary: Partially update a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: Prasanna
 *               email:
 *                 type: string
 *                 example: rps@gmail.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: User partially updated successfully
 *       400:
 *         description: All fields are required
 *       500:
 *         description: Error updating user
 */
app.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { id }
    }));

    if (!existing.Item) {
      return res.status(404).json({ message: "User not found" });
    }

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const keys = Object.keys(data);
    const UpdateExpression = "set " + keys.map((k) => `#${k} = :${k}`).join(", ");
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    keys.forEach((k) => {
      ExpressionAttributeNames[`#${k}`] = k;
      ExpressionAttributeValues[`:${k}`] = data[k];
    });

    await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }));

    res.json({ message: "User partially updated" });
  } catch (error) {
    console.error("Error patching user", error);
    res.status(500).json({ message: "Error patching user" });
  }
});

// GET - Single user

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve Specific user from DynamoDB
 *     responses:
 *       200:
 *         description:  Single user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: single object
 */
app.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.send(new GetCommand({
      TableName: TABLE,
      Key: { id }
    }));
    if (!result.Item) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: result.Item });
  } catch (error) {
    console.error("Error fetching user", error);
    res.status(500).json({ message: "Error fetching user" });
  }
});

// DELETE - Delete user


/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
 *       500:
 *         description: Error deleting user
 */
app.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.send(new DeleteCommand({
      TableName: TABLE,
      Key: { id }
    }));
    res.json({ message: `User ${id} deleted` });
  } catch (error) {
    console.error("Error deleting user", error);
    res.status(500).json({ message: "Error deleting user" });
  }
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));