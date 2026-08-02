-- ============================================
-- Sneakers Take Off - Database Schema
-- ============================================

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_en TEXT,
  description_ar TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_price DECIMAL(10,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  slug TEXT UNIQUE NOT NULL,
  featured BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  total DECIMAL(10,2) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  notes TEXT,
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Insert sample categories
INSERT INTO categories (name_en, name_ar, slug) VALUES
  ('Men', 'رجالي', 'men'),
  ('Women', 'نسائي', 'women'),
  ('Kids', 'أطفال', 'kids'),
  ('Sports', 'رياضي', 'sports')
ON CONFLICT (slug) DO NOTHING;

-- 6. Insert sample products
INSERT INTO products (name_en, name_ar, description_en, description_ar, price, category_id, slug, sizes, colors, stock, featured)
VALUES
  (
    'Air Max Pulse',
    'إير ماكس بولس',
    'Premium comfort sneaker with advanced cushioning technology.',
    'حذاء رياضي فاخر بتقنية وسائد متطورة.',
    149.99,
    (SELECT id FROM categories WHERE slug = 'men'),
    'air-max-pulse',
    ARRAY['EU 39','EU 40','EU 41','EU 42','EU 43','EU 44'],
    ARRAY['#000','#fff','#f97316'],
    50,
    true
  ),
  (
    'Runner X Pro',
    'رانر إكس برو',
    'High-performance running shoe designed for speed and comfort.',
    'حذاء جري عالي الأداء مصمم للسرعة والراحة.',
    129.99,
    (SELECT id FROM categories WHERE slug = 'sports'),
    'runner-x-pro',
    ARRAY['EU 38','EU 39','EU 40','EU 41','EU 42','EU 43'],
    ARRAY['#000','#2563eb','#dc2626'],
    35,
    true
  ),
  (
    'Street Style 3000',
    'ستريت ستايل 3000',
    'Trendy streetwear sneaker for everyday fashion.',
    'حذاء ستريت الأنيق للموضة اليومية.',
    99.99,
    (SELECT id FROM categories WHERE slug = 'women'),
    'street-style-3000',
    ARRAY['EU 36','EU 37','EU 38','EU 39','EU 40'],
    ARRAY['#fff','#f9a8d4','#a78bfa'],
    40,
    true
  ),
  (
    'Classic Low Top',
    'كلاسيك لو توب',
    'Classic low-top sneaker perfect for kids.',
    'حذاء كلاسيك مثالي للأطفال.',
    89.99,
    (SELECT id FROM categories WHERE slug = 'kids'),
    'classic-low-top',
    ARRAY['EU 28','EU 29','EU 30','EU 31','EU 32','EU 33'],
    ARRAY['#000','#fff','#16a34a'],
    60,
    true
  ),
  (
    'Urban Walker',
    'أوربان ووكر',
    'Comfortable walking shoe with modern design.',
    'حذاء مشي مريح بتصميم عصري.',
    119.99,
    (SELECT id FROM categories WHERE slug = 'men'),
    'urban-walker',
    ARRAY['EU 39','EU 40','EU 41','EU 42','EU 43','EU 44','EU 45'],
    ARRAY['#000','#4b5563','#1e40af'],
    25,
    false
  ),
  (
    'Flex Trainer',
    'فليكس ترينر',
    'Versatile training shoe for gym and casual wear.',
    'حذاء تمرين متعدد الاستخدامات للجيم والارتداء اليومي.',
    109.99,
    (SELECT id FROM categories WHERE slug = 'sports'),
    'flex-trainer',
    ARRAY['EU 38','EU 39','EU 40','EU 41','EU 42','EU 43','EU 44'],
    ARRAY['#000','#dc2626','#f97316'],
    30,
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- 7. Set first user as admin (run after your first signup)
-- Uncomment and replace with your email after signing up:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
