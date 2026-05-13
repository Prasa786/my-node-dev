import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "My Node.js API",
      version: "1.0.0",
      description: "REST API with DynamoDB on AWS EC2",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local server",
      },
      {
        url: "http://YOUR-EC2-PUBLIC-IP",
        description: "Production EC2 server",
      },
    ],
  },
  apis: ["./server.js"], // reads comments from server.js
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;