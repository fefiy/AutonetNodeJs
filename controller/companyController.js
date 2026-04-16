
import pool from "../config/db.js";

const addCompany = async (req, res) => {
    try {
        const {
            name,
            owner,
            location,
            tin_number,
            commission_rate,
            balance,
            created_by
        } = req.body;
        
        // Get created_by from authenticated user (e.g., from JWT or session)
       

        // Validation
        const validationErrors = [];
        
        if (!name || name.trim() === '') {
            validationErrors.push('Company name is required');
        }
      
        if (!created_by) {
            validationErrors.push('User authentication required');
        }
        if (commission_rate && (commission_rate < 0 || commission_rate > 100)) {
            validationErrors.push('Commission rate must be between 0 and 100');
        }
        if (balance && balance < 0) {
            validationErrors.push('Balance cannot be negative');
        }

        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Verify that the user exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [created_by]
        );
        
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check for duplicate TIN
        if (tin_number) {
            const tinCheck = await pool.query(
                'SELECT id FROM company WHERE tin_number = $1',
                [tin_number]
            );
            if (tinCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Company with this TIN number already exists'
                });
            }
        }

        // Insert company with created_by
        const result = await pool.query(
            `INSERT INTO company (
                name, 
                owner, 
                location, 
                tin_number, 
                commission_rate, 
                balance, 
                created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING 
                id, 
                name, 
                owner, 
                location, 
                tin_number, 
                commission_rate, 
                balance, 
                created_by, 
                created_at`,
            [
                name.trim(),
                owner.trim(),
                location ? location.trim() : null,
                tin_number || null,
                commission_rate || 0,
                balance || 0,
                created_by
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Company created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error in addCompany:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create company',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export { addCompany };
