"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function Auth(){

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function signUp(){
    await supabase.auth.signUp({ email, password })
    alert("Conta criada!")
  }

  async function signIn(){
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if(error) alert(error.message)
  }

  return(
    <div className="flex flex-col gap-2 max-w-xs mx-auto mt-20">

      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
        className="bg-black p-2"
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e)=>setPassword(e.target.value)}
        className="bg-black p-2"
      />

      <button onClick={signIn} className="bg-green-600 p-2">
        Login
      </button>

      <button onClick={signUp} className="bg-blue-600 p-2">
        Criar conta
      </button>

    </div>
  )
}