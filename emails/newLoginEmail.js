// emails/newLoginEmail.js
import transporter from "../config/email.js";
import { baseEmailTemplate } from "./templates/baseTemplate.js";

export const sendNewLoginNotification = async (email, firstName, loginInfo) => {
  const content = `
        <h2>Hello ${firstName || "User"}!</h2>
        <p>We detected a new login to your account.</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p><strong>📍 Location:</strong> ${loginInfo.location || "Unknown"}</p>
            <p><strong>💻 Device:</strong> ${loginInfo.user_agent || "Unknown"}</p>
            <p><strong>🌐 IP Address:</strong> ${loginInfo.ip || "Unknown"}</p>
            <p><strong>🕐 Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If this was you, you can safely ignore this email.</p>
        <p><strong>⚠️ If this wasn't you, please secure your account immediately:</strong></p>
        <div style="text-align: center;">
            <a href="${process.env.APP_URL}/change-password" class="button">Change Password</a>
        </div>
    `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Security Alert: New Login Detected",
    html: baseEmailTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("New login notification sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending new login notification:", error);
    return { success: false, error: error.message };
  }
};
