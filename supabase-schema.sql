-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schools table
CREATE TABLE schools (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, organization_id)
);

-- Create members table
CREATE TABLE members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    submission_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_schools_organization_id ON schools(organization_id);
CREATE INDEX idx_members_school_id ON members(school_id);
CREATE INDEX idx_members_organization_id ON members(organization_id);
CREATE INDEX idx_members_name ON members(name);

-- Insert sample data
INSERT INTO organizations (name) VALUES 
    ('Sigma Kappa Delta'),
    ('Sigma Tau Delta');

-- Insert sample schools
INSERT INTO schools (name, organization_id) VALUES 
    ('University of Alabama', (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta')),
    ('Auburn University', (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta')),
    ('University of Georgia', (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta')),
    ('Georgia Tech', (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta'));

-- Insert sample members
INSERT INTO members (name, school_id, organization_id, submission_url) VALUES 
    ('Jane Doe', (SELECT id FROM schools WHERE name = 'University of Alabama'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/jane-doe'),
    ('John Smith', (SELECT id FROM schools WHERE name = 'University of Alabama'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/john-smith'),
    ('Alice Johnson', (SELECT id FROM schools WHERE name = 'Auburn University'), (SELECT id FROM organizations WHERE name = 'Sigma Kappa Delta'), 'https://example.com/submit/alice-johnson'),
    ('Bob Wilson', (SELECT id FROM schools WHERE name = 'University of Georgia'), (SELECT id FROM organizations WHERE name = 'Sigma Tau Delta'), 'https://example.com/submit/bob-wilson');

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Organizations are viewable by everyone" ON organizations FOR SELECT USING (true);
CREATE POLICY "Schools are viewable by everyone" ON schools FOR SELECT USING (true);
CREATE POLICY "Members are viewable by everyone" ON members FOR SELECT USING (true);

-- Create policies for admin access
CREATE POLICY "Admins can manage organizations" ON organizations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.email = auth.jwt() ->> 'email'
    )
);

CREATE POLICY "Admins can manage schools" ON schools FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.email = auth.jwt() ->> 'email'
    )
);

CREATE POLICY "Admins can manage members" ON members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.email = auth.jwt() ->> 'email'
    )
);

CREATE POLICY "Admins can view admin table" ON admins FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admins 
        WHERE admins.email = auth.jwt() ->> 'email'
    )
);
