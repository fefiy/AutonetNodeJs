import pool from "../config/db.js";

const addCategory = async (req, res) => {
    try {
        const { name, slug, description, parent_id, sort_order, metadata } = req.body;
        console.log("add category is called", req.body)
        
        // Validate required fields
        if (!name || !slug) {
            return res.status(400).json({
                success: false,
                message: 'Name and slug are required fields'
            });
        }
        
        // Check if slug already exists
        const slugCheck = await pool.query(
            'SELECT id FROM categories WHERE slug = $1',
            [slug]
        );
        
        if (slugCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Category with this slug already exists'
            });
        }
        
        // If parent_id is provided, check if parent exists
        if (parent_id) {
            const parentCheck = await pool.query(
                'SELECT id FROM categories WHERE id = $1',
                [parent_id]
            );
            
            if (parentCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category does not exist'
                });
            }
        }
        
        // Insert new category
        const result = await pool.query(
            `INSERT INTO categories (name, slug, description, parent_id, sort_order, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, name, slug, description, parent_id, level, path_string, sort_order, is_active, created_at`,
            [name, slug, description, parent_id || null, sort_order || 0, metadata || {}]
        );
        
        res.status(201).json({
            success: true,
            message: 'Category added successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};





const getCategoriesHierarchy = async (req, res) => {
    try {
        const query = `
            WITH RECURSIVE category_tree AS (
                SELECT 
                    id,
                    name,
                    slug,
                    description,
                    parent_id,
                    level,
                    path_string,
                    sort_order,
                    is_active,
                    metadata,
                    created_at,
                    updated_at,
                    0 as depth
                FROM categories
                WHERE parent_id IS NULL AND is_active = true
                
                UNION ALL
                
                SELECT 
                    c.id,
                    c.name,
                    c.slug,
                    c.description,
                    c.parent_id,
                    c.level,
                    c.path_string,
                    c.sort_order,
                    c.is_active,
                    c.metadata,
                    c.created_at,
                    c.updated_at,
                    ct.depth + 1
                FROM categories c
                INNER JOIN category_tree ct ON c.parent_id = ct.id
                WHERE c.is_active = true
            )
            SELECT 
                id,
                name,
                slug,
                description,
                parent_id,
                level,
                sort_order,
                path_string,
                is_active,
                metadata,
                depth
            FROM category_tree
            ORDER BY path_string;
        `;
        
        const result = await pool.query(query);
        
        // Build nested tree structure
        const buildNestedTree = (flatList) => {
            const map = new Map();
            const roots = [];
            
            // Create map of all nodes
            flatList.forEach(node => {
                map.set(node.id, {
                    id: node.id,
                    name: node.name,
                    slug: node.slug,
                    description: node.description,
                    parent_id: node.parent_id,
                    level: node.level,
                    sort_order: node.sort_order,
                    path_string: node.path_string,
                    is_active: node.is_active,
                    metadata: node.metadata,
                    depth: node.depth,
                    children: []
                });
            });
            
            // Build parent-child relationships
            flatList.forEach(node => {
                const currentNode = map.get(node.id);
                
                if (node.parent_id && map.has(node.parent_id)) {
                    // This is a child - add to parent's children array
                    const parent = map.get(node.parent_id);
                    parent.children.push(currentNode);
                } else if (!node.parent_id) {
                    // This is a root node
                    roots.push(currentNode);
                }
            });
            
            // Sort children by sort_order
            const sortChildren = (node) => {
                if (node.children && node.children.length > 0) {
                    node.children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    node.children.forEach(sortChildren);
                }
            };
            
            roots.forEach(sortChildren);
            return roots;
        };
        
        const tree = buildNestedTree(result.rows);
        
        res.status(200).json({
            success: true,
            data: tree,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching categories hierarchy:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching categories',
            error: error.message
        });
    }
};
// ============================================
// Update category
// ============================================
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, parent_id, sort_order, metadata, is_active } = req.body;
        
        // Check if category exists
        const checkExist = await pool.query(
            'SELECT id FROM categories WHERE id = $1',
            [id]
        );
        
        if (checkExist.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Check if slug already exists (if changing slug)
        if (slug) {
            const slugCheck = await pool.query(
                'SELECT id FROM categories WHERE slug = $1 AND id != $2',
                [slug, id]
            );
            
            if (slugCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Category with this slug already exists'
                });
            }
        }
        
        // Check if parent exists (if changing parent)
        if (parent_id) {
            const parentCheck = await pool.query(
                'SELECT id FROM categories WHERE id = $1',
                [parent_id]
            );
            
            if (parentCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category does not exist'
                });
            }
            
            // Prevent circular reference (can't be parent of itself)
            if (parent_id === id) {
                return res.status(400).json({
                    success: false,
                    message: 'Category cannot be parent of itself'
                });
            }
        }
        
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (slug !== undefined) {
            updates.push(`slug = $${paramIndex++}`);
            values.push(slug);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (parent_id !== undefined) {
            updates.push(`parent_id = $${paramIndex++}`);
            values.push(parent_id || null);
        }
        if (sort_order !== undefined) {
            updates.push(`sort_order = $${paramIndex++}`);
            values.push(sort_order);
        }
        if (metadata !== undefined) {
            updates.push(`metadata = $${paramIndex++}`);
            values.push(metadata);
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(is_active);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        
        const query = `
            UPDATE categories 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        
        const result = await pool.query(query, values);
        
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating category',
            error: error.message
        });
    }
};

// ============================================
// Delete category (soft delete)
// ============================================
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if category exists
        const checkExist = await pool.query(
            'SELECT id, is_active FROM categories WHERE id = $1',
            [id]
        );
        
        if (checkExist.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }
        
        // Check if category has active subcategories
        const childrenCheck = await pool.query(
            'SELECT id, name FROM categories WHERE parent_id = $1 AND is_active = true',
            [id]
        );
        
        if (childrenCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete category with active subcategories. Delete or deactivate subcategories first.',
                data: {
                    has_children: true,
                    children_count: childrenCheck.rows.length,
                    children: childrenCheck.rows
                }
            });
        }
        
        // Soft delete
        const result = await pool.query(
            `UPDATE categories 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING id, name, is_active`,
            [id]
        );
        
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting category',
            error: error.message
        });
    }
};


export { addCategory, getCategoriesHierarchy, updateCategory, deleteCategory};