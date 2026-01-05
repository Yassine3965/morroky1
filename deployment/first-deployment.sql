
-- deployment/first-deployment.sql

-- 1. Create User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MERCHANT')),
    PRIMARY KEY (user_id, role)
);

-- Merchants Table (add status column)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Create Wholesale Prices Table (assuming for product wholesale prices)
CREATE TABLE IF NOT EXISTS public.wholesale_prices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Force RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_prices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.merchants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wholesale_prices FORCE ROW LEVEL SECURITY;

-- 4. RLS Policies for user_roles (SELECT only for ADMIN, no runtime INSERT/UPDATE/DELETE)
CREATE POLICY "Admins can read all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- No INSERT, UPDATE, DELETE policies for runtime - only via one-time script

-- 5. RLS Policies for merchants (with status: pending/approved/rejected)
CREATE POLICY "Public can read approved merchants"
ON public.merchants FOR SELECT
TO public
USING (status = 'approved');

CREATE POLICY "Users can read their own merchant applications"
ON public.merchants FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Authenticated users can apply for merchant status"
ON public.merchants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id AND status = 'pending');

CREATE POLICY "Owners can update pending applications"
ON public.merchants FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid() AND status = 'pending'
)
WITH CHECK (
    owner_id = auth.uid() AND status = 'pending'
);

CREATE POLICY "Approved merchants can update their data"
ON public.merchants FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid() AND status = 'approved' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
)
WITH CHECK (
    owner_id = auth.uid() AND status = 'approved' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
);

CREATE POLICY "Admins can update merchants status"
ON public.merchants FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Admins can delete merchants"
ON public.merchants FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- 6. RLS Policies for products
CREATE POLICY "Merchants can read their products"
ON public.products FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = public.products.merchant_id
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Owners can insert their products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = merchant_id
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Owners can update their products"
ON public.products FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = public.products.merchant_id
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = public.products.merchant_id
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Owners can delete their products"
ON public.products FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = public.products.merchant_id
        AND owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

-- 7. RLS Policies for wholesale_prices (only ADMIN and owning MERCHANT)
CREATE POLICY "Owners can read their wholesale prices"
ON public.wholesale_prices FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.merchants m ON p.merchant_id = m.id
        WHERE p.id = public.wholesale_prices.product_id
        AND m.owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    ) OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Owners can insert their wholesale prices"
ON public.wholesale_prices FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.merchants m ON p.merchant_id = m.id
        WHERE p.id = product_id
        AND m.owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Owners can update their wholesale prices"
ON public.wholesale_prices FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.merchants m ON p.merchant_id = m.id
        WHERE p.id = public.wholesale_prices.product_id
        AND m.owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.merchants m ON p.merchant_id = m.id
        WHERE p.id = public.wholesale_prices.product_id
        AND m.owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Owners can delete their wholesale prices"
ON public.wholesale_prices FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        JOIN public.merchants m ON p.merchant_id = m.id
        WHERE p.id = public.wholesale_prices.product_id
        AND m.owner_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'MERCHANT')
    )
);

CREATE POLICY "Admins can insert wholesale prices"
ON public.wholesale_prices FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Admins can update wholesale prices"
ON public.wholesale_prices FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);

CREATE POLICY "Admins can delete wholesale prices"
ON public.wholesale_prices FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
);
