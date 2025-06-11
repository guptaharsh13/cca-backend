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
  fileFilter: (req, file, cb) => {
    // Allow specified file formats
    const allowedMimes = [
      // PDF
      "application/pdf",
      // Word Documents
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/tiff",
      "image/tif",
      // Videos
      "video/mp4",
      "video/quicktime", // .mov
      "video/x-msvideo", // .avi
      // Audio
      "audio/mpeg", // .mp3
      "audio/wav",
      "audio/wave",
      "audio/x-wav",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, Word documents, JPEG, PNG, TIFF, MP4, MOV, AVI, MP3, and WAV files are allowed."
        )
      );
    }
  },
});

// Function to upload file to S3
async function uploadToS3(file, fileName) {
  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    // ACL: "public-read",
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

// Function to upload multiple files to S3
async function uploadMultipleFilesToS3(files) {
  if (!files || files.length === 0) {
    return null;
  }

  const uploadPromises = files.map(async (file) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `ccapatrika/${timestamp}-${randomId}-${file.originalname}`;
    return await uploadToS3(file, fileName);
  });

  try {
    const uploadedUrls = await Promise.all(uploadPromises);
    return uploadedUrls.join(",");
  } catch (error) {
    console.error("Error uploading multiple files to S3:", error);
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

// Endpoint to handle the form submission with multiple file uploads
app.post(
  "/api/submit-entry",
  upload.array("visual_files"),
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

      let visual_links = null;

      // Handle multiple file uploads if present
      if (req.files && req.files.length > 0) {
        visual_links = await uploadMultipleFilesToS3(req.files);
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
          visual_links,
          why_outstanding
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        visual_links,
        why_outstanding,
      ];

      // Use promise-based query for better error handling
      const promiseDb = db.promise();

      try {
        const [result] = await promiseDb.execute(query, values);
        console.log("Insert successful, ID:", result.insertId);

        res.status(200).json({
          message: "Entry successfully submitted!",
          visual_links: visual_links,
          entry_id: result.insertId,
        });
      } catch (err) {
        console.error("Error inserting data:", err);
        console.error("SQL State:", err.sqlState);
        console.error("Error Code:", err.code);
        console.error("SQL Message:", err.sqlMessage);

        // Check if it's specifically the visual_links column issue
        if (
          err.code === "ER_BAD_FIELD_ERROR" &&
          err.sqlMessage.includes("visual_links")
        ) {
          console.error("CRITICAL: visual_links column issue detected");

          // Try to re-verify the column exists
          try {
            const [columns] = await promiseDb.execute(
              "SHOW COLUMNS FROM submissions LIKE 'visual_links'"
            );
            console.log("Column check result:", columns);
          } catch (checkErr) {
            console.error("Error checking column:", checkErr);
          }
        }

        return res.status(500).json({
          message: "Error saving the entry.",
          error:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }
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
