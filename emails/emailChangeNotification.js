// emails/emailChangeNotification.js
import transporter from "../config/email.js";
import { baseEmailTemplate } from "./templates/baseTemplate.js";

export const sendEmailChangeNotification = async (
  email,
  firstName,
  newEmail,
) => {
  const content = `
        <h2>Hello ${firstName || "User"}!</h2>
        <p>Your email address has been changed.</p>
        <div style="background-color: #f4f4f4; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p><strong>Old Email:</strong> ${email}</p>
            <p><strong>New Email:</strong> ${newEmail}</p>
        </div>
        <p><strong>⚠️ If you did not make this change, please contact support immediately.</strong></p>
        <div style="text-align: center;">
            <a href="${process.env.APP_URL}/support" class="button">Contact Support</a>
        </div>
    `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Security Alert: Email Address Changed",
    html: baseEmailTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email change notification sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email change notification:", error);
    return { success: false, error: error.message };
  }
};
