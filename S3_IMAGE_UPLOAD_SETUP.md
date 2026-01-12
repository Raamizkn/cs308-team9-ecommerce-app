# S3 Image Upload Setup Guide

This guide covers setting up Amazon S3 bucket and environment variables for product image uploads.

## Step 1: Create S3 Bucket

1. Go to **AWS S3 Console**
2. Click **"Create bucket"**
3. Configure bucket:
   - **Bucket name**: `amzn-s3-pixelvault` (or your preferred name)
   - **Region**: Choose your preferred region (e.g., `us-east-1`)
   - **Block Public Access**: Uncheck "Block public access to buckets and objects granted through new access control lists (ACLs)"
   - Keep other public access settings as needed
4. Click **"Create bucket"**

## Step 2: Configure S3 Bucket Policy

1. Go to your S3 bucket → **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit** and paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::amzn-s3-pixelvault/products/*"
    }
  ]
}
```

**Note**: Replace `amzn-s3-pixelvault` with your actual bucket name.

4. Click **Save changes**

## Step 3: Create IAM User and Policy

1. Go to **AWS IAM Console** → **Users**
2. Click **Create user**
3. User name: `PixelVaultProductManager` (or your preferred name)
4. Select **Access key - Programmatic access**
5. Click **Next**

### Attach IAM Policy

1. Click **Add permissions** → **Create inline policy**
2. Switch to **JSON** tab
3. Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowProductImageUpload",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::amzn-s3-pixelvault/products/*"
    },
    {
      "Sid": "AllowListBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::amzn-s3-pixelvault",
      "Condition": {
        "StringLike": {
          "s3:prefix": "products/*"
        }
      }
    }
  ]
}
```

**Note**: Replace `amzn-s3-pixelvault` with your actual bucket name.

4. Click **Next** → Name the policy: `PixelVaultS3UploadPolicy`
5. Click **Create policy**

### Save Access Keys

1. After creating the user, go to **Security credentials** tab
2. Click **Create access key**
3. Choose **Application running outside AWS**
4. **Save the Access Key ID and Secret Access Key** - you'll need these for environment variables

## Step 4: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```env
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=amzn-s3-pixelvault
```

**Important**: 
- Replace values with your actual credentials
- Replace `us-east-1` with the region where your S3 bucket is located
- Replace `amzn-s3-pixelvault` with your actual bucket name
- Never commit `.env.local` to version control

## Step 5: Install Dependencies

Install required packages:

```bash
yarn add @aws-sdk/client-s3 sharp
```

## Verification

After completing the setup:

1. Start your development server:
   ```bash
   yarn dev
   ```

2. Test the upload:
   - Log in as a product manager
   - Go to Product Manager Control Room
   - Create a new product and upload an image
   - Verify the image appears correctly

## Troubleshooting

### Error: "User is not authorized to perform: s3:PutObject"

- Verify IAM user has the correct policy attached
- Check that the policy resource ARN matches your bucket name
- Ensure the policy allows `s3:PutObject` on `products/*` path

### Error: "Bucket does not allow ACLs"

- Ensure bucket policy allows `s3:GetObject` on `products/*`
- Check that "Block public access to buckets and objects granted through new access control lists (ACLs)" is unchecked

### Images not displaying

- Verify bucket policy allows public read access
- Check that image URLs in database are correct S3 URLs
- Verify CORS is configured if accessing from different domain

