-- Category hierarchy: subcategories inside categories
-- Run this in Supabase SQL Editor once.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- Optional: seed clothing subcategories under a "Clothing" category.
-- Create a parent "Clothing" category if it does not already exist, then
-- attach كنزات (Sweaters), شورتات (Shorts), بناطيل (Pants) as children.
-- Adjust slugs to match your existing naming scheme.
INSERT INTO categories (name_en, name_ar, slug, active, sort_order)
VALUES ('Clothing', 'ملابس', 'clothing', true, 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name_en, name_ar, slug, active, sort_order, parent_id)
VALUES
  ('Sweaters', 'كنزات', 'clothing-sweaters', true, 0, (SELECT id FROM categories WHERE slug = 'clothing')),
  ('Shorts', 'شورتات', 'clothing-shorts', true, 1, (SELECT id FROM categories WHERE slug = 'clothing')),
  ('Pants', 'بناطيل', 'clothing-pants', true, 2, (SELECT id FROM categories WHERE slug = 'clothing'))
ON CONFLICT (slug) DO NOTHING;
