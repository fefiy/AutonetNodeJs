import pool from "../config/db.js";

const carModelExists = async (carModelId) => {
  const result = await pool.query("SELECT id FROM car_model WHERE id = $1", [
    carModelId,
  ]);
  return result.rowCount > 0;
};

const getCarModelYearRange = async (carModelId) => {
  const result = await pool.query(
    "SELECT model_start_year, model_end_year FROM car_model WHERE id = $1",
    [carModelId],
  );
  return result.rowCount ? result.rows[0] : null;
};

const validateYearAgainstCarModel = async (carModelId, year) => {
  const range = await getCarModelYearRange(carModelId);
  if (!range) return false;
  if (range.model_start_year !== null && year < range.model_start_year)
    return false;
  if (range.model_end_year !== null && year > range.model_end_year)
    return false;
  return true;
};

export const addEngineType = async (req, res) => {
  const {
    car_model_id,
    year,
    engine_code,
    engine_cc,
    fuel_type,
    transmission,
    description,
  } = req.body;
  if (!car_model_id || !year) {
    return res
      .status(400)
      .json({ error: "car_model_id and year are required" });
  }
  try {
    if (!(await carModelExists(car_model_id))) {
      return res.status(404).json({ error: "Car model not found" });
    }
    const isValidYear = await validateYearAgainstCarModel(car_model_id, year);
    if (!isValidYear) {
      return res
        .status(400)
        .json({
          error: "Year must be within the car model's production years",
        });
    }
    const query = `
            INSERT INTO engine_type (car_model_id, year, engine_code, engine_cc, fuel_type, transmission, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, car_model_id, year, engine_code, engine_cc, fuel_type, transmission, description
        `;
    const values = [
      car_model_id,
      year,
      engine_code || null,
      engine_cc || null,
      fuel_type || null,
      transmission || null,
      description || null,
    ];
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error adding engine type:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEngineTypes = async (req, res) => {
  const { id, carModelId } = req.query;
  try {
    let query = `
            SELECT et.id, et.car_model_id, et.year, et.engine_code, et.engine_cc,
                   et.fuel_type, et.transmission, et.description,
                   cm.name AS model_name, cb.name AS brand_name
            FROM engine_type et
            JOIN car_model cm ON et.car_model_id = cm.id
            JOIN car_brands cb ON cm.car_brand_id = cb.id
        `;
    const conditions = [];
    const values = [];
    if (id) {
      conditions.push(`et.id = $${values.length + 1}`);
      values.push(id);
    }
    if (carModelId) {
      conditions.push(`et.car_model_id = $${values.length + 1}`);
      values.push(carModelId);
    }
    if (conditions.length) query += " WHERE " + conditions.join(" AND ");
    query += " ORDER BY cm.name, et.year DESC";
    const result = await pool.query(query, values);
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching engine types:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateEngineType = async (req, res) => {
  const { id } = req.params;
  const {
    car_model_id,
    year,
    engine_code,
    engine_cc,
    fuel_type,
    transmission,
    description,
  } = req.body;
  if (!id) return res.status(400).json({ error: "Engine type ID is required" });
  try {
    const existing = await pool.query(
      "SELECT id FROM engine_type WHERE id = $1",
      [id],
    );
    if (existing.rowCount === 0)
      return res.status(404).json({ error: "Engine type not found" });

    // Determine effective car_model_id and year for validation
    let effectiveCarModelId = car_model_id;
    let effectiveYear = year;
    if (!effectiveCarModelId) {
      const orig = await pool.query(
        "SELECT car_model_id FROM engine_type WHERE id = $1",
        [id],
      );
      effectiveCarModelId = orig.rows[0].car_model_id;
    }
    if (!effectiveYear) {
      const orig = await pool.query(
        "SELECT year FROM engine_type WHERE id = $1",
        [id],
      );
      effectiveYear = orig.rows[0].year;
    }
    if (car_model_id && !(await carModelExists(car_model_id))) {
      return res.status(404).json({ error: "Car model not found" });
    }
    const isValidYear = await validateYearAgainstCarModel(
      effectiveCarModelId,
      effectiveYear,
    );
    if (!isValidYear) {
      return res
        .status(400)
        .json({
          error: "Year must be within the car model's production years",
        });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (car_model_id !== undefined) {
      updates.push(`car_model_id = $${paramIndex++}`);
      values.push(car_model_id);
    }
    if (year !== undefined) {
      updates.push(`year = $${paramIndex++}`);
      values.push(year);
    }
    if (engine_code !== undefined) {
      updates.push(`engine_code = $${paramIndex++}`);
      values.push(engine_code);
    }
    if (engine_cc !== undefined) {
      updates.push(`engine_cc = $${paramIndex++}`);
      values.push(engine_cc);
    }
    if (fuel_type !== undefined) {
      updates.push(`fuel_type = $${paramIndex++}`);
      values.push(fuel_type);
    }
    if (transmission !== undefined) {
      updates.push(`transmission = $${paramIndex++}`);
      values.push(transmission);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });
    values.push(id);
    const query = `
            UPDATE engine_type
            SET ${updates.join(", ")}
            WHERE id = $${paramIndex}
            RETURNING id, car_model_id, year, engine_code, engine_cc, fuel_type, transmission, description
        `;
    const result = await pool.query(query, values);
    res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error updating engine type:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteEngineType = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Engine type ID is required" });
  try {
    const result = await pool.query(
      "DELETE FROM engine_type WHERE id = $1 RETURNING id",
      [id],
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Engine type not found" });
    res
      .status(200)
      .json({
        success: true,
        data: { message: "Engine type deleted successfully", id },
      });
  } catch (error) {
    console.error("Error deleting engine type:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
