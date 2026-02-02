'use client'

import { useState } from 'react'

type EmailType = 'monthly' | 'daily'

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [emails, setEmails] = useState('')
  const [emailType, setEmailType] = useState<EmailType>('monthly')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return now.getMonth() === 0 ? 12 : now.getMonth()
  })
  const [year, setYear] = useState(() => {
    const now = new Date()
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  })
  const [date, setDate] = useState(() => {
    // Default to yesterday
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0] // YYYY-MM-DD format
  })

  const sendTestEmail = async () => {
    if (!emails.trim()) {
      alert('Please enter at least one email address')
      return
    }

    // Parse emails (comma or newline separated)
    const emailList = emails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(e => e !== '')

    if (emailList.length === 0) {
      alert('Please enter at least one valid email address')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const endpoint = emailType === 'monthly' 
        ? '/api/email/monthly-dashboard'
        : '/api/email/daily-quality-summary'
      
      const body = emailType === 'monthly'
        ? {
            month,
            year,
            recipientEmails: emailList,
          }
        : {
            date, // YYYY-MM-DD format
            recipientEmails: emailList,
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        const successCount = data.results?.filter((r: any) => r.success).length || 0
        const totalCount = emailList.length
        alert(`Email sent successfully to ${successCount} of ${totalCount} recipient(s)! Check inboxes.`)
      } else {
        alert('Error: ' + (data.error || 'Unknown error'))
      }
    } catch (error) {
      setResult({ error: 'Failed to send email', details: error })
      alert('Failed to send email. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--page-bg)' }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--title-text)' }}>
          Test Email Dashboard
        </h1>
        
        <div className="space-y-4 mb-6">
          {/* Email Type Toggle */}
          <div>
            <label className="block mb-2" style={{ color: 'var(--title-text)' }}>
              Email Type:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailType"
                  value="monthly"
                  checked={emailType === 'monthly'}
                  onChange={(e) => setEmailType(e.target.value as EmailType)}
                  className="cursor-pointer"
                />
                <span style={{ color: 'var(--title-text)' }}>Monthly Dashboard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="emailType"
                  value="daily"
                  checked={emailType === 'daily'}
                  onChange={(e) => setEmailType(e.target.value as EmailType)}
                  className="cursor-pointer"
                />
                <span style={{ color: 'var(--title-text)' }}>Daily Quality Summary</span>
              </label>
            </div>
          </div>

          {/* Recipient Emails */}
          <div>
            <label className="block mb-2" style={{ color: 'var(--title-text)' }}>
              Recipient Email Addresses (comma or newline separated):
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com&#10;email3@example.com"
              rows={4}
              className="w-full px-4 py-2 rounded border"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--card-border)',
                color: 'var(--title-text)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>
              You can enter multiple emails separated by commas or new lines
            </p>
          </div>

          {/* Date Selection - Conditional based on email type */}
          {emailType === 'monthly' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2" style={{ color: 'var(--title-text)' }}>
                  Month:
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--title-text)',
                  }}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2" style={{ color: 'var(--title-text)' }}>
                  Year:
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--title-text)',
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block mb-2" style={{ color: 'var(--title-text)' }}>
                Date:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderColor: 'var(--card-border)',
                  color: 'var(--title-text)',
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>
                Select the date for the daily quality summary (defaults to yesterday)
              </p>
            </div>
          )}
        </div>

        <button
          onClick={sendTestEmail}
          disabled={loading}
          className="px-6 py-2 rounded font-medium transition-colors"
          style={{
            backgroundColor: loading ? '#ccc' : '#1D6FE3',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Sending...' : `Send Test ${emailType === 'monthly' ? 'Monthly' : 'Daily'} Email`}
        </button>

        {result && (
          <div className="mt-6 p-4 rounded" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-bold mb-2" style={{ color: 'var(--title-text)' }}>Response:</h3>
            <pre className="text-sm overflow-auto" style={{ color: 'var(--muted-text)' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

