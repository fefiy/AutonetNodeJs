import { sendVerificationEmail } from "./verificationEmail.js";
import { sendWelcomeEmail } from "./welcomeEmail.js";
import { sendPasswordResetEmail } from "./passwordResetEmail.js";
import { sendEmailChangeNotification } from "./emailChangeNotification.js";
import { sendNewLoginNotification } from "./newLoginEmail.js";
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
export {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailChangeNotification,
  sendNewLoginNotification,
  generateVerificationToken,
};
