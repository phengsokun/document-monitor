// Google Apps Script — deploy as Web App to send email alerts via Gmail
// 1. Go to https://script.google.com
// 2. Create a new project, paste this code
// 3. Deploy > New Deployment > Web App
// 4. Set "Execute as" = Me, "Who has access" = Anyone
// 5. Copy the deployment URL and paste it into the app's Email Settings

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { to, subject, body } = data;

    GmailApp.sendEmail(to, subject, body);

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService
    .createTextOutput('Document Monitor email endpoint is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}
