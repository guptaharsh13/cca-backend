import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("common"));
app.use(express.json());

const port = process.env.PORT || 3001;

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

app.get("/health", (req, res) => {
  res.send("CCA Backend is running");
});

// Endpoint to handle the form submission
app.post("/submit-entry", (req, res) => {
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
    visual_link,
    why_outstanding,
  } = req.body;

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
    res.status(200).json({ message: "Entry successfully submitted!" });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
