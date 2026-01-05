
-- deployment/first-deployment.sql

-- 1. Create User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MERCHANT')),
    PRIMARY KEY (user_id, role)
);

-- 2. Force RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.merchants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

-- 3. RLS Policies for user_roles
CREATE POLICY "Admins can read all roles" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- 4. RLS Policies for merchants
CREATE POLICY "Public read for merchants" 
ON public.merchants FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Authenticated users can apply for merchant status" 
ON public.merchants FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own merchant data" 
ON public.merchants FOR UPDATE 
TO authenticated 
USING (
    owner_id = auth.uid() AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
);

CREATE POLICY "Admins have full control over merchants" 
ON public.merchants ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- 5. RLS Policies for products
CREATE POLICY "Public read for products" 
ON public.products FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Owners can manage their products" 
ON public.products ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = public.products.merchant_id 
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Admins can manage all products" 
ON public.products ALL 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);
