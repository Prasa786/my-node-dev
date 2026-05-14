import { fail } from "assert";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
    failOnErrors: false, // Throw errors if the specification is invalid
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
        url: "http://16.170.252.49",
        description: "Production EC2 server",
      },
    ],
     components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./index.mjs"], 
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;