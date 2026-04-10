// emails/templates/baseTemplate.js
export const baseEmailTemplate = (content) => {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    margin: 0;
                    padding: 0;
                    background-color: #f4f4f4;
                }
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    padding: 20px 0;
                    border-bottom: 2px solid #f0f0f0;
                }
                .header h1 {
                    color: #4CAF50;
                    margin: 0;
                }
                .content {
                    padding: 30px 20px;
                }
                .button {
                    display: inline-block;
                    padding: 12px 24px;
                    background-color: #4CAF50;
                    color: white;
                    text-decoration: none;
                    border-radius: 4px;
                    margin: 20px 0;
                    text-align: center;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #f0f0f0;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                }
                @media only screen and (max-width: 600px) {
                    .container {
                        width: 100% !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your App Name</h1>
                </div>
                <div class="content">
                    ${content}
                </div>
                <div class="footer">
                    <p>&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
                    <p>If you didn't request this email, please ignore it.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};
