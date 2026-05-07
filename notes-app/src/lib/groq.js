const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

export async function summarizeText(text) {
  if (!GROQ_API_KEY) {
    throw new Error('กรุณาตั้งค่า VITE_GROQ_API_KEY ในไฟล์ .env')
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes notes in Thai. Keep it concise and use bullet points if appropriate.'
        },
        {
          role: 'user',
          content: `ช่วยสรุปเนื้อหาต่อไปนี้ให้หน่อย:\n\n${text}`
        }
      ],
      temperature: 0.5,
      max_tokens: 1024
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'AI เกิดข้อผิดพลาด')
  }

  const data = await response.json()
  return data.choices[0].message.content
}
