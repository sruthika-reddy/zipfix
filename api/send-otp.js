export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, error: 'phone and otp required' });

  const FAST2SMS_KEY = process.env.FAST2SMS_KEY;
  if (!FAST2SMS_KEY) return res.status(500).json({ success: false, error: 'API key not configured' });

  // Log for Vercel function logs (helps debug)
  console.log('Sending OTP to:', phone, '| OTP:', otp);

  try {
    // Try route v3 first (OTP route — no DLT needed)
    const response = await fetch(
      `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_KEY}&route=otp&variables_values=${otp}&flash=0&numbers=${phone}`,
      { method: 'GET' }
    );

    const data = await response.json();
    console.log('Fast2SMS OTP route response:', JSON.stringify(data));

    if (data.return === true) {
      return res.status(200).json({ success: true });
    }

    // Fallback: try quick SMS route (route q) with plain text
    console.log('OTP route failed, trying quick route...');
    const res2 = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { 'authorization': FAST2SMS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: 'q',
        message: `${otp} is your ZipFix OTP. Valid 5 mins.`,
        language: 'english',
        flash: 0,
        numbers: phone
      })
    });
    const data2 = await res2.json();
    console.log('Fast2SMS quick route response:', JSON.stringify(data2));

    if (data2.return === true) {
      return res.status(200).json({ success: true });
    }

    // Return the actual error message from Fast2SMS so we can debug
    return res.status(200).json({
      success: false,
      error: data2.message || data.message || 'Both routes failed',
      fast2sms_response: data2
    });

  } catch (err) {
    console.error('Fast2SMS error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
