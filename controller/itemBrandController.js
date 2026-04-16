import pool from "../config/db.js";

const addItemBrand = async (req, res) => {
    const { name, description, image_url } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Brand name is required.' });
    }

    try {
        const query = `
            INSERT INTO item_brands (name, description, image_url)
            VALUES ($1, $2, $3)
            RETURNING *;
        `;
        const values = [name.trim(), description || null, image_url || null];
        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Item brand added successfully.',
            brand: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while adding item brand.' });
    }
};

// ------------------- UPDATE -------------------
const updateItemBrand = async (req, res) => {
    const { id } = req.params;
    const { name, description, image_url } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Brand name is required for update.' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid UUID format.' });
    }

    try {
        const query = `
            UPDATE item_brands
            SET name = $1, description = $2, image_url = $3
            WHERE id = $4
            RETURNING *;
        `;
        const values = [name.trim(), description || null, image_url || null, id];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item brand not found.' });
        }

        res.status(200).json({
            message: 'Item brand updated successfully.',
            brand: result.rows[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while updating item brand.' });
    }
};


const deleteItemBrand = async (req, res) => {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid UUID format.' });
    }

    try {
        const query = 'DELETE FROM item_brands WHERE id = $1 RETURNING id;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item brand not found.' });
        }

        res.status(200).json({ message: 'Item brand deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while deleting item brand.' });
    }
};
const getAllItemBrands = async (req, res) => {
    try {
        const query = 'SELECT * FROM item_brands ORDER BY created_at DESC;';
        const result = await pool.query(query);
        res.status(200).json({ brands: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while fetching item brands.' });
    }
};

// ------------------- GET BY ID -------------------
const getItemBrandById = async (req, res) => {
    const { id } = req.params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid UUID format.' });
    }

    try {
        const query = 'SELECT * FROM item_brands WHERE id = $1;';
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Item brand not found.' });
        }

        res.status(200).json({ brand: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error while fetching item brand.' });
    }
};

export { addItemBrand, updateItemBrand, deleteItemBrand,getAllItemBrands, getItemBrandById };