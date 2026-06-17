import { pool } from '../config/database.js';

// Reusable query to fetch garage with all relations
const GARAGE_SELECT_QUERY = `
    SELECT 
        g.id,
        g.model_year,
        g.created_at,
        g.updated_at,
        json_build_object(
            'id', cb.id,
            'name', cb.name
        ) AS car_brand,
        json_build_object(
            'id', cm.id,
            'name', cm.name
        ) AS car_model,
        json_build_object(
            'id', et.id,
            'name', et.name
        ) AS engine_type,
        json_build_object(
            'id', u.id,
            'email', u.email,
            'phone', u.phone,
            'first_name', u.first_name,
            'last_name', u.last_name
        ) AS user
    FROM garages g
    LEFT JOIN users u ON g.user_id = u.id
    LEFT JOIN car_brands cb ON g.car_brand_id = cb.id
    LEFT JOIN car_models cm ON g.car_model_id = cm.id
    LEFT JOIN engine_types et ON g.engine_type_id = et.id
`;

// Helper function to format garage data
const formatGarage = (row) => ({
    id: row.id,
    car_brand: row.car_brand,
    car_model: row.car_model,
    model_year: row.model_year,
    engine_type: row.engine_type,
    user: row.user
});

// Helper function to fetch garage by ID
const fetchGarageById = async (id) => {
    const query = `${GARAGE_SELECT_QUERY} WHERE g.id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? formatGarage(result.rows[0]) : null;
};

// Helper function to fetch garages with optional where clause
const fetchGarages = async (whereClause = '', params = []) => {
    const query = `${GARAGE_SELECT_QUERY} ${whereClause} ORDER BY g.created_at DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(formatGarage);
};

