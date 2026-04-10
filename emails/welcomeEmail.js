// emails/welcomeEmail.js
import transporter from "../config/email.js";
import { baseEmailTemplate } from "./templates/baseTemplate.js";

export const sendWelcomeEmail = async (email, firstName) => {
  const content = `
        <h2>Welcome ${firstName || "User"}! 🎉</h2>
        <p>Your email has been successfully verified. Your account is now active!</p>
        <p>You can now log in and start using all the features of our platform.</p>
        <div style="text-align: center;">
            <a href="${process.env.APP_URL}/login" class="button">Login to Your Account</a>
        </div>
        <h3>What you can do next:</h3>
        <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Connect with other users</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team at 
           <a href="mailto:${process.env.SUPPORT_EMAIL}">${process.env.SUPPORT_EMAIL}</a></p>
    `;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Welcome to Our Platform! 🎉",
    html: baseEmailTemplate(content),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
};
