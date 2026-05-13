import express from "express";
import serverless from "serverless-http";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand,UpdateCommand, DeleteCommand  } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import  bcrypt  from "bcrypt";


const app = express();
const PORT = process.env.PORT || 3000;
const handler = serverless(app, { basePath: "/dev" });


//DB connection
const client = new DynamoDBClient({ region: "eu-north-1" }); 
const db = DynamoDBDocumentClient.from(client);

//Table name 
const TABLE = "development"; 


app.use(express.json());

//GET -Retrieve user
app.get("/users", async (req, res) => {
  const result = await db.send(new ScanCommand({ TableName: TABLE }));
  res.json({ users: result.Items });
});


//POST -Send data user

app.post("/users", async (req, res) => {

  const { name, email,password } = req.body;
  if(!name || !email || !password){
    return res.status(400).json({message:"All fields are required"});
  }
  try{

  const hashPassword =await bcrypt.hash(password,10);
  const user = {
    id: randomUUID(), 
    name,
    email,
    password:hashPassword
  };
  await db.send(new PutCommand({ TableName: TABLE, Item: user }));
  res.json({ message: "User created", user: { id: user.id, name, email } });
}catch (error){

  console.error("Error Creating User",error);
  res.status(500).json({ message: "Error creating user" });
}
});

//login

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const result = await db.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email }
    }));

    const user = result.Items[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Compare entered password with stored hash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // 3. Login success
    res.json({ message: "Login successful", user: { id: user.id, name: user.name, email: user.email } });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// PUT - fully update a user
app.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email ,password} = req.body;

  // first check if user exists
  const existing = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }));

  if (!existing.Item) {
    return res.status(404).json({ message: "User not found" });
  }

  const updatedUser = {
    id,        
    name,      
    email,
    password : hashPassword   
  };

  await db.send(new PutCommand({
    TableName: TABLE,
    Item: updatedUser
  }));

  res.json({ message: "User fully updated", user: updatedUser });
});


// PATCH - partially update a user
app.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body; // only fields you want to change

  // first check if user exists
  const existing = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }));

  if (!existing.Item) {
    return res.status(404).json({ message: "User not found" });
  }

  // dynamically build update for only sent fields
  const keys = Object.keys(data);
  if(data.password){
    data.password =await bcrypt.hash(data.password,10);
  } // ["name"] or ["email"] or ["name", "email" ,"password"]

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
});


app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { id }
  }));
  if (!result.Item) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user: result.Item });
});

//Delete Command
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  await db.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id }
  }));
  res.json({ message: `User ${id} deleted` });
});

if (process.env.AWS_EXECUTION_ENV === undefined) {
  app.listen(PORT, () => console.log(`Server running on the  port ${PORT}`));
}

export { handler };