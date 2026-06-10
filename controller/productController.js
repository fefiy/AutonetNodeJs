import pool from "../config/db.js";

const sortableColumns = {
  price: "p.price",
  discount: "p.discount",
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
  partNumber: "p.part_number",
  modelYear: "p.model_year",
};

export const getProducts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(req.query.pageSize) || 20),
    );
    const offset = (page - 1) * pageSize;

    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder =
      (req.query.sortOrder || "").toLowerCase() === "asc" ? "ASC" : "DESC";
    const orderColumn = sortableColumns[sortBy] || "p.created_at";

    const filters = { sql: "", values: [] };
    let valueCounter = 1;

    function addFilter(condition, value) {
      filters.sql += (filters.sql ? " AND " : " WHERE ") + condition;
      filters.values.push(value);
    }

    if (req.query.car_model_id) {
      addFilter(`p.car_model_id = $${valueCounter++}`, req.query.car_model_id);
    }

    if (req.query.category_id) {
      addFilter(`p.category_id = $${valueCounter++}`, req.query.category_id);
    }

    if (req.query.item_brand_id) {
      addFilter(
        `p.items_brand_id = $${valueCounter++}`,
        req.query.item_brand_id,
      );
    }

    if (req.query.item_brand_name) {
      const brandName = `%${req.query.item_brand_name}%`;
      addFilter(`ib.name ILIKE $${valueCounter++}`, brandName);
    }

    // model_year
    if (req.query.model_year) {
      addFilter(`p.model_year = $${valueCounter++}`, req.query.model_year);
    }

    // engine_type_id
    if (req.query.engine_type_id) {
      addFilter(
        `p.engine_type_id = $${valueCounter++}`,
        req.query.engine_type_id,
      );
    }

    // car_brand_id
    if (req.query.car_brand_id) {
      addFilter(`p.car_brand_id = $${valueCounter++}`, req.query.car_brand_id);
    }

    // part_number (partial match)
    if (req.query.part_number) {
      const partNo = `%${req.query.part_number}%`;
      addFilter(`p.part_number ILIKE $${valueCounter++}`, partNo);
    }

    // oem_number (partial match)
    if (req.query.oem_number) {
      const oem = `%${req.query.oem_number}%`;
      addFilter(`p.oem_number ILIKE $${valueCounter++}`, oem);
    }

    // side (exact: 'left', 'right', or 'none')
    if (req.query.side) {
      const side = req.query.side.toLowerCase();
      if (["left", "right", "none"].includes(side)) {
        addFilter(`p.side = $${valueCounter++}`, side);
      } else {
        return res
          .status(400)
          .json({ error: "Invalid side value. Must be left, right, or none" });
      }
    }

    // price range (minPrice, maxPrice)
    if (req.query.minPrice) {
      const min = parseFloat(req.query.minPrice);
      if (!isNaN(min)) {
        addFilter(`p.price >= $${valueCounter++}`, min);
      }
    }
    if (req.query.maxPrice) {
      const max = parseFloat(req.query.maxPrice);
      if (!isNaN(max)) {
        addFilter(`p.price <= $${valueCounter++}`, max);
      }
    }

    // ----- Build main query with joins -----
    const selectQuery = `
      SELECT
        p.id,
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
      FROM products p
      LEFT JOIN car_brands cb ON p.car_brand_id = cb.id
      LEFT JOIN car_model cm ON p.car_model_id = cm.id
      LEFT JOIN engine_type et ON p.engine_type_id = et.id
      LEFT JOIN company c ON p.company_id = c.id
      LEFT JOIN item_brands ib ON p.items_brand_id = ib.id
      LEFT JOIN categories cat ON p.category_id = cat.id
      ${filters.sql}
      ORDER BY ${orderColumn} ${sortOrder}
      LIMIT $${valueCounter++} OFFSET $${valueCounter++}
    `;

    // Count query for total records (with same filters)
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN item_brands ib ON p.items_brand_id = ib.id
      ${filters.sql}
    `;

    const queryValues = [...filters.values, pageSize, offset];
    const countValues = [...filters.values];

    // Execute both queries in parallel
    const [dataResult, countResult] = await Promise.all([
      pool.query(selectQuery, queryValues),
      pool.query(countQuery, countValues),
    ]);

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / pageSize);

    // Map rows to the expected object shape
    const products = dataResult.rows.map((row) => ({
      id: row.id,
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
    }));

    res.status(200).json({
      data: products,
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
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createProduct = async (req, res) => {
  console.log("Adding Product");
  const {
    part_number,
    oem_number,
    description,
    car_brand_id,
    item_brand_id,
    category_id,
    company_id,
    image_url,
    price,
    discount,
    metadata,
    name,
    year,
    engine_type_id,
    car_model_id,
    side,
  } = req.body;

  console.log(req.body);
  // Basic validation
  if (
    !part_number ||
    !oem_number ||
    !price ||
    !car_brand_id ||
    !item_brand_id ||
    !category_id ||
    !company_id
  ) {
    console.log("missing required fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (discount !== undefined && (discount < 0 || discount > 100)) {
    return res
      .status(400)
      .json({ error: "Discount must be between 0 and 100" });
  }

  const client = await pool.connect();
  try {
    const query = `
            INSERT INTO products (
                part_number, oem_number, description, car_brand_id,
                items_brand_id, category_id, company_id, image_url, price, discount, name, model_year, car_model_id, engine_type_id, side, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15. $16)
            RETURNING *
        `;
    const values = [
      part_number,
      oem_number,
      description,
      car_brand_id,
      item_brand_id,
      category_id,
      company_id,
      image_url || [],
      price,
      discount || 0,
      name,
      year,
      car_model_id,
      engine_type_id,
      side,
      metadata || {},
    ];

    const result = await client.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.log("error when creating product", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllProduct = async (req, res) => {
  console.log("getting all products");
  const fetchQuery = "SELECT * FROM product_view";
  try {
    const result = await pool.query(fetchQuery);

    console.log("result", result.rows);
    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message || "Error Occurred when fetching products ",
    });
  }
};
