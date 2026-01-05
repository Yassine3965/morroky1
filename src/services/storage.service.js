import { supabase } from './supabase';

class StorageService {
    constructor() {
        this.bucketName = 'image';
    }

    /**
     * Uploads an avatar file to Supabase Storage and returns the public URL.
     * @param {File} file - The file object to upload
     * @param {string} userId - The user ID to associate with the avatar
     * @returns {Promise<string>} - The public URL of the uploaded avatar
     */
    async uploadAvatar(file, userId) {
        try {
            // التحقق من تسجيل دخول المستخدم
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("يرجى تسجيل الدخول أولاً لرفع الصور!");
            }

            // التأكد من أن userId يطابق المستخدم الحالي
            if (userId !== user.id) {
                throw new Error("لا يمكنك رفع صور لمستخدم آخر!");
            }

            // Use 'image' bucket for avatars (existing bucket)
            const avatarBucket = 'image';

            // Create file path in avatars folder
            const filePath = `avatars/${userId}_${file.name}`;

            // First try to upload without upsert to see if file exists
            let { data, error } = await supabase.storage
                .from(avatarBucket)
                .upload(filePath, file, { upsert: false });

            // If file exists, try with upsert
            if (error && error.message.includes('already exists')) {
                ({ data, error } = await supabase.storage
                    .from(avatarBucket)
                    .upload(filePath, file, { upsert: true }));
            }

            if (error) {
                // Handle RLS policy errors with helpful message
                if (error.message && (error.message.includes('row-level security') || error.message.includes('violates'))) {
                    throw new Error(`فشل رفع الصورة: انتهاك سياسة الأمان. تحتاج إلى إعداد صلاحيات التحميل في Supabase. انتقل إلى Storage > Policies وأضف سياسة جديدة:

اسم السياسة: "Allow avatar uploads"
الأمر: INSERT
المستخدمون: authenticated
الشرط: bucket_id = 'image'

أو للسماح للجميع بالتحميل:
اسم السياسة: "Allow public uploads"
الأمر: INSERT
المستخدمون: public
الشرط: bucket_id = 'image'`);
                }
                throw error;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(avatarBucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }

    /**
     * Uploads a file to Supabase Storage and returns the public URL.
     * @param {File} file - The file object to upload
     * @param {string} path - Optional folder path (e.g. 'logos' or 'products')
     * @returns {Promise<string>} - The public URL of the uploaded image
     */
    async uploadImage(file, folder = 'uploads') {
        try {
            // لا داعي لـ ensureBucketExists إذا كنت قد أنشأت المجلد يدوياً

            // Create a unique file name with extension
            const timestamp = new Date().getTime();
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(this.bucketName)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                // رسالة خطأ ذكية للمبرمج
                if (error.message?.includes('row-level security')) {
                    console.error("خطأ أمن: تأكد من تشغيل SQL Policies التي أعددناها سابقاً");
                }
                throw error;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from(this.bucketName)
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (error) {
            console.error("فشل الرفع:", error.message);
            throw error;
        }
    }

    /**
     * Ensures the storage bucket exists and has proper policies
     * @param {string} bucketName - Name of the bucket to ensure exists
     * @param {string[]} allowedMimeTypes - Array of allowed MIME types
     */
    async ensureBucketExists(bucketName = this.bucketName, allowedMimeTypes = ['image/*']) {
        try {
            // Check if bucket exists
            const { data: buckets, error: listError } = await supabase.storage.listBuckets();

            if (listError) {
                console.error("Error listing buckets:", listError);
                throw listError;
            }

            const bucketExists = buckets.some(bucket => bucket.name === bucketName);

            if (!bucketExists) {
                console.log(`Bucket '${bucketName}' does not exist, creating it...`);

                // Create the bucket
                const { error: createError } = await supabase.storage.createBucket(bucketName, {
                    public: true, // Make bucket public for image access
                    allowedMimeTypes: allowedMimeTypes,
                    fileSizeLimit: 10485760 // 10MB limit
                });

                if (createError) {
                    console.error("Error creating bucket:", createError);
                    throw createError;
                }

                console.log(`Bucket '${bucketName}' created successfully`);

                // Try to create RLS policies for public access
                await this.setupStoragePolicies(bucketName);
            }
        } catch (error) {
            console.error("Error ensuring bucket exists:", error);
            throw error;
        }
    }

    /**
     * Sets up storage policies to allow public uploads
     * @param {string} bucketName - Name of the bucket for which to set up policies
     */
    async setupStoragePolicies(bucketName = 'image') {
        try {
            console.log("Setting up storage policies...");

            // Note: These SQL commands would need to be run in Supabase dashboard
            // Since we can't execute them programmatically with the anon key,
            // we'll log instructions for manual setup
            console.log(`
⚠️  STORAGE POLICY SETUP REQUIRED ⚠️

To allow image uploads, you need to run these SQL commands in your Supabase dashboard:

1. Go to SQL Editor in Supabase Dashboard
2. Run these commands:

-- Allow public access to the ${bucketName} bucket
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING (bucket_id = '${bucketName}');

-- Or more specifically for uploads:
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = '${bucketName}');

-- Allow public to view images:
CREATE POLICY "Allow public viewing" ON storage.objects FOR SELECT USING (bucket_id = '${bucketName}');

Alternatively, you can disable RLS for the storage.objects table (not recommended for production):
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

For now, the bucket has been created but uploads will fail until policies are set.
            `);

        } catch (error) {
            console.error("Error setting up policies:", error);
        }
    }
}

export default new StorageService();
