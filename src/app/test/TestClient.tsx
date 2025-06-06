'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TestClient() {
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('clientes').select('*')
      if (error) {
        setError(error.message)
      } else {
        setUsers(data || [])
      }
    }

    fetchUsers()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Prueba de conexión con Supabase</h1>
      {error ? (
        <p className="text-red-500">Error: {error}</p>
      ) : (
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(users, null, 2)}</pre>
      )}
    </div>
  )
} 