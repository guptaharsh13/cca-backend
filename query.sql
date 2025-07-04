CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    email_address VARCHAR(255),
    contact_number VARCHAR(255),
    submission_capacity ENUM('Agency', 'Freelancer', 'Corporation'),
    team_members TEXT,
    prize_cheque_name VARCHAR(255),
    consent_declarations TEXT,
    challenge TEXT,
    insight TEXT,
    strategic_idea TEXT,
    strategy_execution TEXT,
    expected_results TEXT,
    entry_topic TEXT,
    concept_strategy TEXT,
    objective TEXT,
    rationale TEXT,
    measurement TEXT,
    insight_description TEXT,
    strategic_solution TEXT,
    creative_plan TEXT,
    communication_strategy TEXT,
    result_impact TEXT,
    result_scope VARCHAR(255),
    visual_link TEXT,
    why_outstanding TEXT
);

ALTER TABLE submissions CHANGE COLUMN visual_link visual_links TEXT;