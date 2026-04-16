// emails/verificationEmail.js
import transporter from "../config/email.js";
import { baseEmailTemplate } from "./templates/baseTemplate.js";

export const sendVerificationEmail = async (
  email,
  firstName,
  userId,
  verificationToken,
) => {
  // Include both user ID and token in the verification URL
  const verificationUrl = `${process.env.APP_URL}/verify-email?userId=${userId}&token=${verificationToken}`;

  const content = `
        <h2>Welcome ${firstName || "User"}!</h2>
        <p>Thank you for registering with our platform. Please verify your email address to activate your account.</p>
        <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
        </div>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; background-color: #f4f4f4; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
        </p>
        <p><strong>⚠️ This link will expire in 24 hours.</strong></p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
    `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Verify Your Email Address",
    html: baseEmailTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};
