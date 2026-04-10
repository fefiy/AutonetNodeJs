// emails/passwordResetEmail.js
import transporter from "../config/email.js";
import { baseEmailTemplate } from "./templates/baseTemplate.js";

export const sendPasswordResetEmail = async (email, firstName, resetToken) => {
  const resetUrl = `${process.env.FRONT_END_API_HTTP}/reset-password?token=${resetToken}`;

  const content = `
        <h2>Hello ${firstName || "User"}!</h2>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
        </div>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">
            ${resetUrl}
        </p>
        <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
        <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        <hr />
        <p style="font-size: 14px; color: #666;">
            For security reasons, never share this link with anyone.
        </p>
    `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Password Reset Request",
    html: baseEmailTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};
