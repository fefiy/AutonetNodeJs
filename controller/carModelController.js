import pool from "../config/db.js";

const brandExists = async (brandId) => {
  const result = await pool.query("SELECT id FROM car_brands WHERE id = $1", [
    brandId,
  ]);
  return result.rowCount > 0;
};

export const addCarModel = async (req, res) => {
    console.log("add car model")
  const { car_brand_id, name, model_start_year, model_end_year, description } =
    req.body;

  // Basic validation
  if (!car_brand_id || !name) {
    return res
      .status(400)
      .json({ error: "car_brand_id and name are required" });
  }

  try {
    // Verify brand exists
    if (!(await brandExists(car_brand_id))) {
      return res.status(404).json({ error: "Car brand not found" });
    }

    const query = `
            INSERT INTO car_model (car_brand_id, name, model_start_year, model_end_year, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, car_brand_id, name, model_start_year, model_end_year, description
        `;
    const values = [
      car_brand_id,
      name,
      model_start_year || null,
      model_end_year || null,
      description || null,
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding car model:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCarModels = async (req, res) => {
  const { id, brandId, year } = req.query;
  console.log("get car models");
  try {
    let query = `
            SELECT cm.id, cm.name, cm.model_start_year, cm.model_end_year, cm.description,
                   cm.car_brand_id, cb.name AS brand_name
            FROM car_model cm
            JOIN car_brands cb ON cm.car_brand_id = cb.id
        `;
    const conditions = [];
    const values = [];

    if (id) {
      conditions.push(`cm.id = $${values.length + 1}`);
      values.push(id);
    }
    if (brandId) {
      conditions.push(`cm.car_brand_id = $${values.length + 1}`);
      values.push(brandId);
    }
    if (year) {
      conditions.push(
        `$${values.length + 1} BETWEEN cm.model_start_year AND COALESCE(cm.model_end_year, 9999)`,
      );
      values.push(year);
    }

    if (conditions.length) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY cm.name";

    const result = await pool.query(query, values);
    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching car models:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCarModel = async (req, res) => {
  const { id } = req.params;
  const { car_brand_id, name, model_start_year, model_end_year, description } =
    req.body;

  if (!id) {
    return res.status(400).json({ error: "Model ID is required" });
  }

  try {
    // Check if model exists
    const existing = await pool.query(
      "SELECT id FROM car_model WHERE id = $1",
      [id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ error: "Car model not found" });
    }

    // If car_brand_id is being updated, verify the new brand exists
    if (car_brand_id && !(await brandExists(car_brand_id))) {
      return res.status(404).json({ error: "Car brand not found" });
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (car_brand_id !== undefined) {
      updates.push(`car_brand_id = $${paramIndex++}`);
      values.push(car_brand_id);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (model_start_year !== undefined) {
      updates.push(`model_start_year = $${paramIndex++}`);
      values.push(model_start_year);
    }
    if (model_end_year !== undefined) {
      updates.push(`model_end_year = $${paramIndex++}`);
      values.push(model_end_year);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);
    const query = `
            UPDATE car_model
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING id, car_brand_id, name, model_start_year, model_end_year, description
        `;
    const result = await pool.query(query, values);
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating car model:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteCarModel = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Model ID is required" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM car_model WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Car model not found" });
    }
    res.status(200).json({ message: "Car model deleted successfully", id });
  } catch (error) {
    console.error("Error deleting car model:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
