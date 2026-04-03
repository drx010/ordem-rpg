"use client"

export default function DiceLog({ logs }:{ logs:any[] }){

  return(
    <div>

      <h2 className="text-red-500 mb-2">Rolagens</h2>

      {logs.length === 0 && (
        <p className="opacity-50 text-sm">Nenhuma rolagem ainda...</p>
      )}

      <div className="flex flex-col gap-1 text-sm">

        {logs.map((roll, index)=>(
          <div key={index} className="bg-black p-2 rounded border border-red-800">

            <p className="text-red-400">
              🎲 {roll.formula}
            </p>

            <p>
              ({roll.rolls?.join(" + ")}) + {roll.bonus} ={" "}
              <span className="text-green-400 font-bold">
                {roll.total}
              </span>
            </p>

          </div>
        ))}

      </div>

    </div>
  )
}