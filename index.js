import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mysql from "mysql2";
import dotenv from "dotenv";
import multer from "multer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("common"));
app.use(express.json());

const port = process.env.PORT || 3001;

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Configure multer for file upload handling
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  // limits: {
  //   fileSize: 10 * 1024 * 1024, // 10MB limit
  // },
  // fileFilter: (req, file, cb) => {
  //   // Allow common image and document formats
  //   const allowedMimes = [
  //     "image/jpeg",
  //     "image/png",
  //     "image/gif",
  //     "application/pdf",
  //     "application/msword",
  //     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  //   ];

  //   if (allowedMimes.includes(file.mimetype)) {
  //     cb(null, true);
  //   } else {
  //     cb(
  //       new Error("Invalid file type. Only images and documents are allowed.")
  //     );
  //   }
  // },
});

// Function to upload file to S3
async function uploadToS3(file, fileName) {
  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Return the S3 URL
    return `https://${S3_BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

// MySQL Database connection setup
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "cca_responses",
});

// Test database connection
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to MySQL database");
});

app.get("/api/health", (req, res) => {
  res.send("CCA Backend is running");
});

// Endpoint to handle the form submission with file upload
app.post(
  "/api/submit-entry",
  upload.single("visual_file"),
  async (req, res) => {
    try {
      const {
        full_name,
        email_address,
        contact_number,
        submission_capacity,
        team_members,
        prize_cheque_name,
        consent_declarations,
        challenge,
        insight,
        strategic_idea,
        strategy_execution,
        expected_results,
        entry_topic,
        concept_strategy,
        objective,
        rationale,
        measurement,
        insight_description,
        strategic_solution,
        creative_plan,
        communication_strategy,
        result_impact,
        result_scope,
        why_outstanding,
      } = req.body;

      let visual_link = null;

      // Handle file upload if present
      if (req.file) {
        const timestamp = Date.now();
        const fileName = `ccapatrika/${timestamp}-${req.file.originalname}`;
        visual_link = await uploadToS3(req.file, fileName);
      }

      const query = `
      INSERT INTO submissions (
        full_name,
        email_address,
        contact_number,
        submission_capacity,
        team_members,
        prize_cheque_name,
        consent_declarations,
        challenge,
        insight,
        strategic_idea,
        strategy_execution,
        expected_results,
        entry_topic,
        concept_strategy,
        objective,
        rationale,
        measurement,
        insight_description,
        strategic_solution,
        creative_plan,
        communication_strategy,
        result_impact,
        result_scope,
        visual_link,
        why_outstanding
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

      const values = [
        full_name,
        email_address,
        contact_number,
        submission_capacity,
        team_members,
        prize_cheque_name,
        consent_declarations,
        challenge,
        insight,
        strategic_idea,
        strategy_execution,
        expected_results,
        entry_topic,
        concept_strategy,
        objective,
        rationale,
        measurement,
        insight_description,
        strategic_solution,
        creative_plan,
        communication_strategy,
        result_impact,
        result_scope,
        visual_link,
        why_outstanding,
      ];

      db.query(query, values, (err, result) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).json({ message: "Error saving the entry." });
        }
        res.status(200).json({
          message: "Entry successfully submitted!",
          visual_link: visual_link,
        });
      });
    } catch (error) {
      console.error("Error processing submission:", error);
      res.status(500).json({
        message: "Error processing submission.",
        error: error.message,
      });
    }
  }
);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
