"use client"

import { useState } from "react"

export default function DiceRoller({ onRoll }:{ onRoll:(roll:any)=>void }){

  const [sides, setSides] = useState(20)
  const [quantity, setQuantity] = useState(1)
  const [bonus, setBonus] = useState(0)

  function rollDice(){

    let rolls:number[] = []

    for(let i=0;i<quantity;i++){
      rolls.push(Math.floor(Math.random()*sides)+1)
    }

    const sum = rolls.reduce((a,b)=>a+b,0)
    const total = sum + bonus

    const rollData = {
      formula: `${quantity}d${sides}+${bonus}`,
      rolls,
      bonus,
      total
    }

    onRoll(rollData)
  }

  return(
    <div className="bg-zinc-900 p-4 rounded border border-sky-900 mt-4">

      <h2 className="mb-2 text-lg text-sky-500">🎲 Dados</h2>

      <div className="flex gap-2 mb-2">
        <input type="number" value={quantity} onChange={(e)=>setQuantity(Number(e.target.value))}/>
        <span>d</span>
        <input type="number" value={sides} onChange={(e)=>setSides(Number(e.target.value))}/>
        <span>+</span>
        <input type="number" value={bonus} onChange={(e)=>setBonus(Number(e.target.value))}/>
      </div>

      <button onClick={rollDice} className="bg-sky-600 px-3 py-1">
        Rolar
      </button>

    </div>
  )
}