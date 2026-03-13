export default async function handler(req, res) {
  // Allow CORS from your Vercel domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, error: 'phone and otp required' });
  }

  const FAST2SMS_KEY = process.env.FAST2SMS_KEY;
  if (!FAST2SMS_KEY) {
    return res.status(500).json({ success: false, error: 'API key not configured' });
  }

  const message = `Your ZipFix OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`;

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: phone
      })
    });

    const data = await response.json();
    console.log('Fast2SMS response:', data);

    if (data.return === true) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({ success: false, error: data.message || 'SMS failed' });
    }
  } catch (err) {
    console.error('Fast2SMS error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
