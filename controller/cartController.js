import pool from "../config/db.js";

export const getCartByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT 
        c.id AS cart_item_id,
        c.product_id,
        c.quantity,
        c.created_at,
        p.name AS product_name,
        p.part_number,
        p.price,
        p.discount,
        p.image_url
      FROM carts c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `;

    const result = await poll.query(query, [userId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    let { userId, productId, quantity = 1 } = req.body;

    // Validate inputs
    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "userId and productId are required",
      });
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive number",
      });
    }

    // Check if product already exists in user's cart
    const findQuery = `
      SELECT id, quantity FROM carts
      WHERE user_id = $1 AND product_id = $2
    `;
    const existing = await poll.query(findQuery, [userId, productId]);

    if (existing.rows.length > 0) {
      // Product exists → increase quantity
      const newQuantity = existing.rows[0].quantity + quantity;
      const updateQuery = `
        UPDATE carts
        SET quantity = $1
        WHERE id = $2
        RETURNING *
      `;
      const updated = await poll.query(updateQuery, [
        newQuantity,
        existing.rows[0].id,
      ]);
      return res.status(200).json({
        success: true,
        message: "Cart updated (quantity increased)",
        data: updated.rows[0],
      });
    } else {
      // New product → insert
      const insertQuery = `
        INSERT INTO carts (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const newItem = await poll.query(insertQuery, [
        userId,
        productId,
        quantity,
      ]);
      return res.status(201).json({
        success: true,
        message: "Product added to cart",
        data: newItem.rows[0],
      });
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    // Handle foreign key violations
    if (error.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "Invalid user_id or product_id",
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const increaseQuantity = async (req, res) => {
  try {
    let { userId, productId, incrementBy = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "userId and productId are required",
      });
    }

    if (typeof incrementBy !== "number" || incrementBy <= 0) {
      return res.status(400).json({
        success: false,
        message: "incrementBy must be a positive number",
      });
    }

    const query = `
      UPDATE carts
      SET quantity = quantity + $1
      WHERE user_id = $2 AND product_id = $3
      RETURNING *
    `;
    const result = await poll.query(query, [incrementBy, userId, productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    res.status(200).json({
      success: true,
      message: `Quantity increased by ${incrementBy}`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error increasing quantity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const decreaseQuantity = async (req, res) => {
  try {
    let { userId, productId, decrementBy = 1 } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "userId and productId are required",
      });
    }

    if (typeof decrementBy !== "number" || decrementBy <= 0) {
      return res.status(400).json({
        success: false,
        message: "decrementBy must be a positive number",
      });
    }

    // First check current quantity
    const findQuery = `
      SELECT id, quantity FROM carts
      WHERE user_id = $1 AND product_id = $2
    `;
    const existing = await poll.query(findQuery, [userId, productId]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    const currentQty = existing.rows[0].quantity;
    const newQty = currentQty - decrementBy;

    if (newQty <= 0) {
      // Remove the item
      const deleteQuery = `
        DELETE FROM carts
        WHERE user_id = $1 AND product_id = $2
        RETURNING id
      `;
      await poll.query(deleteQuery, [userId, productId]);
      return res.status(200).json({
        success: true,
        message: "Product removed from cart (quantity reached zero)",
        data: { productId, removed: true },
      });
    } else {
    
      const updateQuery = `
        UPDATE carts
        SET quantity = $1
        WHERE user_id = $2 AND product_id = $3
        RETURNING *
      `;
      const updated = await poll.query(updateQuery, [
        newQty,
        userId,
        productId,
      ]);
      return res.status(200).json({
        success: true,
        message: `Quantity decreased by ${decrementBy}`,
        data: updated.rows[0],
      });
    }
  } catch (error) {
    console.error("Error decreasing quantity:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return res.status(400).json({
        success: false,
        message: "userId and productId are required",
      });
    }

    const query = `
      DELETE FROM carts
      WHERE user_id = $1 AND product_id = $2
      RETURNING id, product_id
    `;
    const result = await poll.query(query, [userId, productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
