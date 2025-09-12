-- Seed data for development
-- This file contains sample data for local development

-- Insert sample organizations
INSERT INTO organizations (name) VALUES 
    ('Sigma Kappa Delta'),
    ('Sigma Tau Delta')
ON CONFLICT (name) DO NOTHING;

-- Insert sample schools
INSERT INTO schools (name, organization_id) VALUES 
    ('University of Alabama', (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta')),
    ('Auburn University', (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta')),
    ('University of Georgia', (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta')),
    ('Georgia Tech', (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta'))
ON CONFLICT (name, organization_id) DO NOTHING;

-- Insert sample members
INSERT INTO members (name, school_id, organization_id, submission_url) VALUES 
    ('Jane Doe', (SELECT id FROM schools WHERE name = 'University of Alabama'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/jane-doe'),
    ('John Smith', (SELECT id FROM schools WHERE name = 'University of Alabama'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/john-smith'),
    ('Alice Johnson', (SELECT id FROM schools WHERE name = 'Auburn University'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/alice-johnson'),
    ('Bob Wilson', (SELECT id FROM schools WHERE name = 'University of Georgia'), (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta'), 'https://example.com/submit/bob-wilson')
ON CONFLICT DO NOTHING;

-- Insert sample admin
INSERT INTO admins (email, role) VALUES 
    ('admin@example.com', 'admin')
ON CONFLICT (email) DO NOTHING;
