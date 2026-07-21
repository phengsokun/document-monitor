import { updateDocument } from './db';

let emailConfig = null;

export function configureEmail(config) {
  emailConfig = config;
}

export function getEmailConfig() {
  return emailConfig;
}

export async function sendOverdueAlert(doc) {
  if (!emailConfig || !emailConfig.enabled) return false;

  const lastNotified = doc.notifiedAt ? new Date(doc.notifiedAt) : null;
  if (lastNotified) {
    const hoursSince = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return false;
  }

  try {
    const response = await fetch(emailConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailConfig.to,
        subject: `ឯកសារផុតកំណត់៖ ${doc.trackingNumber || `DOC-${doc.id}`}`,
        body: `ឯកសារ ${doc.trackingNumber || `DOC-${doc.id}`} ពី ${doc.requestorName} បានផុតកំណត់។\n\nថ្ងៃផុតកំណត់៖ ${doc.dueDate}\nប្រភេទ៖ ${doc.documentType}\nស្រុក៖ ${doc.district || ''}`,
        documentId: doc.id,
      }),
    });

    if (response.ok) {
      await updateDocument(doc.id, { notifiedAt: new Date().toISOString() });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Email alert failed:', err);
    return false;
  }
}

export async function sendOverdueAlerts(overdueDocs) {
  if (!emailConfig || !emailConfig.enabled) return 0;

  let sent = 0;
  for (const doc of overdueDocs) {
    const result = await sendOverdueAlert(doc);
    if (result) sent++;
  }
  return sent;
}
