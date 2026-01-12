import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSupabaseServerClient } from "@/lib/supabase/server"

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager
    const { data: pmData } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (!pmData) {
      return NextResponse.json({ error: "Forbidden: Product manager access required" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validate file size (e.g., max 10MB before conversion)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Dynamically import sharp only at runtime (not during build)
    const sharp = (await import("sharp")).default

    // Convert to WebP using sharp - resize to fit within square (no cropping)
    // Remove white/light backgrounds and make them transparent
    let webpBuffer: Buffer
    try {
      // First, resize to fit within 1200x1200 square, maintaining aspect ratio
      let processed = sharp(buffer)
        .resize(1200, 1200, {
          fit: "inside", // Fits within dimensions, maintains aspect ratio
          withoutEnlargement: true, // Don't enlarge small images
        })
        .ensureAlpha() // Ensure alpha channel exists

      // Get image data to process white background removal
      const { data, info } = await processed
        .raw()
        .toBuffer({ resolveWithObject: true })

      // Process pixels to make white/light backgrounds transparent
      const threshold = 240 // Pixels with RGB values above this are considered "white"
      const channels = info.channels
      const pixelCount = info.width * info.height
      
      for (let i = 0; i < pixelCount; i++) {
        const pixelIndex = i * channels
        const r = data[pixelIndex]
        const g = data[pixelIndex + 1]
        const b = data[pixelIndex + 2]
        
        // Check if pixel is white/very light (high RGB values, similar values = white/gray)
        // Also check if it's close to white (high average)
        const avg = (r + g + b) / 3
        const isWhite = avg >= threshold && Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10
        
        if (isWhite && channels === 4) {
          // Make white pixels fully transparent
          const alphaIndex = pixelIndex + 3
          data[alphaIndex] = 0
        }
      }

      // Convert back to WebP with transparency support
      webpBuffer = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: channels,
        },
      })
        .webp({ 
          quality: 85,
          effort: 6,
          nearLossless: false,
        })
        .toBuffer()
    } catch (error) {
      console.error("[Group9] Error converting image to WebP:", error)
      // Fallback: simple resize without background removal
      try {
        webpBuffer = await sharp(buffer)
          .resize(1200, 1200, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .ensureAlpha()
          .webp({ quality: 85 })
          .toBuffer()
      } catch (fallbackError) {
        return NextResponse.json({ error: "Failed to process image" }, { status: 500 })
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileName = `products/${timestamp}-${randomString}.webp`

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: fileName,
      Body: webpBuffer,
      ContentType: "image/webp",
      // ACL removed - bucket policy will handle public access
    })

    await s3Client.send(command)

    // Construct public URL
    const imageUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`

    return NextResponse.json({ imageUrl }, { status: 200 })
  } catch (error) {
    console.error("[Group9] Error uploading image:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    )
  }
}

