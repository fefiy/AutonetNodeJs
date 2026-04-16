// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config();

export const initializePassport = () => {
  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        const client = await pool.connect();
        
        try {
          const email = profile.emails[0].value;
          const firstName = profile.name.givenName;
          const lastName = profile.name.familyName;
          const googleId = profile.id;
          
          // Check if user exists
          let userResult = await client.query(
            `SELECT id, email, role, email_confirmed, first_name, last_name, provider
             FROM users 
             WHERE email = $1`,
            [email]
          );
          
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            
            // Update google_id if not set
            await client.query(
              `UPDATE users 
               SET provider = 'google', 
                   provider_id = $1,
                   email_confirmed = true 
               WHERE id = $2`,
              [googleId, user.id]
            );
            
            await client.query("COMMIT");
            return done(null, user);
          }
          
          // Create new user
          const insertResult = await client.query(
            `INSERT INTO users (email, first_name, last_name, provider, provider_id, email_confirmed, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, first_name, last_name, role, email_confirmed, provider`,
            [email, firstName, lastName, 'google', googleId, true, 'customer']
          );
          
          await client.query("COMMIT");
          return done(null, insertResult.rows[0]);
          
        } catch (error) {
          await client.query("ROLLBACK");
          console.error("Google strategy error:", error);
          return done(error, null);
        } finally {
          client.release();
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, email, first_name, last_name, role, email_confirmed, provider 
         FROM users WHERE id = $1`,
        [id]
      );
      done(null, result.rows[0]);
    } catch (error) {
      done(error, null);
    } finally {
      client.release();
    }
  });
};

export default passport;