import { NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// GET - Fetch all products for product manager
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager
    const { data: pmData, error: pmError } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (pmError || !pmData) {
      return NextResponse.json({ error: "Forbidden: Product manager access required" }, { status: 403 })
    }

    // Fetch all products with category information
    const { data: products, error } = await supabase
      .from("products_belong_to")
      .select("*, categories(name)")
      .order("pid", { ascending: false })

    if (error) {
      console.error("[Group9] Error fetching products:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedProducts = products?.map((product) => ({
      pid: product.pid,
      name: product.name,
      sku: product.serial_number || "",
      category: product.categories?.name || "",
      stock: product.stock_quantity,
      reorderPoint: 0, // Not in DB schema, defaulting to 0
      price: Number(product.price),
      warehouse: product.distributor_info || "Central", // Using distributor_info as warehouse
      model: product.model,
      description: product.description,
      warranty_status: product.warranty_status,
      product_cost: product.product_cost ? Number(product.product_cost) : null,
      cid: product.cid,
    }))

    return NextResponse.json({ products: transformedProducts || [] })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Add a new product
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    
    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is a product manager
    const { data: pmData, error: pmError } = await supabase
      .from("product_managers")
      .select("uid")
      .eq("uid", user.id)
      .maybeSingle()

    if (pmError || !pmData) {
      return NextResponse.json({ error: "Forbidden: Product manager access required" }, { status: 403 })
    }

    const body = await request.json()
    const { name, sku, category, price, stock, model, description, warranty_status, distributor_info, product_cost } = body

    // Validate required fields
    if (!name || !price || stock === undefined || !category) {
      return NextResponse.json(
        { error: "Missing required fields: name, price, stock, and category are required" },
        { status: 400 }
      )
    }

    // Validate price and stock are non-negative
    if (Number(price) < 0 || Number(stock) < 0) {
      return NextResponse.json(
        { error: "Price and stock must be non-negative" },
        { status: 400 }
      )
    }

    // Get category ID from category name
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("cid")
      .eq("name", category)
      .maybeSingle()

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: `Category "${category}" not found` },
        { status: 400 }
      )
    }

    // Check if serial_number (SKU) already exists if provided
    if (sku) {
      const { data: existingProduct } = await supabase
        .from("products_belong_to")
        .select("pid")
        .eq("serial_number", sku)
        .maybeSingle()

      if (existingProduct) {
        return NextResponse.json(
          { error: "Product with this SKU already exists" },
          { status: 400 }
        )
      }
    }

    // Insert new product
    const { data: newProduct, error: insertError } = await supabase
      .from("products_belong_to")
      .insert({
        name,
        serial_number: sku || null,
        model: model || null,
        description: description || null,
        price: Number(price),
        stock_quantity: Number(stock),
        warranty_status: warranty_status || null,
        distributor_info: distributor_info || null,
        product_cost: product_cost ? Number(product_cost) : null,
        cid: categoryData.cid,
      })
      .select("*, categories(name)")
      .single()

    if (insertError) {
      console.error("[Group9] Error inserting product:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Transform response to match frontend interface
    const transformedProduct = {
      pid: newProduct.pid,
      name: newProduct.name,
      sku: newProduct.serial_number || "",
      category: newProduct.categories?.name || "",
      stock: newProduct.stock_quantity,
      reorderPoint: 0,
      price: Number(newProduct.price),
      warehouse: newProduct.distributor_info || "Central",
      model: newProduct.model,
      description: newProduct.description,
      warranty_status: newProduct.warranty_status,
      product_cost: newProduct.product_cost ? Number(newProduct.product_cost) : null,
      cid: newProduct.cid,
    }

    return NextResponse.json({ product: transformedProduct }, { status: 201 })
  } catch (error) {
    console.error("[Group9] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

