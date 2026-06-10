import pool from "../config/db.js";

export async function getFeaturedProducts(req, res) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 20),
    );
    const offset = (page - 1) * pageSize;

    let whereClause = "";
    const values = [];
    let valueCounter = 1;

    if (!includeInactive) {
      whereClause = "WHERE fp.is_active = true";
    }

    // Count total featured products
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM featured_products fp
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / pageSize);

    // Fetch featured products with product details
    const selectQuery = `
      SELECT
        fp.id AS featured_id,
        fp.is_active,
        fp.created_at AS featured_created_at,
        fp.updated_at AS featured_updated_at,
        p.id AS product_id,
        p.part_number,
        p.oem_number,
        p.price,
        p.discount,
        p.image_url,
        p.name,
        p.model_year,
        p.side,
        p.metadata,
        cb.id AS car_brand_id,
        cb.name AS car_brand_name,
        cm.id AS car_model_id,
        cm.name AS car_model_name,
        et.id AS engine_type_id,
        et.engine_code,
        c.id AS company_id,
        c.name AS company_name,
        ib.id AS item_brand_id,
        ib.name AS item_brand_name,
        cat.id AS category_id,
        cat.name AS category_name
      FROM featured_products fp
      INNER JOIN products p ON fp.product_id = p.id
      LEFT JOIN car_brands cb ON p.car_brand_id = cb.id
      LEFT JOIN car_model cm ON p.car_model_id = cm.id
      LEFT JOIN engine_type et ON p.engine_type_id = et.id
      LEFT JOIN company c ON p.company_id = c.id
      LEFT JOIN item_brands ib ON p.items_brand_id = ib.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      ${whereClause}
      ORDER BY fp.created_at DESC
      LIMIT $${valueCounter++} OFFSET $${valueCounter++}
    `;

    const queryValues = [...values, pageSize, offset];
    const result = await pool.query(selectQuery, queryValues);

    const featuredProducts = result.rows.map((row) => ({
      featured_id: row.featured_id,
      is_active: row.is_active,
      featured_created_at: row.featured_created_at,
      featured_updated_at: row.featured_updated_at,
      product: {
        id: row.product_id,
        part_number: row.part_number,
        oem_number: row.oem_number,
        price: parseFloat(row.price),
        discount: parseFloat(row.discount),
        image_url: row.image_url || [],
        name: row.name,
        car_brand: { id: row.car_brand_id, name: row.car_brand_name },
        car_model: { id: row.car_model_id, name: row.car_model_name },
        model_year: row.model_year,
        engine_type: { id: row.engine_type_id, engine_code: row.engine_code },
        side: row.side === "none" ? null : row.side,
        company: { id: row.company_id, name: row.company_name },
        item_brand: { id: row.item_brand_id, name: row.item_brand_name },
        category: { id: row.category_id, name: row.category_name },
        metadata: row.metadata,
      },
    }));

    res.status(200).json({
      data: featuredProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching featured products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Add a product to featured list
export async function addFeaturedProduct(req, res) {
  try {
    const { product_id, is_active = true } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: "product_id is required" });
    }

    // Check if product exists
    const productCheck = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [product_id],
    );
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if already featured
    const existing = await pool.query(
      "SELECT id FROM featured_products WHERE product_id = $1",
      [product_id],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Product is already featured" });
    }

    const result = await pool.query(
      `INSERT INTO featured_products (product_id, is_active)
       VALUES ($1, $2)
       RETURNING id, product_id, is_active, created_at, updated_at`,
      [product_id, is_active],
    );

    res.status(201).json({
      message: "Product added to featured list",
      featured: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding featured product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Remove a product from featured list (by featured entry ID)
export async function removeFeaturedProduct(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM featured_products WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Featured product entry not found" });
    }

    res.status(200).json({ message: "Product removed from featured list" });
  } catch (error) {
    console.error("Error removing featured product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Toggle is_active status of a featured entry
export async function toggleFeaturedStatus(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active must be a boolean" });
    }

    const result = await pool.query(
      `UPDATE featured_products
       SET is_active = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, product_id, is_active, updated_at`,
      [is_active, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Featured product entry not found" });
    }

    res.status(200).json({
      message: `Featured product ${is_active ? "activated" : "deactivated"}`,
      featured: result.rows[0],
    });
  } catch (error) {
    console.error("Error toggling featured status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
