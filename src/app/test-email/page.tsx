'use client'

import { useState } from 'react'

export default function TestEmailPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [emails, setEmails] = useState('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return now.getMonth() === 0 ? 12 : now.getMonth()
  })
  const [year, setYear] = useState(() => {
    const now = new Date()
    return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
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
      const response = await fetch('/api/email/monthly-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          year,
          recipientEmails: emailList,
        }),
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
          Test Monthly Dashboard Email
        </h1>
        
        <div className="space-y-4 mb-6">
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
          {loading ? 'Sending...' : 'Send Test Email'}
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