// Get all garages
export const getAllGarages = async (req, res) => {
    try {
        const garages = await fetchGarages();
        res.status(200).json({
            success: true,
            data: garages
        });
    } catch (error) {
        console.error('Error fetching garages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get garage by ID
export const getGarageById = async (req, res) => {
    const { id } = req.params;

    try {
        const garage = await fetchGarageById(id);
        
        if (!garage) {
            return res.status(404).json({
                success: false,
                message: 'Garage not found'
            });
        }

        res.status(200).json({
            success: true,
            data: garage
        });
    } catch (error) {
        console.error('Error fetching garage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get garages by user ID
export const getGaragesByUserId = async (req, res) => {
    const { userId } = req.params;

    try {
        const garages = await fetchGarages('WHERE g.user_id = $1', [userId]);
        
        res.status(200).json({
            success: true,
            data: garages
        });
    } catch (error) {
        console.error('Error fetching user garages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Create a new garage
export const createGarage = async (req, res) => {
    const { user_id, car_brand_id, car_model_id, engine_type_id, model_year } = req.body;

    // Validate required fields
    if (!user_id || !car_brand_id || !car_model_id || !engine_type_id || !model_year) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields',
            required: ['user_id', 'car_brand_id', 'car_model_id', 'engine_type_id', 'model_year']
        });
    }

    // Validate model_year
    if (model_year < 1900 || model_year > new Date().getFullYear() + 1) {
        return res.status(400).json({
            success: false,
            message: 'Invalid model year'
        });
    }

    try {
        // Insert and fetch in one query using CTE
        const query = `
            WITH inserted AS (
                INSERT INTO garages (user_id, car_brand_id, car_model_id, engine_type_id, model_year)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            )
            ${GARAGE_SELECT_QUERY}
            WHERE g.id IN (SELECT id FROM inserted)
        `;

        const values = [user_id, car_brand_id, car_model_id, engine_type_id, model_year];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Failed to create garage'
            });
        }

        const garage = formatGarage(result.rows[0]);

        // Check if any foreign key is null (referenced record doesn't exist)
        if (!garage.car_brand || !garage.car_model || !garage.engine_type || !garage.user) {
            let missingField = '';
            if (!garage.user) missingField = 'user_id';
            else if (!garage.car_brand) missingField = 'car_brand_id';
            else if (!garage.car_model) missingField = 'car_model_id';
            else if (!garage.engine_type) missingField = 'engine_type_id';
            
            return res.status(404).json({
                success: false,
                message: `Referenced ${missingField} does not exist`
            });
        }

        res.status(201).json({
            success: true,
            message: 'Garage created successfully',
            data: garage
        });
    } catch (error) {
        // Handle PostgreSQL foreign key violation
        if (error.code === '23503') {
            const match = error.detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
            if (match) {
                const field = match[1];
                return res.status(404).json({
                    success: false,
                    message: `Referenced ${field} does not exist`
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Referenced record does not exist'
            });
        }

        // Handle duplicate key violation
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: 'Garage entry already exists for this user and car combination'
            });
        }

        console.error('Error creating garage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Update a garage
export const updateGarage = async (req, res) => {
    const { id } = req.params;
    const { car_brand_id, car_model_id, engine_type_id, model_year } = req.body;

    try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCounter = 1;

        if (car_brand_id !== undefined) {
            updates.push(`car_brand_id = $${paramCounter}`);
            values.push(car_brand_id);
            paramCounter++;
        }

        if (car_model_id !== undefined) {
            updates.push(`car_model_id = $${paramCounter}`);
            values.push(car_model_id);
            paramCounter++;
        }

        if (engine_type_id !== undefined) {
            updates.push(`engine_type_id = $${paramCounter}`);
            values.push(engine_type_id);
            paramCounter++;
        }

        if (model_year !== undefined) {
            if (model_year < 1900 || model_year > new Date().getFullYear() + 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid model year'
                });
            }
            updates.push(`model_year = $${paramCounter}`);
            values.push(model_year);
            paramCounter++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        // Update and fetch in one query using CTE
        values.push(id);
        const query = `
            WITH updated AS (
                UPDATE garages 
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCounter}
                RETURNING id
            )
            ${GARAGE_SELECT_QUERY}
            WHERE g.id IN (SELECT id FROM updated)
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Garage not found'
            });
        }

        const garage = formatGarage(result.rows[0]);

        // Check if any foreign key is null (referenced record doesn't exist)
        if ((car_brand_id && !garage.car_brand) || 
            (car_model_id && !garage.car_model) || 
            (engine_type_id && !garage.engine_type)) {
            let missingField = '';
            if (car_brand_id && !garage.car_brand) missingField = 'car_brand_id';
            else if (car_model_id && !garage.car_model) missingField = 'car_model_id';
            else if (engine_type_id && !garage.engine_type) missingField = 'engine_type_id';
            
            return res.status(404).json({
                success: false,
                message: `Referenced ${missingField} does not exist`
            });
        }

        res.status(200).json({
            success: true,
            message: 'Garage updated successfully',
            data: garage
        });
    } catch (error) {
        // Handle PostgreSQL foreign key violation
        if (error.code === '23503') {
            const match = error.detail.match(/\(([^)]+)\)=\(([^)]+)\)/);
            if (match) {
                const field = match[1];
                return res.status(404).json({
                    success: false,
                    message: `Referenced ${field} does not exist`
                });
            }
            return res.status(404).json({
                success: false,
                message: 'Referenced record does not exist'
            });
        }

        console.error('Error updating garage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete a garage
export const deleteGarage = async (req, res) => {
    const { id } = req.params;

    try {
        const query = 'DELETE FROM garages WHERE id = $1 RETURNING id';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Garage not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Garage deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting garage:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Delete all garages for a user
export const deleteUserGarages = async (req, res) => {
    const { userId } = req.params;

    try {
        const query = 'DELETE FROM garages WHERE user_id = $1 RETURNING id';
        const result = await pool.query(query, [userId]);

        res.status(200).json({
            success: true,
            message: `${result.rowCount} garage(s) deleted for user`,
            count: result.rowCount
        });
    } catch (error) {
        console.error('Error deleting user garages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// Get garages with filters (advanced search)
export const getGaragesWithFilters = async (req, res) => {
    const { brand_id, model_id, engine_type_id, year_from, year_to } = req.query;
    
    try {
        const conditions = [];
        const params = [];
        let paramCounter = 1;

        if (brand_id) {
            conditions.push(`g.car_brand_id = $${paramCounter}`);
            params.push(brand_id);
            paramCounter++;
        }

        if (model_id) {
            conditions.push(`g.car_model_id = $${paramCounter}`);
            params.push(model_id);
            paramCounter++;
        }

        if (engine_type_id) {
            conditions.push(`g.engine_type_id = $${paramCounter}`);
            params.push(engine_type_id);
            paramCounter++;
        }

        if (year_from) {
            conditions.push(`g.model_year >= $${paramCounter}`);
            params.push(year_from);
            paramCounter++;
        }

        if (year_to) {
            conditions.push(`g.model_year <= $${paramCounter}`);
            params.push(year_to);
            paramCounter++;
        }

        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';

        const garages = await fetchGarages(whereClause, params);
        
        res.status(200).json({
            success: true,
            data: garages,
            filters: req.query
        });
    } catch (error) {
        console.error('Error fetching filtered garages:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};